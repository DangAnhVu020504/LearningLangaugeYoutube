import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { TranscriptService } from './transcript.service';

@Controller('transcript')
export class TranscriptController {
  constructor(private readonly transcriptService: TranscriptService) {}

  /**
   * GET /api/transcript?videoId=xxx&lang=en
   * Lấy transcript của video YouTube
   */
  @Get()
  async getTranscript(
    @Query('videoId') videoId: string,
    @Query('lang') lang?: string,
  ) {
    if (!videoId) {
      throw new HttpException(
        'videoId là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const transcript = await this.transcriptService.fetchTranscript(
        videoId,
        lang || 'en',
      );
      
      return {
        success: true,
        videoId,
        language: lang || 'en',
        transcript,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Không thể lấy transcript. Video có thể không có phụ đề.',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
