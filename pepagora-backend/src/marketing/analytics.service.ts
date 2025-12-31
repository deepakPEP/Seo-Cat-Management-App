import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

@Injectable()
export class AnalyticsService {
  private analyticsDataClient: BetaAnalyticsDataClient | null = null;
  private propertyId: string;
  private credentials: any = null;

  constructor(private configService: ConfigService) {
    const propertyId = this.configService.get<string>('GA_PROPERTY_ID');
    
    if (!propertyId) {
      console.warn('[Analytics Service] GA_PROPERTY_ID is not configured. Analytics will not work.');
    }
    
    this.propertyId = propertyId || '';
    
    // Setup credentials from environment variable
    this.setupCredentials();
    
    // Initialize client lazily to avoid authentication errors on startup
    // The client will be created when first needed
  }

  /**
   * Setup Google Application Credentials from GA_APPLICATIONS_CREDENTIALS environment variable
   * The value should be a JSON string containing the service account credentials
   */
  private setupCredentials() {
    const credentialsString = this.configService.get<string>('GA_APPLICATIONS_CREDENTIALS');
    
    if (!credentialsString) {
      console.warn('[Analytics Service] GA_APPLICATIONS_CREDENTIALS not set in environment variables. Analytics will not work.');
      return;
    }

    try {
      // Parse the JSON string from environment variable
      this.credentials = JSON.parse(credentialsString);
      
      // Verify it's a service account credentials object
      if (this.credentials.type !== 'service_account') {
        console.warn('[Analytics Service] GA_APPLICATIONS_CREDENTIALS does not contain a service account (type: "service_account")');
        this.credentials = null;
        return;
      }

      console.log('[Analytics Service] Successfully loaded credentials from GA_APPLICATIONS_CREDENTIALS environment variable');
      console.log('[Analytics Service] Service account email:', this.credentials.client_email);
    } catch (parseError: any) {
      console.error('[Analytics Service] Failed to parse GA_APPLICATIONS_CREDENTIALS:', parseError.message);
      console.error('[Analytics Service] Ensure GA_APPLICATIONS_CREDENTIALS is a valid JSON string');
      this.credentials = null;
    }
  }

  /**
   * Get or create the analytics client
   * This is done lazily to avoid authentication errors on service initialization
   * Explicitly loads service account credentials from GA_APPLICATIONS_CREDENTIALS to avoid OAuth 2.0 flow
   */
  private getAnalyticsClient(): BetaAnalyticsDataClient {
    if (!this.analyticsDataClient) {
      try {
        // Ensure credentials are loaded
        if (!this.credentials) {
          throw new Error('Google Analytics credentials not found. Please set GA_APPLICATIONS_CREDENTIALS environment variable with a valid service account JSON string.');
        }

        // Initialize Google Analytics Data API client
        // Explicitly pass credentials to ensure service account authentication
        // This prevents the client from trying to use OAuth 2.0 user flow
        this.analyticsDataClient = new BetaAnalyticsDataClient({
          credentials: this.credentials,
        });

        console.log('[Analytics Service] Google Analytics client initialized with service account credentials from GA_APPLICATIONS_CREDENTIALS');
      } catch (error: any) {
        console.error('[Analytics Service] Failed to initialize Google Analytics client:', error);
        throw new BadRequestException(
          `Google Analytics client initialization failed: ${error.message}. Please check GA_APPLICATIONS_CREDENTIALS environment variable and ensure the service account has proper permissions.`
        );
      }
    }
    return this.analyticsDataClient;
  }

  /**
   * Fetch page views for a specific page URL within a date range
   * @param pageUrl - The full page URL (e.g., https://www.pepagora.com/c/industrial-equipment-machinery-mcscfd059v)
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns The number of page views
   */
  async getPageViews(
    pageUrl: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    try {
      if (!this.propertyId) {
        throw new BadRequestException('GA_PROPERTY_ID is not configured');
      }

      // Get the client (lazy initialization)
      const client = this.getAnalyticsClient();

      // Extract the path from the full URL
      const urlObj = new URL(pageUrl);
      let pagePath = urlObj.pathname;
      
      // Remove trailing slash for consistency
      if (pagePath.endsWith('/') && pagePath.length > 1) {
        pagePath = pagePath.slice(0, -1);
      }

      console.log('[Analytics Service] Fetching analytics for:', {
        pageUrl,
        pagePath,
        startDate,
        endDate,
        propertyId: this.propertyId,
      });

      // Try EXACT match first
      let [response] = await client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [
          {
            name: 'pagePath',
          },
        ],
        metrics: [
          {
            name: 'screenPageViews',
          },
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'EXACT',
              value: pagePath,
            },
          },
        },
      });

      // If no results with EXACT match, try with /en/ prefix first, then CONTAINS
      if ((!response.rows || response.rows.length === 0) && (!response.totals || response.totals.length === 0)) {
        // Try with /en/ prefix (common in multi-language sites)
        const pagePathWithEn = `/en${pagePath}`;
        console.log('[Analytics Service] No results with EXACT match, trying with /en/ prefix:', pagePathWithEn);
        [response] = await client.runReport({
          property: `properties/${this.propertyId}`,
          dateRanges: [
            {
              startDate,
              endDate,
            },
          ],
          dimensions: [
            {
              name: 'pagePath',
            },
          ],
          metrics: [
            {
              name: 'screenPageViews',
            },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'EXACT',
                value: pagePathWithEn,
              },
            },
          },
        });
        
        // If still no results, try CONTAINS match as final fallback
        if ((!response.rows || response.rows.length === 0) && (!response.totals || response.totals.length === 0)) {
          console.log('[Analytics Service] No results with /en/ prefix, trying CONTAINS match...');
          [response] = await client.runReport({
            property: `properties/${this.propertyId}`,
            dateRanges: [
              {
                startDate,
                endDate,
              },
            ],
            dimensions: [
              {
                name: 'pagePath',
              },
            ],
            metrics: [
              {
                name: 'screenPageViews',
              },
            ],
            dimensionFilter: {
              filter: {
                fieldName: 'pagePath',
                stringFilter: {
                  matchType: 'CONTAINS',
                  value: pagePath,
                },
              },
            },
          });
          console.log('[Analytics Service] CONTAINS match result:', {
            rowCount: response.rows?.length || 0,
          });
        } else {
          console.log('[Analytics Service] Found results with /en/ prefix:', {
            rowCount: response.rows?.length || 0,
          });
        }
      }

      console.log('[Analytics Service] API Response:', {
        rowCount: response.rows?.length || 0,
        totals: response.totals?.[0]?.metricValues?.[0]?.value,
        firstRow: response.rows?.[0] ? {
          pagePath: response.rows[0].dimensionValues?.[0]?.value,
          views: response.rows[0].metricValues?.[0]?.value,
        } : null,
      });

      // Extract the total page views from the response
      let totalViews = 0;
      
      // First, try to get from totals (more accurate for EXACT match)
      if (response.totals && response.totals.length > 0) {
        const totalValue = response.totals[0].metricValues?.[0]?.value;
        if (totalValue) {
          totalViews = parseInt(totalValue, 10);
          console.log('[Analytics Service] Using total value:', totalViews);
        }
      }
      
      // Fallback to summing rows if totals not available
      if (totalViews === 0 && response.rows && response.rows.length > 0) {
        // Normalize pagePath for comparison (remove /en/ prefix if present)
        const normalizePath = (path: string) => {
          if (!path) return '';
          // Remove /en/ prefix if it exists
          if (path.startsWith('/en/')) {
            return path.substring(3); // Remove '/en'
          }
          return path;
        };
        
        const normalizedPagePath = normalizePath(pagePath);
        
        // Sum up all the views that match the page path
        for (const row of response.rows) {
          const rowPath = row.dimensionValues?.[0]?.value || '';
          const normalizedRowPath = normalizePath(rowPath);
          
          // Check if paths match (with or without trailing slash, with or without /en/ prefix)
          const pathsMatch = 
            normalizedRowPath === normalizedPagePath ||
            normalizedRowPath === `${normalizedPagePath}/` ||
            rowPath === pagePath ||
            rowPath === `${pagePath}/`;
          
          if (pathsMatch) {
            const metricValue = row.metricValues?.[0]?.value;
            if (metricValue) {
              totalViews += parseInt(metricValue, 10);
              console.log('[Analytics Service] Added views from row:', {
                rowPath,
                normalizedRowPath,
                views: metricValue,
                runningTotal: totalViews,
              });
            }
          }
        }
        console.log('[Analytics Service] Summed from rows (filtered):', totalViews);
      }

      console.log('[Analytics Service] Final page views count:', totalViews);
      return totalViews;
    } catch (error: any) {
      console.error('[Analytics Service] Error fetching page views:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('credentials') || error.message?.includes('authentication')) {
        throw new BadRequestException('Google Analytics authentication failed. Please check GOOGLE_APPLICATION_CREDENTIALS environment variable and ensure the service account has proper permissions.');
      }
      
      if (error.message?.includes('property')) {
        throw new BadRequestException(`Invalid Google Analytics Property ID: ${this.propertyId}`);
      }
      
      // For other errors, return 0 to allow the frontend to still display
      // Log the error but don't break the application
      console.warn('[Analytics Service] Returning 0 page views due to error:', error.message || error);
      return 0;
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private validateDateFormat(date: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) {
      return false;
    }
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get date range based on option
   */
  getDateRange(option: string, customStartDate?: string, customEndDate?: string): { startDate: string; endDate: string } {
    const today = new Date();
    const endDate = this.formatDate(today);

    switch (option) {
      case 'previous_week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return {
          startDate: this.formatDate(weekAgo),
          endDate,
        };

      case 'previous_month':
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        return {
          startDate: this.formatDate(monthAgo),
          endDate,
        };

      case 'previous_year':
        const yearAgo = new Date(today);
        yearAgo.setDate(today.getDate() - 365);
        return {
          startDate: this.formatDate(yearAgo),
          endDate,
        };

      case 'custom':
        if (!customStartDate || !customEndDate) {
          throw new BadRequestException('Custom date range requires both startDate and endDate');
        }
        if (!this.validateDateFormat(customStartDate) || !this.validateDateFormat(customEndDate)) {
          throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
        }
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };

      default:
        // Default to previous month
        const defaultMonthAgo = new Date(today);
        defaultMonthAgo.setDate(today.getDate() - 30);
        return {
          startDate: this.formatDate(defaultMonthAgo),
          endDate,
        };
    }
  }
}

