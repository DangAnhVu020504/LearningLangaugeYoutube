import { Injectable, signal } from '@angular/core';
import { Vocabulary } from '../models/vocabulary.model';
import localforage from 'localforage';

@Injectable({
  providedIn: 'root',
})
export class VocabularyService {
  private readonly STORAGE_KEY = 'language_learning_vocabulary';
  
  // Signal để quản lý state
  vocabularies = signal<Vocabulary[]>([]);
  isLoading = signal(false);

  constructor() {
    this.loadVocabularies();
  }

  /**
   * Load tất cả từ vựng từ Local Storage
   */
  async loadVocabularies(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await localforage.getItem<Vocabulary[]>(this.STORAGE_KEY);
      this.vocabularies.set(data || []);
    } catch (error) {
      console.error('Lỗi khi load từ vựng:', error);
      this.vocabularies.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Lưu từ vựng mới
   */
  async saveVocabulary(vocab: Omit<Vocabulary, 'id' | 'createdAt'>): Promise<void> {
    const newVocab: Vocabulary = {
      ...vocab,
      id: this.generateId(),
      createdAt: Date.now(),
    };

    const current = this.vocabularies();
    const updated = [newVocab, ...current];
    
    await localforage.setItem(this.STORAGE_KEY, updated);
    this.vocabularies.set(updated);
  }

  /**
   * Xóa từ vựng
   */
  async deleteVocabulary(id: string): Promise<void> {
    const current = this.vocabularies();
    const updated = current.filter(v => v.id !== id);
    
    await localforage.setItem(this.STORAGE_KEY, updated);
    this.vocabularies.set(updated);
  }

  /**
   * Kiểm tra từ đã được lưu chưa
   */
  isWordSaved(word: string, videoId: string): boolean {
    return this.vocabularies().some(
      v => v.word.toLowerCase() === word.toLowerCase() && v.videoId === videoId
    );
  }

  /**
   * Lấy từ vựng theo video
   */
  getVocabulariesByVideo(videoId: string): Vocabulary[] {
    return this.vocabularies().filter(v => v.videoId === videoId);
  }

  /**
   * Tìm kiếm từ vựng
   */
  searchVocabularies(query: string): Vocabulary[] {
    const lowerQuery = query.toLowerCase();
    return this.vocabularies().filter(
      v => v.word.toLowerCase().includes(lowerQuery) ||
           v.meaning.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Export dữ liệu ra JSON
   */
  exportToJson(): string {
    return JSON.stringify(this.vocabularies(), null, 2);
  }

  /**
   * Import dữ liệu từ JSON
   */
  async importFromJson(jsonString: string): Promise<void> {
    try {
      const data = JSON.parse(jsonString) as Vocabulary[];
      await localforage.setItem(this.STORAGE_KEY, data);
      this.vocabularies.set(data);
    } catch (error) {
      throw new Error('File JSON không hợp lệ');
    }
  }

  /**
   * Xóa tất cả từ vựng
   */
  async clearAll(): Promise<void> {
    await localforage.removeItem(this.STORAGE_KEY);
    this.vocabularies.set([]);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
