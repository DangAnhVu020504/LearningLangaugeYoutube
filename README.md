# Language Learning App - Học Ngoại Ngữ Qua Video YouTube

Ứng dụng web học ngoại ngữ cho phép xem video YouTube với phụ đề đồng bộ, tra từ theo ngữ cảnh và lưu từ vựng.

## 🚀 CHƯƠNG TRÌNH ĐÃ KHỞI ĐỘNG!

### ✅ Backend đang chạy tại: http://localhost:3000/api

### 🎯 Cách sử dụng ngay:

1. **Mở file test:** `frontend/test.html` trong trình duyệt
2. **Test API:** Click các nút để test Transcript và Translate API
3. **Thêm API Key:** Mở `backend/.env` và thêm OPENAI_API_KEY hoặc GEMINI_API_KEY

📖 **Đọc chi tiết:** [QUICK_START.md](QUICK_START.md)

---

## Tech Stack

- **Frontend**: Angular 17+ (Standalone Components, Signals)
- **Backend**: NestJS (API Proxy) - ✅ ĐANG CHẠY
- **Storage**: Local Storage / IndexedDB
- **APIs**: YouTube IFrame API, OpenAI/Gemini API

## Tính năng chính

1. ✅ Nhập link YouTube và phát video
2. ✅ Hiển thị phụ đề đồng bộ với video
3. ✅ Click vào từ để tra nghĩa theo ngữ cảnh
4. ✅ Phát âm từ vựng bằng Web Speech API
5. ✅ Lưu từ vựng vào Local Storage
6. ✅ Quản lý sổ tay từ vựng

## 🧪 Test API ngay

### Test Transcript (Không cần API Key):
```
http://localhost:3000/api/transcript?videoId=dQw4w9WgXcQ&lang=en
```

### Test với HTML:
Mở file `frontend/test.html` trong trình duyệt

## ⚙️ Cấu hình API Key

Mở file `backend/.env` và thêm:

```env
OPENAI_API_KEY=sk-your-key-here
# hoặc
GEMINI_API_KEY=your-key-here

PORT=3000
FRONTEND_URL=http://localhost:4200
LLM_PROVIDER=openai
```

**Lấy API Key:**
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://makersuite.google.com/app/apikey

## 📚 Tài liệu

- [QUICK_START.md](QUICK_START.md) - Hướng dẫn nhanh
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Hướng dẫn cài đặt chi tiết
- [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md) - Tài liệu kỹ thuật
- [SUMMARY.md](SUMMARY.md) - Tóm tắt dự án

## Hỗ trợ ngôn ngữ

- 🇬🇧 Tiếng Anh
- 🇨🇳 Tiếng Trung
- 🇯🇵 Tiếng Nhật
