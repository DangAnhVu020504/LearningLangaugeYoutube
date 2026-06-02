import { Controller, Post, Body } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';

export class ChatDto {
  message: string;
  context?: string; // Optional: Ngữ cảnh từ video/transcript
}

@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  /**
   * POST /api/ai-chat
   * Trả lời câu hỏi của user
   */
  @Post()
  async chat(@Body() dto: ChatDto) {
    try {
      const response = await this.aiChatService.getResponse(
        dto.message,
        dto.context,
      );

      return {
        success: true,
        response,
      };
    } catch (error) {
      return {
        success: false,
        response: 'Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng thử lại.',
        error: error.message,
      };
    }
  }
}
