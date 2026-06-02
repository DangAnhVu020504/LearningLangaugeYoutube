import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { TranslateService } from './translate.service';

export class TranslateDto {
  word: string;
  context: string;
  language: 'en' | 'zh' | 'ja';
}

@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  /**
   * POST /api/translate
   * Dịch từ theo ngữ cảnh sử dụng LLM
   */
  @Post()
  async translate(@Body() dto: TranslateDto) {
    const { word, context, language } = dto;

    if (!word || !context || !language) {
      throw new HttpException(
        'word, context và language là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.translateService.translateWithContext(
        word,
        context,
        language,
      );

      return {
        success: true,
        word,
        language,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Không thể dịch từ',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/translate/tokenize
   * Phân từ cho tiếng Trung/Nhật
   */
  @Post('tokenize')
  async tokenize(
    @Body() body: { text: string; language: 'zh' | 'ja' },
  ) {
    const { text, language } = body;

    if (!text || !language) {
      throw new HttpException(
        'text và language là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const tokens = await this.translateService.tokenize(text, language);
      
      return {
        success: true,
        language,
        tokens,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Không thể phân từ',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
