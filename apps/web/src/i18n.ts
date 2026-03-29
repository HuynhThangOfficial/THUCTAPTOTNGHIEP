"use client";

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector'; // 👈 1. IMPORT ĂNG-TEN

import en from './locales/en.json';
import vi from './locales/vi.json';
import zh from './locales/zh.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  zh: { translation: zh }
};

i18n
  .use(LanguageDetector) // 👈 2. GẮN ĂNG-TEN VÀO ĐÂY
  .use(initReactI18next)
  .init({
    resources,
    // lng: 'vi', // 👈 3. QUAN TRỌNG: Đã xóa dòng này để nó không bị ép chết ở tiếng Việt
    fallbackLng: 'en', // Đề phòng ngôn ngữ lạ thì tự lùi về tiếng Anh
    detection: {
      // 4. Ưu tiên tìm trong LocalStorage trước (nếu người dùng từng tự đổi ngôn ngữ), 
      // nếu không có thì đọc ngôn ngữ của trình duyệt (navigator)
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], 
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;