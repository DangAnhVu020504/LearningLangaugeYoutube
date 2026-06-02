import { Injectable } from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptItem {
  text: string;
  start: number;  // Thời gian bắt đầu (giây)
  duration: number;  // Độ dài (giây)
}

@Injectable()
export class TranscriptService {
  /**
   * Lấy transcript từ YouTube
   * Sử dụng thư viện youtube-transcript
   */
  async fetchTranscript(
    videoId: string,
    lang: string = 'en',
  ): Promise<TranscriptItem[]> {
    try {
      // Lấy transcript từ YouTube - thử nhiều language codes
      let transcript;
      
      if (lang === 'zh') {
        // Thử các variants của tiếng Trung
        const zhVariants = ['zh-CN', 'zh-Hans', 'zh-TW', 'zh-Hant', 'zh'];
        for (const variant of zhVariants) {
          try {
            transcript = await YoutubeTranscript.fetchTranscript(videoId, {
              lang: variant,
            });
            break;
          } catch (e) {
            continue;
          }
        }
        if (!transcript) {
          throw new Error('Không tìm thấy phụ đề tiếng Trung');
        }
      } else if (lang === 'ja') {
        // Thử các variants của tiếng Nhật
        const jaVariants = ['ja', 'ja-JP'];
        for (const variant of jaVariants) {
          try {
            transcript = await YoutubeTranscript.fetchTranscript(videoId, {
              lang: variant,
            });
            break;
          } catch (e) {
            continue;
          }
        }
        if (!transcript) {
          throw new Error('Không tìm thấy phụ đề tiếng Nhật');
        }
      } else {
        // Tiếng Anh hoặc ngôn ngữ khác
        transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: lang,
        });
      }

      // Chuyển đổi format
      return transcript.map((item: any) => ({
        text: item.text,
        start: item.offset / 1000,  // Convert ms to seconds
        duration: item.duration / 1000,
      }));
    } catch (error) {
      console.error('Lỗi khi lấy transcript:', error);
      
      // Nếu không có phụ đề, trả về hướng dẫn sử dụng Whisper
      throw new Error(
        'Video không có phụ đề. Để sử dụng tính năng này, bạn cần:\n' +
        '1. Chọn video có phụ đề (CC)\n' +
        '2. Hoặc tích hợp OpenAI Whisper API để tự động tạo phụ đề\n' +
        'Chi tiết: https://platform.openai.com/docs/guides/speech-to-text'
      );
    }
  }

  /**
   * MỞ RỘNG: Tích hợp OpenAI Whisper để generate transcript
   * Sử dụng khi video không có sẵn phụ đề
   */
  async generateTranscriptWithWhisper(
    videoId: string,
  ): Promise<TranscriptItem[]> {
    // Bước 1: Download audio từ YouTube (cần thư viện ytdl-core hoặc yt-dlp)
    // Bước 2: Gọi OpenAI Whisper API
    // Bước 3: Parse response và trả về format TranscriptItem[]
    
    throw new Error(
      'Tính năng này cần được triển khai. Các bước:\n' +
      '1. npm install ytdl-core\n' +
      '2. Download audio: ytdl(videoUrl, { quality: "highestaudio" })\n' +
      '3. Gọi OpenAI Whisper: openai.audio.transcriptions.create()\n' +
      '4. Parse timestamps và trả về mảng TranscriptItem'
    );
  }
}
