import axios from 'axios';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

// Search API configuration
const SEARCH_API_KEY = process.env.SEARCH_API_KEY || '';
const SEARCH_API_PROVIDER = process.env.SEARCH_API_PROVIDER || 'tavily'; // Default provider

// Cache configuration
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

interface SearchResponse {
  results: SearchResult[];
  totalResults?: number;
  searchTime?: number;
  provider: string;
  cached?: boolean;
  query: string;
}

/**
 * Search service that provides a unified interface to various search APIs
 * and includes caching to improve performance and reduce API calls
 */
class SearchService {
  /**
   * Perform a web search using the configured search API
   */
  async search(query: string, options: { 
    maxResults?: number,
    siteRestrict?: string,
    freshness?: 'day' | 'week' | 'month' | 'year',
    forceRefresh?: boolean
  } = {}): Promise<SearchResponse> {
    const { maxResults = 10, siteRestrict, freshness, forceRefresh = false } = options;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedResults = await this.getCachedResults(query, siteRestrict);
      if (cachedResults) {
        return {
          ...cachedResults,
          cached: true,
          provider: cachedResults.provider || SEARCH_API_PROVIDER,
          query
        };
      }
    }
    
    // Perform actual search based on configured provider
    let results: SearchResponse;
    
    try {
      switch (SEARCH_API_PROVIDER.toLowerCase()) {
        case 'tavily':
          results = await this.searchWithTavily(query, maxResults, siteRestrict, freshness);
          break;
        case 'bing':
          results = await this.searchWithBing(query, maxResults, siteRestrict, freshness);
          break;
        case 'brave':
          results = await this.searchWithBrave(query, maxResults, siteRestrict, freshness);
          break;
        case 'serpapi':
          results = await this.searchWithSerpApi(query, maxResults, siteRestrict, freshness);
          break;
        case 'google_cse':
          results = await this.searchWithGoogleCSE(query, maxResults, siteRestrict);
          break;
        default:
          // Fallback to Tavily if provider not recognized
          results = await this.searchWithTavily(query, maxResults, siteRestrict, freshness);
      }
      
      // Cache the results
      await this.cacheResults(query, siteRestrict, results);
      
      return {
        ...results,
        provider: SEARCH_API_PROVIDER,
        query
      };
    } catch (error) {
      console.error(`Search error with provider ${SEARCH_API_PROVIDER}:`, error);
      
      // Try fallback provider if primary fails
      if (SEARCH_API_PROVIDER.toLowerCase() !== 'tavily') {
        try {
          console.log('Falling back to Tavily search API');
          results = await this.searchWithTavily(query, maxResults, siteRestrict, freshness);
          return {
            ...results,
            provider: 'tavily (fallback)',
            query
          };
        } catch (fallbackError) {
          console.error('Fallback search also failed:', fallbackError);
        }
      }
      
      // Return empty results if all attempts fail
      return {
        results: [],
        provider: 'error',
        query
      };
    }
  }
  
  /**
   * Search using Tavily API
   * https://tavily.com/
   */
  private async searchWithTavily(
    query: string, 
    maxResults: number = 10,
    siteRestrict?: string,
    freshness?: 'day' | 'week' | 'month' | 'year'
  ): Promise<SearchResponse> {
    const tavilyKey = process.env.TAVILY_API_KEY || SEARCH_API_KEY;
    
    if (!tavilyKey) {
      throw new Error('Tavily API key not configured');
    }
    
    // Prepare search parameters
    const searchParams: any = {
      api_key: tavilyKey,
      query: siteRestrict ? `${query} site:${siteRestrict}` : query,
      search_depth: 'advanced',
      max_results: maxResults
    };
    
    // Add time filter if specified
    if (freshness) {
      let timeFilter;
      switch (freshness) {
        case 'day': timeFilter = 'day'; break;
        case 'week': timeFilter = 'week'; break;
        case 'month': timeFilter = 'month'; break;
        case 'year': timeFilter = 'year'; break;
      }
      if (timeFilter) {
        searchParams.include_time_filter = timeFilter;
      }
    }
    
    const response = await axios.post('https://api.tavily.com/search', searchParams);
    
    const results = response.data.results.map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.content,
      source: 'tavily'
    }));
    
    return {
      results,
      totalResults: results.length,
      searchTime: response.data.search_time,
      provider: 'tavily',
      query
    };
  }
  
  /**
   * Search using Bing Web Search API
   * https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
   */
  private async searchWithBing(
    query: string, 
    maxResults: number = 10,
    siteRestrict?: string,
    freshness?: 'day' | 'week' | 'month' | 'year'
  ): Promise<SearchResponse> {
    const bingKey = process.env.BING_API_KEY || SEARCH_API_KEY;
    
    if (!bingKey) {
      throw new Error('Bing API key not configured');
    }
    
    // Prepare the query with site restriction if needed
    const searchQuery = siteRestrict ? `${query} site:${siteRestrict}` : query;
    
    // Add freshness parameter if specified
    let freshnessParam = '';
    if (freshness) {
      switch (freshness) {
        case 'day': freshnessParam = '&freshness=Day'; break;
        case 'week': freshnessParam = '&freshness=Week'; break;
        case 'month': freshnessParam = '&freshness=Month'; break;
      }
    }
    
    const response = await axios.get(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQuery)}&count=${maxResults}${freshnessParam}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': bingKey
        }
      }
    );
    
    const results = response.data.webPages.value.map((item: any) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      source: 'bing'
    }));
    
    return {
      results,
      totalResults: response.data.webPages.totalEstimatedMatches,
      provider: 'bing',
      query
    };
  }
  
  /**
   * Search using Brave Search API
   * https://api.search.brave.com/
   */
  private async searchWithBrave(
    query: string, 
    maxResults: number = 10,
    siteRestrict?: string,
    freshness?: 'day' | 'week' | 'month' | 'year'
  ): Promise<SearchResponse> {
    const braveKey = process.env.BRAVE_API_KEY || SEARCH_API_KEY;
    
    if (!braveKey) {
      throw new Error('Brave API key not configured');
    }
    
    // Prepare the query with site restriction if needed
    const searchQuery = siteRestrict ? `${query} site:${siteRestrict}` : query;
    
    // Add time range if specified
    let timeRange = '';
    if (freshness) {
      switch (freshness) {
        case 'day': timeRange = '&time_range=past_day'; break;
        case 'week': timeRange = '&time_range=past_week'; break;
        case 'month': timeRange = '&time_range=past_month'; break;
        case 'year': timeRange = '&time_range=past_year'; break;
      }
    }
    
    const response = await axios.get(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=${maxResults}${timeRange}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveKey
        }
      }
    );
    
    const results = response.data.web.results.map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.description,
      source: 'brave'
    }));
    
    return {
      results,
      totalResults: response.data.web.totalResults,
      provider: 'brave',
      query
    };
  }
  
  /**
   * Search using SerpAPI
   * https://serpapi.com/
   */
  private async searchWithSerpApi(
    query: string, 
    maxResults: number = 10,
    siteRestrict?: string,
    freshness?: 'day' | 'week' | 'month' | 'year'
  ): Promise<SearchResponse> {
    const serpApiKey = process.env.SERPAPI_API_KEY || SEARCH_API_KEY;
    
    if (!serpApiKey) {
      throw new Error('SerpAPI key not configured');
    }
    
    // Prepare the query with site restriction if needed
    const searchQuery = siteRestrict ? `${query} site:${siteRestrict}` : query;
    
    // Add time range if specified
    let timeRange = '';
    if (freshness) {
      switch (freshness) {
        case 'day': timeRange = '&tbs=qdr:d'; break;
        case 'week': timeRange = '&tbs=qdr:w'; break;
        case 'month': timeRange = '&tbs=qdr:m'; break;
        case 'year': timeRange = '&tbs=qdr:y'; break;
      }
    }
    
    const response = await axios.get(
      `https://serpapi.com/search?q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&num=${maxResults}${timeRange}`
    );
    
    const results = response.data.organic_results.slice(0, maxResults).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: 'serpapi'
    }));
    
    return {
      results,
      totalResults: response.data.search_information?.total_results,
      searchTime: response.data.search_information?.time_taken_displayed,
      provider: 'serpapi',
      query
    };
  }
  
  /**
   * Search using Google Programmable Search Engine (CSE)
   * https://developers.google.com/custom-search/v1/overview
   */
  private async searchWithGoogleCSE(
    query: string, 
    maxResults: number = 10,
    siteRestrict?: string
  ): Promise<SearchResponse> {
    const googleApiKey = process.env.GOOGLE_API_KEY || SEARCH_API_KEY;
    const googleCseId = process.env.GOOGLE_CSE_ID;
    
    if (!googleApiKey || !googleCseId) {
      throw new Error('Google API key or CSE ID not configured');
    }
    
    // Prepare the query with site restriction if needed
    const searchQuery = siteRestrict ? `${query} site:${siteRestrict}` : query;
    
    const response = await axios.get(
      `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(searchQuery)}&num=${Math.min(maxResults, 10)}`
    );
    
    const results = response.data.items.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: 'google_cse'
    }));
    
    return {
      results,
      totalResults: parseInt(response.data.searchInformation.totalResults),
      searchTime: parseFloat(response.data.searchInformation.searchTime),
      provider: 'google_cse',
      query
    };
  }
  
  /**
   * Cache search results in the database
   */
  private async cacheResults(query: string, siteRestrict: string | undefined, results: SearchResponse): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(query, siteRestrict);
      
      await prisma.$queryRaw`
        INSERT INTO search_cache ("cacheKey", query, "siteRestrict", results, provider, "createdAt", "updatedAt")
        VALUES (${cacheKey}, ${query}, ${siteRestrict || null}, ${JSON.stringify(results)}, ${results.provider}, NOW(), NOW())
        ON CONFLICT ("cacheKey") 
        DO UPDATE SET results = ${JSON.stringify(results)}, "updatedAt" = NOW()
      `;
    } catch (error) {
      console.error('Error caching search results:', error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Retrieve cached search results if available and not expired
   */
  private async getCachedResults(query: string, siteRestrict: string | undefined): Promise<SearchResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(query, siteRestrict);
      
      const results = await prisma.$queryRaw<any[]>`
        SELECT * FROM search_cache WHERE "cacheKey" = ${cacheKey} LIMIT 1
      `;
      const cached = results && results.length > 0 ? results[0] : null;
      
      if (!cached) return null;
      
      // Check if cache is expired
      const now = new Date();
      const cacheAge = now.getTime() - cached.updatedAt.getTime();
      
      if (cacheAge > CACHE_EXPIRY) {
        return null;
      }
      
      return cached.results as unknown as SearchResponse;
    } catch (error) {
      console.error('Error retrieving cached search results:', error);
      return null;
    }
  }
  
  /**
   * Generate a unique cache key for a search query
   */
  private generateCacheKey(query: string, siteRestrict: string | undefined): string {
    const normalizedQuery = query.toLowerCase().trim();
    const sitePart = siteRestrict ? `-${siteRestrict}` : '';
    return `search-${normalizedQuery}${sitePart}`;
  }
}

export const searchService = new SearchService();
