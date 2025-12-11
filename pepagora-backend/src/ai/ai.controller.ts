import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AiService } from './ai.service';
import { DeepSeekRequestDto, PageType } from './dto/deepseek-request.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('deepseek')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async callDeepSeek(@Body() dto: DeepSeekRequestDto) {
    try {
      const result = await this.aiService.callDeepSeek(dto.prompt, dto.pageType);
      
      return {
        statusCode: HttpStatus.OK,
        message: 'AI content generated successfully',
        data: {
          content: result,
        },
      };
    } catch (error) {
      console.error('[AI Controller] Error calling DeepSeek:', error);
      throw error; // Re-throw to let the exception filter handle it
    }
  }
}

