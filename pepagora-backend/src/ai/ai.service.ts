import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PageType } from './dto/deepseek-request.dto';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {}

  async callDeepSeek(prompt: string, pageType: PageType): Promise<string> {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const apiUrl = this.configService.get<string>(
      'DEEPSEEK_API_URL',
      'https://api.deepseek.com/chat/completions',
    );

    if (!apiKey) {
      throw new HttpException(
        'DeepSeek API key is not configured. Please set DEEPSEEK_API_KEY in your environment variables.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!apiUrl || apiUrl.trim() === '') {
      throw new HttpException(
        'DeepSeek API URL is not configured. Please set DEEPSEEK_API_URL in your environment variables.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const systemMessage = this.getSystemMessage(pageType);

    try {
      this.logger.log(`Calling DeepSeek API at: ${apiUrl}`);
      this.logger.log(`Page type: ${pageType}, Prompt length: ${prompt.length}`);
      this.logger.log(`System message: ${systemMessage}`);
      this.logger.log(`User prompt (first 500 chars): ${prompt.substring(0, 500)}...`);
      
      const requestPayload = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096, // Increased to allow for longer responses
        temperature: 0.7, // Add temperature for more consistent responses
      };
      
      this.logger.log(`Request payload size: ${JSON.stringify(requestPayload).length} bytes`);
      
      const response = await axios.post(
        apiUrl,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          // No timeout - wait indefinitely for DeepSeek API response
        },
      );

      this.logger.log(`DeepSeek API response status: ${response.status}`);

      const data = response.data;
      const aiText = data.choices?.[0]?.message?.content?.trim() || '';

      this.logger.log(`DeepSeek API response received, content length: ${aiText.length}`);

      if (!aiText) {
        this.logger.error(`DeepSeek API returned empty content. Full response:`, JSON.stringify(data, null, 2));
        throw new HttpException(
          'DeepSeek API did not return a result',
          HttpStatus.BAD_REQUEST,
        );
      }

      return aiText;
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(`HttpException:`, error.message);
        throw error;
      }
      
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        
        // Log full error response for debugging
        this.logger.error(`DeepSeek API Error Response:`, JSON.stringify(error.response?.data, null, 2));
        
        // Extract error message from various possible response formats
        let errorMessage = 'DeepSeek API request failed';
        if (error.response?.data) {
          // Try different possible error message locations
          errorMessage = 
            error.response.data.error?.message ||
            error.response.data.message ||
            error.response.data.error ||
            error.response.data.msg ||
            error.message ||
            'DeepSeek API request failed';
        } else {
          errorMessage = error.message || 'DeepSeek API request failed';
        }
        
        this.logger.error(`Axios error: ${errorMessage}`, {
          status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        
        throw new HttpException(
          errorMessage,
          status >= 400 && status < 500 ? status : HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      this.logger.error(`Unexpected error:`, error);
      throw new HttpException(
        `Failed to call DeepSeek API: ${error.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getSystemMessage(pageType: PageType): string {
    const baseMessage = 'You are an expert B2B content strategist for Pepagora.com. Create SEO + LLM-optimized content. Write concise, factual, globally readable copy. Use supplied data first; only generalize with industry knowledge if data is missing. Avoid unverified claims.';
    
    switch (pageType) {
      case 'Product':
        return `${baseMessage} Create content for a Product page.`;
      case 'Subcategory':
        return `${baseMessage} Create content for a Subcategory page.`;
      case 'Category':
        return `${baseMessage} Create content for a Category page.`;
      default:
        return baseMessage;
    }
  }
}

