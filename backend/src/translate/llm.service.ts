import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class LlmService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private provider: 'openai' | 'gemini';

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get<'openai' | 'gemini'>('LLM_PROVIDER') || 'openai';

    // Khởi tạo OpenAI
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({
        apiKey: openaiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }

    // Khởi tạo Gemini với API version v1beta
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.gemini = new GoogleGenerativeAI(geminiKey);
    }

    console.log(`🤖 LLM Provider: ${this.provider}`);
  }

  /**
   * Generate response từ LLM
   * Tự động chọn provider dựa vào config
   */
  async generateResponse(prompt: string): Promise<string> {
    if (this.provider === 'openai' && this.openai) {
      return this.generateWithOpenAI(prompt);
    }

    if (this.provider === 'gemini' && this.gemini) {
      return this.generateWithGemini(prompt);
    }

    throw new Error(
      'Không có LLM provider nào được cấu hình. ' +
      'Vui lòng thêm OPENAI_API_KEY hoặc GEMINI_API_KEY vào file .env'
    );
  }

  /**
   * Gọi OpenAI API
   */
  private async generateWithOpenAI(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'llama-3.1-8b-instant',  // Hoặc 'gpt-4' nếu có quyền
        messages: [
          {
            role: 'system',
            content: 'Bạn là một trợ lý dịch thuật chuyên nghiệp. Luôn trả về JSON chính xác.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,  // Giảm nhiệt độ để output ổn định hơn
        max_tokens: 500,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('Lỗi OpenAI:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Gọi Gemini API
   */
  private async generateWithGemini(prompt: string): Promise<string> {
    try {
      // Thử các model khả dụng theo thứ tự ưu tiên
      const modelNames = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b', // Bản siêu nhẹ, dự phòng cực tốt cho dịch thuật
        'gemini-1.0-pro'
      ];

      let lastError: Error | null = null;

      // Thử từng model cho đến khi thành công
      for (const modelName of modelNames) {
        try {
          const model = this.gemini.getGenerativeModel({ 
            model: modelName,
          });

          const result = await model.generateContent(prompt);
          const response = await result.response;
          
          console.log(`✅ Sử dụng model: ${modelName}`);
          return response.text();
        } catch (error) {
          lastError = error;
          console.log(`❌ Model ${modelName} không khả dụng: ${error.message}`);
          continue; // Thử model tiếp theo
        }
      }

      // Nếu tất cả models đều thất bại
      throw lastError || new Error('Không tìm thấy model Gemini khả dụng');
    } catch (error) {
      console.error('Lỗi Gemini:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Kiểm tra xem LLM có sẵn sàng không
   */
  isReady(): boolean {
    return (this.provider === 'openai' && this.openai !== null) ||
           (this.provider === 'gemini' && this.gemini !== null);
  }
}
