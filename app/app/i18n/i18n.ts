import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const savedLang = typeof window !== 'undefined'
  ? localStorage.getItem('lang') ?? 'bg'
  : 'bg';

i18n.use(initReactI18next).init({
  lng: savedLang,
  fallbackLng: 'bg',
  resources: {
    bg: { common: require('../../../public/locales/bg/common.json') },
    en: { common: require('../../../public/locales/en/common.json') },
    es: { common: require('../../../public/locales/es/common.json') },
    fr: { common: require('../../../public/locales/fr/common.json') },
    de: { common: require('../../../public/locales/de/common.json') },
    ru: { common: require('../../../public/locales/ru/common.json') },
  },
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;