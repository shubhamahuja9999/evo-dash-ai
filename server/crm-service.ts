import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { mlService } from './ml-service.js';

const prisma = new PrismaClient();

export interface CRMContact {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  leadScore?: number;
  leadSource?: string;
  customFields?: { [key: string]: any };
}

export interface CRMDeal {
  id: string;
  contactId: string;
  amount: number;
  stage: string;
  probability: number;
  closeDate?: Date;
  source?: string;
}

export interface CRMSyncResult {
  syncedContacts: number;
  syncedDeals: number;
  errors: string[];
  lastSyncTime: Date;
}

export class CRMService {
  constructor() {}

  /**
   * Sync all active CRM integrations
   */
  async syncAllIntegrations(): Promise<CRMSyncResult[]> {
    const integrations = await prisma.cRMIntegration.findMany({
      where: { isActive: true }
    });

    const results: CRMSyncResult[] = [];

    for (const integration of integrations) {
      try {
        const result = await this.syncIntegration(integration.id);
        results.push(result);
      } catch (error) {
        console.error(`Error syncing CRM integration ${integration.id}:`, error);
        results.push({
          syncedContacts: 0,
          syncedDeals: 0,
          errors: [error.message],
          lastSyncTime: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Sync a specific CRM integration
   */
  async syncIntegration(integrationId: string): Promise<CRMSyncResult> {
    const integration = await prisma.cRMIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      throw new Error(`CRM integration not found: ${integrationId}`);
    }

    console.log(`🔄 Syncing ${integration.type} integration: ${integration.name}`);

    let syncResult: CRMSyncResult;

    switch (integration.type) {
      case 'SALESFORCE':
        syncResult = await this.syncSalesforce(integration);
        break;
      case 'HUBSPOT':
        syncResult = await this.syncHubSpot(integration);
        break;
      case 'PIPEDRIVE':
        syncResult = await this.syncPipedrive(integration);
        break;
      case 'ZOHO':
        syncResult = await this.syncZoho(integration);
        break;
      default:
        throw new Error(`Unsupported CRM type: ${integration.type}`);
    }

    // Update last sync time
    await prisma.cRMIntegration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() }
    });

    console.log(`✅ Sync completed: ${syncResult.syncedContacts} contacts, ${syncResult.syncedDeals} deals`);

    return syncResult;
  }

  /**
   * Sync Salesforce CRM
   */
  private async syncSalesforce(integration: any): Promise<CRMSyncResult> {
    try {
      const accessToken = await this.refreshSalesforceToken(integration);
      
      // Fetch contacts (leads and contacts)
      const contacts = await this.fetchSalesforceContacts(integration.instanceUrl, accessToken);
      const deals = await this.fetchSalesforceDeals(integration.instanceUrl, accessToken);

      let syncedContacts = 0;
      let syncedDeals = 0;
      const errors: string[] = [];

      // Sync contacts
      for (const contact of contacts) {
        try {
          await this.upsertLead(contact, integration.id);
          syncedContacts++;
        } catch (error) {
          errors.push(`Contact ${contact.id}: ${error.message}`);
        }
      }

      // Sync deals
      for (const deal of deals) {
        try {
          await this.updateLeadFromDeal(deal, integration.id);
          syncedDeals++;
        } catch (error) {
          errors.push(`Deal ${deal.id}: ${error.message}`);
        }
      }

      return {
        syncedContacts,
        syncedDeals,
        errors,
        lastSyncTime: new Date()
      };

    } catch (error) {
      throw new Error(`Salesforce sync failed: ${error.message}`);
    }
  }

  /**
   * Sync HubSpot CRM
   */
  private async syncHubSpot(integration: any): Promise<CRMSyncResult> {
    try {
      const accessToken = integration.accessToken;
      
      const contacts = await this.fetchHubSpotContacts(accessToken);
      const deals = await this.fetchHubSpotDeals(accessToken);

      let syncedContacts = 0;
      let syncedDeals = 0;
      const errors: string[] = [];

      // Sync contacts
      for (const contact of contacts) {
        try {
          await this.upsertLead(contact, integration.id);
          syncedContacts++;
        } catch (error) {
          errors.push(`Contact ${contact.id}: ${error.message}`);
        }
      }

      // Sync deals
      for (const deal of deals) {
        try {
          await this.updateLeadFromDeal(deal, integration.id);
          syncedDeals++;
        } catch (error) {
          errors.push(`Deal ${deal.id}: ${error.message}`);
        }
      }

      return {
        syncedContacts,
        syncedDeals,
        errors,
        lastSyncTime: new Date()
      };

    } catch (error) {
      throw new Error(`HubSpot sync failed: ${error.message}`);
    }
  }

  /**
   * Sync Pipedrive CRM
   */
  private async syncPipedrive(integration: any): Promise<CRMSyncResult> {
    try {
      const apiKey = integration.apiKey;
      
      const contacts = await this.fetchPipedriveContacts(apiKey);
      const deals = await this.fetchPipedriveDeals(apiKey);

      let syncedContacts = 0;
      let syncedDeals = 0;
      const errors: string[] = [];

      // Sync contacts
      for (const contact of contacts) {
        try {
          await this.upsertLead(contact, integration.id);
          syncedContacts++;
        } catch (error) {
          errors.push(`Contact ${contact.id}: ${error.message}`);
        }
      }

      // Sync deals
      for (const deal of deals) {
        try {
          await this.updateLeadFromDeal(deal, integration.id);
          syncedDeals++;
        } catch (error) {
          errors.push(`Deal ${deal.id}: ${error.message}`);
        }
      }

      return {
        syncedContacts,
        syncedDeals,
        errors,
        lastSyncTime: new Date()
      };

    } catch (error) {
      throw new Error(`Pipedrive sync failed: ${error.message}`);
    }
  }

  /**
   * Sync Zoho CRM
   */
  private async syncZoho(integration: any): Promise<CRMSyncResult> {
    try {
      const accessToken = await this.refreshZohoToken(integration);
      
      const contacts = await this.fetchZohoContacts(accessToken);
      const deals = await this.fetchZohoDeals(accessToken);

      let syncedContacts = 0;
      let syncedDeals = 0;
      const errors: string[] = [];

      // Sync contacts
      for (const contact of contacts) {
        try {
          await this.upsertLead(contact, integration.id);
          syncedContacts++;
        } catch (error) {
          errors.push(`Contact ${contact.id}: ${error.message}`);
        }
      }

      // Sync deals
      for (const deal of deals) {
        try {
          await this.updateLeadFromDeal(deal, integration.id);
          syncedDeals++;
        } catch (error) {
          errors.push(`Deal ${deal.id}: ${error.message}`);
        }
      }

      return {
        syncedContacts,
        syncedDeals,
        errors,
        lastSyncTime: new Date()
      };

    } catch (error) {
      throw new Error(`Zoho sync failed: ${error.message}`);
    }
  }

  /**
   * Upsert lead from CRM contact
   */
  private async upsertLead(contact: CRMContact, crmIntegrationId: string): Promise<void> {
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { crmLeadId: contact.id },
          { email: contact.email }
        ]
      }
    });

    const leadData = {
      crmLeadId: contact.id,
      email: contact.email,
      phone: contact.phone,
      firstName: contact.firstName,
      lastName: contact.lastName,
      company: contact.company,
      jobTitle: contact.jobTitle,
      leadScore: contact.leadScore,
      leadSource: contact.leadSource,
      crmIntegrationId,
      updatedAt: new Date()
    };

    if (existingLead) {
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: leadData
      });

      // Generate ML quality score for updated lead
      await this.generateLeadQualityScore(existingLead.id);
    } else {
      const newLead = await prisma.lead.create({
        data: {
          ...leadData,
          leadStage: 'NEW',
          createdAt: new Date()
        }
      });

      // Generate ML quality score for new lead
      await this.generateLeadQualityScore(newLead.id);
    }
  }

  /**
   * Update lead from CRM deal information
   */
  private async updateLeadFromDeal(deal: CRMDeal, crmIntegrationId: string): Promise<void> {
    const lead = await prisma.lead.findFirst({
      where: {
        crmLeadId: deal.contactId,
        crmIntegrationId
      }
    });

    if (!lead) {
      console.warn(`Lead not found for deal contact ID: ${deal.contactId}`);
      return;
    }

    // Update lead based on deal information
    const updateData: any = {
      conversionValue: deal.amount,
      updatedAt: new Date()
    };

    // Map deal stage to lead stage
    if (deal.stage === 'Closed Won' || deal.probability >= 100) {
      updateData.leadStage = 'CUSTOMER';
      updateData.convertedAt = new Date();
      updateData.isQualified = true;
    } else if (deal.stage === 'Closed Lost' || deal.probability === 0) {
      updateData.leadStage = 'LOST';
    } else if (deal.probability >= 50) {
      updateData.leadStage = 'OPPORTUNITY';
      updateData.qualifiedAt = new Date();
      updateData.isQualified = true;
    } else if (deal.probability > 0) {
      updateData.leadStage = 'QUALIFIED';
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: updateData
    });

    // Create lead activity for deal update
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: 'DEAL_CLOSED',
        description: `Deal updated: ${deal.stage} - $${deal.amount}`,
        metadata: { dealId: deal.id, stage: deal.stage, amount: deal.amount },
        timestamp: new Date()
      }
    });

    // Regenerate quality score with updated information
    await this.generateLeadQualityScore(lead.id);
  }

  /**
   * Generate ML quality score for a lead
   */
  private async generateLeadQualityScore(leadId: string): Promise<void> {
    try {
      const features = await this.extractLeadFeatures(leadId);
      const prediction = await mlService.predictLeadQuality(leadId, features);

      // Update lead with quality score
      await prisma.lead.update({
        where: { id: leadId },
        data: { qualityScore: prediction.prediction }
      });

    } catch (error) {
      console.error(`Error generating quality score for lead ${leadId}:`, error);
    }
  }

  /**
   * Extract features for ML quality scoring
   */
  private async extractLeadFeatures(leadId: string): Promise<any> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        campaign: true,
        leadActivities: true
      }
    });

    if (!lead) return {};

    return {
      lead_source_score: lead.leadSource ? 0.8 : 0.3,
      company_size_score: lead.company ? 0.7 : 0.3,
      job_title_score: lead.jobTitle ? 0.6 : 0.3,
      campaign_performance: lead.campaign ? 0.7 : 0.5,
      time_to_conversion: this.calculateTimeToConversion(lead.leadActivities),
      page_views: lead.leadActivities.filter(a => a.activityType === 'WEBSITE_VISIT').length
    };
  }

  private calculateTimeToConversion(activities: any[]): number {
    if (activities.length < 2) return 0;
    
    const firstActivity = activities[0];
    const lastActivity = activities[activities.length - 1];
    
    return (lastActivity.timestamp.getTime() - firstActivity.timestamp.getTime()) / (1000 * 60 * 60); // hours
  }

  // CRM-specific API methods

  private async refreshSalesforceToken(integration: any): Promise<string> {
    try {
      const response = await axios.post(`${integration.instanceUrl}/services/oauth2/token`, {
        grant_type: 'refresh_token',
        refresh_token: integration.refreshToken,
        client_id: integration.apiKey,
        client_secret: integration.apiSecret
      });

      const newAccessToken = response.data.access_token;
      
      // Update stored token
      await prisma.cRMIntegration.update({
        where: { id: integration.id },
        data: { accessToken: newAccessToken }
      });

      return newAccessToken;
    } catch (error) {
      throw new Error(`Failed to refresh Salesforce token: ${error.message}`);
    }
  }

  private async fetchSalesforceContacts(instanceUrl: string, accessToken: string): Promise<CRMContact[]> {
    try {
      const query = `SELECT Id, Email, Phone, FirstName, LastName, Company, Title, LeadSource FROM Lead WHERE ConvertedDate = null`;
      const response = await axios.get(`${instanceUrl}/services/data/v58.0/query`, {
        params: { q: query },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      return response.data.records.map((record: any) => ({
        id: record.Id,
        email: record.Email,
        phone: record.Phone,
        firstName: record.FirstName,
        lastName: record.LastName,
        company: record.Company,
        jobTitle: record.Title,
        leadSource: record.LeadSource
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Salesforce contacts: ${error.message}`);
    }
  }

  private async fetchSalesforceDeals(instanceUrl: string, accessToken: string): Promise<CRMDeal[]> {
    try {
      const query = `SELECT Id, ContactId, Amount, StageName, Probability, CloseDate FROM Opportunity`;
      const response = await axios.get(`${instanceUrl}/services/data/v58.0/query`, {
        params: { q: query },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      return response.data.records.map((record: any) => ({
        id: record.Id,
        contactId: record.ContactId,
        amount: record.Amount || 0,
        stage: record.StageName,
        probability: record.Probability || 0,
        closeDate: record.CloseDate ? new Date(record.CloseDate) : undefined
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Salesforce deals: ${error.message}`);
    }
  }

  private async fetchHubSpotContacts(accessToken: string): Promise<CRMContact[]> {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          properties: 'email,phone,firstname,lastname,company,jobtitle,hs_lead_status,lifecyclestage'
        }
      });

      return response.data.results.map((record: any) => ({
        id: record.id,
        email: record.properties.email,
        phone: record.properties.phone,
        firstName: record.properties.firstname,
        lastName: record.properties.lastname,
        company: record.properties.company,
        jobTitle: record.properties.jobtitle,
        leadSource: record.properties.hs_lead_status
      }));
    } catch (error) {
      throw new Error(`Failed to fetch HubSpot contacts: ${error.message}`);
    }
  }

  private async fetchHubSpotDeals(accessToken: string): Promise<CRMDeal[]> {
    try {
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          properties: 'dealname,amount,dealstage,hs_deal_stage_probability,closedate'
        }
      });

      return response.data.results.map((record: any) => ({
        id: record.id,
        contactId: record.associations?.contacts?.results?.[0]?.id || '',
        amount: parseFloat(record.properties.amount) || 0,
        stage: record.properties.dealstage,
        probability: parseFloat(record.properties.hs_deal_stage_probability) || 0,
        closeDate: record.properties.closedate ? new Date(record.properties.closedate) : undefined
      }));
    } catch (error) {
      throw new Error(`Failed to fetch HubSpot deals: ${error.message}`);
    }
  }

  private async fetchPipedriveContacts(apiKey: string): Promise<CRMContact[]> {
    try {
      const response = await axios.get('https://api.pipedrive.com/v1/persons', {
        params: { api_token: apiKey }
      });

      return response.data.data.map((record: any) => ({
        id: record.id.toString(),
        email: record.email?.[0]?.value,
        phone: record.phone?.[0]?.value,
        firstName: record.first_name,
        lastName: record.last_name,
        company: record.org_name,
        jobTitle: record.job_title
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Pipedrive contacts: ${error.message}`);
    }
  }

  private async fetchPipedriveDeals(apiKey: string): Promise<CRMDeal[]> {
    try {
      const response = await axios.get('https://api.pipedrive.com/v1/deals', {
        params: { api_token: apiKey }
      });

      return response.data.data.map((record: any) => ({
        id: record.id.toString(),
        contactId: record.person_id?.toString() || '',
        amount: parseFloat(record.value) || 0,
        stage: record.stage_name,
        probability: parseFloat(record.probability) || 0,
        closeDate: record.expected_close_date ? new Date(record.expected_close_date) : undefined
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Pipedrive deals: ${error.message}`);
    }
  }

  private async refreshZohoToken(integration: any): Promise<string> {
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', {
        refresh_token: integration.refreshToken,
        client_id: integration.apiKey,
        client_secret: integration.apiSecret,
        grant_type: 'refresh_token'
      });

      const newAccessToken = response.data.access_token;
      
      await prisma.cRMIntegration.update({
        where: { id: integration.id },
        data: { accessToken: newAccessToken }
      });

      return newAccessToken;
    } catch (error) {
      throw new Error(`Failed to refresh Zoho token: ${error.message}`);
    }
  }

  private async fetchZohoContacts(accessToken: string): Promise<CRMContact[]> {
    try {
      const response = await axios.get('https://www.zohoapis.com/crm/v2/Leads', {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
      });

      return response.data.data.map((record: any) => ({
        id: record.id,
        email: record.Email,
        phone: record.Phone,
        firstName: record.First_Name,
        lastName: record.Last_Name,
        company: record.Company,
        jobTitle: record.Designation,
        leadSource: record.Lead_Source
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Zoho contacts: ${error.message}`);
    }
  }

  private async fetchZohoDeals(accessToken: string): Promise<CRMDeal[]> {
    try {
      const response = await axios.get('https://www.zohoapis.com/crm/v2/Deals', {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
      });

      return response.data.data.map((record: any) => ({
        id: record.id,
        contactId: record.Contact_Name?.id || '',
        amount: parseFloat(record.Amount) || 0,
        stage: record.Stage,
        probability: parseFloat(record.Probability) || 0,
        closeDate: record.Closing_Date ? new Date(record.Closing_Date) : undefined
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Zoho deals: ${error.message}`);
    }
  }

  /**
   * Analyze lead quality and suggest campaign optimizations
   */
  async analyzeLeadQualityForCampaign(campaignId: string): Promise<{
    averageQualityScore: number;
    highQualityLeads: number;
    lowQualityLeads: number;
    recommendations: string[];
  }> {
    const leads = await prisma.lead.findMany({
      where: { campaignId },
      include: { leadActivities: true }
    });

    if (leads.length === 0) {
      return {
        averageQualityScore: 0,
        highQualityLeads: 0,
        lowQualityLeads: 0,
        recommendations: ['No leads found for this campaign']
      };
    }

    const qualityScores = leads.map(lead => lead.qualityScore || 0);
    const averageQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    const highQualityLeads = leads.filter(lead => (lead.qualityScore || 0) > 0.7).length;
    const lowQualityLeads = leads.filter(lead => (lead.qualityScore || 0) < 0.3).length;

    const recommendations: string[] = [];

    if (averageQualityScore < 0.5) {
      recommendations.push('Campaign is generating low-quality leads. Consider refining targeting.');
    }

    if (lowQualityLeads > highQualityLeads) {
      recommendations.push('High number of low-quality leads. Review negative keywords and audience exclusions.');
    }

    const convertedLeads = leads.filter(lead => lead.leadStage === 'CUSTOMER').length;
    const conversionRate = convertedLeads / leads.length;

    if (conversionRate < 0.1) {
      recommendations.push('Low conversion rate detected. Review landing page and follow-up processes.');
    }

    return {
      averageQualityScore,
      highQualityLeads,
      lowQualityLeads,
      recommendations
    };
  }
}

export const crmService = new CRMService();
