import { Injectable } from '@nestjs/common';
import { LlmService } from '../translate/llm.service';

@Injectable()
export class AiChatService {
  constructor(private readonly llmService: LlmService) {}

  /**
   * Trả lời câu hỏi của user với vai trò trợ lý học ngoại ngữ
   */
  async getResponse(message: string, context?: string): Promise<string> {
    // System prompt định nghĩa vai trò của AI
    const systemPrompt = `Bạn là một trợ lý AI chuyên về học ngoại ngữ (tiếng Anh, tiếng Trung, tiếng Nhật, tiếng Hàn, tiếng Pháp, tiếng Đức).

Nhiệm vụ của bạn:
- Giải thích ngữ pháp một cách dễ hiểu
- Dịch và giải nghĩa từ vựng chi tiết
- Đưa ra ví dụ thực tế
- Tư vấn phương pháp học tập hiệu quả
- Luyện tập hội thoại với user
- Giải đáp mọi thắc mắc về ngôn ngữ

Phong cách:
- Thân thiện, nhiệt tình
- Giải thích rõ ràng, dễ hiểu
- Đưa ra ví dụ cụ thể
- Khuyến khích học viên

Trả lời ngắn gọn (2-4 câu) trừ khi câu hỏi yêu cầu giải thích chi tiết.`;

    // Tạo prompt đầy đủ
    let fullPrompt = systemPrompt + '\n\n';
    
    if (context) {
      fullPrompt += `Ngữ cảnh: ${context}\n\n`;
    }
    
    fullPrompt += `Câu hỏi của học viên: ${message}\n\nTrả lời:`;

    try {
      const response = await this.llmService.generateResponse(fullPrompt);
      return this.cleanResponse(response);
    } catch (error) {
      console.error('Lỗi khi gọi LLM:', error);
      throw new Error('Không thể kết nối đến AI service');
    }
  }

  /**
   * Làm sạch response từ LLM
   */
  private cleanResponse(response: string): string {
    // Loại bỏ markdown formatting nếu có
    let cleaned = response.trim();
    
    // Loại bỏ các prefix không cần thiết
    cleaned = cleaned.replace(/^(Trả lời:|Answer:|Response:)\s*/i, '');
    
    return cleaned;
  }

  /**
   * Tạo prompt cho các loại câu hỏi khác nhau
   */
  createPromptForType(type: string, message: string): string {
    const prompts: Record<string, string> = {
      grammar: `Giải thích ngữ pháp: ${message}. Đưa ra công thức, cách dùng và 2 ví dụ.`,
      vocabulary: `Giải nghĩa từ: "${message}". Bao gồm: nghĩa, cách dùng, ví dụ và các từ liên quan.`,
      translation: `Dịch sang tiếng Việt và giải thích: "${message}"`,
      practice: `Tạo một bài luyện tập về: ${message}. Bao gồm câu hỏi và gợi ý trả lời.`,
    };

    return prompts[type] || message;
  }
}
