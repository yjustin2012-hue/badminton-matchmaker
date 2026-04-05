/**
 * i18next configuration
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './en.json';
import zhHansTranslations from './zh-Hans.json';
import zhHantTranslations from './zh-Hant.json';

const resources = {
  en: { translation: enTranslations },
  'zh-Hans': { translation: zhHansTranslations },
  'zh-Hant': { translation: zhHantTranslations },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
