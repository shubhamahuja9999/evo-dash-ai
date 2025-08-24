import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { generateAIResponse } from './openai';
import { exec } from 'child_process';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// CUA Command endpoint
app.post('/api/cua/command', async (req, res) => {
  try {
    const { command, description } = req.body;
    console.log('Received CUA command:', { command, description });
    
    const commandId = 'cmd-' + Date.now();
    const timestamp = new Date();
    
    // Check if the command requires CUA
    const needsCUA = command.toLowerCase().includes('campaign') || 
                    command.toLowerCase().includes('google ads') ||
                    command.toLowerCase().includes('performance') ||
                    command.toLowerCase().includes('metrics') ||
                    command.toLowerCase().includes('audit');
    
    // Execute Python automation if needed
    if (needsCUA) {
      console.log('Executing Python CUA automation');
      return await executePythonAutomation(command, description, commandId, timestamp, res);
    } else {
      // Otherwise, just use AI to answer
      console.log('Using AI to answer without CUA automation');
      
      const aiResponse = await generateAIResponse(
        `${command}${description ? '\n\n' + description : ''}`,
        {}
      );
      
      return res.json({
        id: commandId,
        status: 'COMPLETED',
        result: {
          type: 'ai_response',
          command: command,
          message: aiResponse,
          timestamp: timestamp.toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error executing CUA command:', error);
    res.status(500).json({ error: 'Failed to execute CUA command', details: error.message });
  }
});

// Helper function to execute Python automation
async function executePythonAutomation(
  command: string, 
  description: string | undefined, 
  commandId: string, 
  timestamp: Date,
  res: any
) {
  try {
    // Escape command and description for shell safety
    const escapedCommand = command.replace(/"/g, '\\"');
    const escapedDescription = description ? description.replace(/"/g, '\\"') : '';
    
        // Create a promise to handle the async execution
        const pythonResult = await new Promise((resolve, reject) => {
      const pythonCmd = `python3 cua_automation.py "${escapedCommand}" "${escapedDescription}"`;
      exec(pythonCmd, (error, stdout, stderr) => {
            if (error) {
              console.error(`Python execution error: ${error}`);
              return reject(error);
            }
            if (stderr) {
              console.error(`Python stderr: ${stderr}`);
            }
            console.log(`Python stdout: ${stdout}`);
            resolve({ stdout, stderr });
          });
        });
        
        return res.json({
          id: commandId,
          status: 'COMPLETED',
          result: {
            type: 'python_automation',
            command: command,
            pythonOutput: pythonResult,
            message: 'CUA automation executed successfully',
            timestamp: timestamp.toISOString()
          }
        });
  } catch (pythonError: any) {
        console.error('Python execution failed:', pythonError);
        return res.json({
          id: commandId,
          status: 'FAILED',
          error: `Python automation failed: ${pythonError.message}`,
          timestamp: timestamp.toISOString()
        });
      }
    }

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});