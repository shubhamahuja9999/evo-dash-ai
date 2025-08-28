import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

class AutomationScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.initializeScheduledTasks();
  }

  private initializeScheduledTasks() {
    // Schedule daily optimization at 6 AM UTC
    this.tasks.set('daily-optimization', cron.schedule('0 6 * * *', async () => {
      console.log('🔄 Running daily optimization...');
      await this.runDailyOptimization();
    }));

    // Schedule hourly billing checks from 8 AM to 8 PM UTC
    this.tasks.set('billing-check', cron.schedule('0 8-20 * * *', async () => {
      console.log('💳 Running billing check...');
      await this.checkBilling();
    }));

    // Schedule spend monitoring every 15 minutes
    this.tasks.set('spend-monitor', cron.schedule('*/15 * * * *', async () => {
      console.log('📊 Monitoring spend...');
      await this.monitorSpend();
    }));

    // Schedule weekly reports on Monday at 9 AM UTC
    this.tasks.set('weekly-report', cron.schedule('0 9 * * 1', async () => {
      console.log('📈 Generating weekly report...');
      await this.generateWeeklyReport();
    }));
  }

  async getAccountAutomationSummary(accountId: string): Promise<any> {
    try {
      // Get automation tasks from database
      const tasks = await prisma.automationTask.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          executions: {
            orderBy: {
              startedAt: 'desc'
            },
            take: 5
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get the last optimization execution
      const lastOptimization = await prisma.automationExecution.findFirst({
        where: {
          task: {
            type: 'OPTIMIZATION'
          }
        },
        orderBy: {
          startedAt: 'desc'
        }
      });

      // Get active rules
      const activeRules = await prisma.budgetRule.count({
        where: {
          status: 'ACTIVE'
        }
      });

      return {
        tasksScheduled: tasks.length,
        lastOptimization: lastOptimization?.startedAt || new Date(Date.now() - 24 * 60 * 60 * 1000),
        nextOptimization: this.getNextOptimizationTime(),
        activeRules,
        recentExecutions: tasks.flatMap(task => task.executions)
          .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
          .slice(0, 5)
      };
    } catch (error) {
      console.error('Error getting automation summary:', error);
      throw error;
    }
  }

  private getNextOptimizationTime(): Date {
    const now = new Date();
    const next6AM = new Date(now);
    next6AM.setUTCHours(6, 0, 0, 0);
    if (next6AM <= now) {
      next6AM.setDate(next6AM.getDate() + 1);
    }
    return next6AM;
  }

  async createAutomationTask(userId: string, taskConfig: any): Promise<any> {
    try {
      const task = await prisma.automationTask.create({
        data: {
          userId,
          ...taskConfig,
          status: 'ACTIVE'
        }
      });

      // Schedule the task if it's recurring
      if (taskConfig.schedule) {
        this.tasks.set(task.id, cron.schedule(taskConfig.schedule, async () => {
          await this.executeTask(task.id);
        }));
      }

      return task;
    } catch (error) {
      console.error('Error creating automation task:', error);
      throw error;
    }
  }

  async pauseAutomationTask(taskId: string): Promise<void> {
    try {
      // Update task status in database
      await prisma.automationTask.update({
        where: { id: taskId },
        data: { status: 'PAUSED' }
      });

      // Stop the cron job
      const task = this.tasks.get(taskId);
      if (task) {
        task.stop();
      }
    } catch (error) {
      console.error('Error pausing automation task:', error);
      throw error;
    }
  }

  async resumeAutomationTask(taskId: string): Promise<void> {
    try {
      const task = await prisma.automationTask.update({
        where: { id: taskId },
        data: { status: 'ACTIVE' }
      });

      // Restart the cron job if it's a scheduled task
      if (task.schedule) {
        this.tasks.set(taskId, cron.schedule(task.schedule, async () => {
          await this.executeTask(taskId);
        }));
      }
    } catch (error) {
      console.error('Error resuming automation task:', error);
      throw error;
    }
  }

  private async executeTask(taskId: string): Promise<void> {
    try {
      const execution = await prisma.automationExecution.create({
        data: {
          taskId,
          status: 'RUNNING',
          startedAt: new Date()
        }
      });

      try {
        const task = await prisma.automationTask.findUnique({
          where: { id: taskId }
        });

        if (!task) throw new Error('Task not found');

        // Execute task based on type
        let result;
        switch (task.type) {
          case 'OPTIMIZATION':
            result = await this.runDailyOptimization();
            break;
          case 'BILLING_CHECK':
            result = await this.checkBilling();
            break;
          case 'SPEND_MONITOR':
            result = await this.monitorSpend();
            break;
          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }

        // Update execution with success
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: 'COMPLETED',
            endedAt: new Date(),
            result
          }
        });
      } catch (error) {
        // Update execution with failure
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            endedAt: new Date(),
            error: error.message
          }
        });
        throw error;
      }
    } catch (error) {
      console.error('Error executing task:', error);
      throw error;
    }
  }

  private async runDailyOptimization(): Promise<any> {
    try {
      // Get campaigns that need optimization
      const campaigns = await prisma.campaign.findMany({
        include: {
          analytics: {
            orderBy: {
              date: 'desc'
            },
            take: 30
          }
        }
      });

      const optimizations = [];

      for (const campaign of campaigns) {
        // Check if campaign is overspending
        const recentSpend = campaign.analytics.reduce((sum, a) => sum + a.cost, 0);
        if (campaign.budget && recentSpend > campaign.budget) {
          optimizations.push({
            type: 'BUDGET_ADJUSTMENT',
            campaign: campaign.name,
            action: 'Reduced daily budget to prevent overspend'
          });
        }

        // Check performance metrics
        const avgCTR = campaign.analytics.reduce((sum, a) => sum + (a.ctr || 0), 0) / campaign.analytics.length;
        if (avgCTR < 0.01) {
          optimizations.push({
            type: 'PERFORMANCE_IMPROVEMENT',
            campaign: campaign.name,
            action: 'Flagged for low CTR optimization'
          });
        }
      }

      return { optimizations };
    } catch (error) {
      console.error('Error running daily optimization:', error);
      throw error;
    }
  }

  private async checkBilling(): Promise<any> {
    try {
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          analytics: {
            where: {
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30))
              }
            }
          }
        }
      });

      const alerts = [];
      for (const campaign of campaigns) {
        const monthlySpend = campaign.analytics.reduce((sum, a) => sum + a.cost, 0);
        if (campaign.budget && monthlySpend > campaign.budget) {
          alerts.push({
            campaignId: campaign.id,
            type: 'OVERSPEND',
            message: `Campaign ${campaign.name} has exceeded monthly budget`
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error checking billing:', error);
      throw error;
    }
  }

  private async monitorSpend(): Promise<any> {
    try {
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          analytics: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          }
        }
      });

      const alerts = [];
      for (const campaign of campaigns) {
        const dailySpend = campaign.analytics.reduce((sum, a) => sum + a.cost, 0);
        if (campaign.budget) {
          const dailyBudget = campaign.budget / 30; // Approximate daily budget
          if (dailySpend > dailyBudget * 1.2) { // 20% over budget
            alerts.push({
              campaignId: campaign.id,
              type: 'HIGH_SPEND',
              message: `Campaign ${campaign.name} is spending faster than daily budget`
            });
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error monitoring spend:', error);
      throw error;
    }
  }

  private async generateWeeklyReport(): Promise<any> {
    try {
      const startDate = new Date(new Date().setDate(new Date().getDate() - 7));
      
      const campaigns = await prisma.campaign.findMany({
        include: {
          analytics: {
            where: {
              date: {
                gte: startDate
              }
            }
          }
        }
      });

      const report = {
        period: {
          start: startDate,
          end: new Date()
        },
        campaigns: campaigns.map(campaign => ({
          name: campaign.name,
          spend: campaign.analytics.reduce((sum, a) => sum + a.cost, 0),
          impressions: campaign.analytics.reduce((sum, a) => sum + a.impressions, 0),
          clicks: campaign.analytics.reduce((sum, a) => sum + a.clicks, 0),
          conversions: campaign.analytics.reduce((sum, a) => sum + a.conversions, 0)
        }))
      };

      return report;
    } catch (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }
  }

  getStatus(): any {
    return {
      isRunning: true,
      activeTasks: this.tasks.size,
      lastCheck: new Date(),
      health: 'good'
    };
  }
}

export default AutomationScheduler;