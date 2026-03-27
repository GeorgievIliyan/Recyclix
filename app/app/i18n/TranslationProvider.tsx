'use client';

import { useEffect } from 'react';
import i18n from './i18n';
import { getPreferredLanguage } from '@/lib/utils';

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lang = getPreferredLanguage();
      i18n.changeLanguage(lang);
      document.documentElement.lang = lang;
    }
  }, []);

  return <>{children}</>;
}