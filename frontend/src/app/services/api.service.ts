import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TranscriptItem, TranslationResult } from '../models/vocabulary.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Lấy transcript từ backend
   */
  getTranscript(videoId: string, language: string = 'en'): Observable<any> {
    return this.http.get(`${this.API_URL}/transcript`, {
      params: { videoId, lang: language },
    });
  }

  /**
   * Dịch từ theo ngữ cảnh
   */
  translateWord(
    word: string,
    context: string,
    language: 'en' | 'zh' | 'ja'
  ): Observable<any> {
    return this.http.post(`${this.API_URL}/translate`, {
      word,
      context,
      language,
    });
  }

  /**
   * Phân từ cho tiếng Trung/Nhật
   */
  tokenize(text: string, language: 'zh' | 'ja'): Observable<any> {
    return this.http.post(`${this.API_URL}/translate/tokenize`, {
      text,
      language,
    });
  }
}
