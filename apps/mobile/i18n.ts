import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import 3 cuốn từ điển
import en from './locales/en.json';
import vi from './locales/vi.json';
import zh from './locales/zh.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  zh: { translation: zh },
};

// Lấy mã ngôn ngữ của máy (vd: máy tiếng Việt trả về 'vi', máy tiếng Anh trả về 'en')
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';

// Nếu ngôn ngữ máy không thuộc vi, zh, en thì tự động mặc định là tiếng Anh
const defaultLang = ['vi', 'zh', 'en'].includes(deviceLanguage) ? deviceLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4', // Bắt buộc cho React Native để không bị lỗi
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, 
    },
  });

export default i18n;