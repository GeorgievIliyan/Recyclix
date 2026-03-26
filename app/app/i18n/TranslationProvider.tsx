'use client';

import { useEffect } from 'react';
import './i18n';

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}