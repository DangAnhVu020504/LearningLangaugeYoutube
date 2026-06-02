import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';

export interface TranslationResult {
  meaning: string;
  grammar_note?: string;
  examples: string[];
  pronunciation?: string;
}

@Injectable()
export class TranslateService {
  constructor(private readonly llmService: LlmService) {}

  /**
   * Dịch từ theo ngữ cảnh sử dụng LLM
   */
  async translateWithContext(
    word: string,
    context: string,
    language: 'en' | 'zh' | 'ja',
  ): Promise<TranslationResult> {
    const languageNames = {
      en: 'tiếng Anh',
      zh: 'tiếng Trung',
      ja: 'tiếng Nhật',
    };

    const prompt = `Bạn là một giáo viên ${languageNames[language]} chuyên nghiệp.

Nhiệm vụ: Dịch từ "${word}" sang tiếng Việt dựa vào ngữ cảnh câu sau:
"${context}"

Yêu cầu trả về JSON với format chính xác:
{
  "meaning": "Nghĩa của từ trong ngữ cảnh này (tiếng Việt)",
  "grammar_note": "Giải thích ngữ pháp hoặc cách dùng (nếu cần)",
  "examples": ["Ví dụ 1 với từ này", "Ví dụ 2 với từ này"],
  "pronunciation": "Phiên âm (nếu là tiếng Trung/Nhật)"
}

Lưu ý:
- Dịch chính xác theo ngữ cảnh, không dịch nghĩa chung
- Ví dụ phải ngắn gọn và thực tế
- Chỉ trả về JSON, không thêm text khác`;

    try {
      const response = await this.llmService.generateResponse(prompt);
      
      // Parse JSON từ response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM không trả về JSON hợp lệ');
      }

      const result: TranslationResult = JSON.parse(jsonMatch[0]);
      
      // Validate result
      if (!result.meaning || !Array.isArray(result.examples)) {
        throw new Error('JSON không đúng format');
      }

      return result;
    } catch (error) {
      console.error('Lỗi khi dịch:', error);
      
      // Fallback response
      return {
        meaning: `Nghĩa của "${word}" (Lỗi: ${error.message})`,
        grammar_note: 'Không thể lấy thông tin ngữ pháp',
        examples: [context],
      };
    }
  }

  /**
   * Phân từ cho tiếng Trung/Nhật
   * Sử dụng LLM để phân từ đơn giản
   */
  async tokenize(text: string, language: 'zh' | 'ja'): Promise<string[]> {
    const languageNames = {
      zh: 'tiếng Trung',
      ja: 'tiếng Nhật',
    };

    const prompt = `Phân tách câu ${languageNames[language]} sau thành các từ riêng biệt:
"${text}"

Trả về JSON array các từ:
["từ1", "từ2", "từ3", ...]

Chỉ trả về JSON array, không thêm text khác.`;

    try {
      const response = await this.llmService.generateResponse(prompt);
      
      // Parse JSON array
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Fallback: Tách theo ký tự
        return text.split('');
      }

      const tokens: string[] = JSON.parse(jsonMatch[0]);
      return tokens;
    } catch (error) {
      console.error('Lỗi khi phân từ:', error);
      
      // Fallback: Tách theo ký tự
      return text.split('');
    }
  }

  /**
   * MỞ RỘNG: Tích hợp thư viện tokenizer chuyên dụng
   * - Tiếng Nhật: kuromoji.js
   * - Tiếng Trung: nodejieba
   */
  async tokenizeWithLibrary(text: string, language: 'zh' | 'ja'): Promise<string[]> {
    if (language === 'ja') {
      // npm install kuromoji
      // const kuromoji = require('kuromoji');
      // return new Promise((resolve) => {
      //   kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
      //     const tokens = tokenizer.tokenize(text);
      //     resolve(tokens.map(t => t.surface_form));
      //   });
      // });
      throw new Error('Cần cài đặt: npm install kuromoji');
    }

    if (language === 'zh') {
      // npm install nodejieba
      // const nodejieba = require('nodejieba');
      // return nodejieba.cut(text);
      throw new Error('Cần cài đặt: npm install nodejieba');
    }

    return [];
  }
}
