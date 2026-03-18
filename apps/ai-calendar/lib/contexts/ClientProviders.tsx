'use client';

import { ReactNode } from 'react';
import { LocaleProvider } from './LocaleContext';
import { AIModelProvider } from './AIModelContext';
import { useLocale } from './LocaleContext';

function AIModelProviderWithLocale({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  return (
    <AIModelProvider initialLocale={locale}>
      {children}
    </AIModelProvider>
  );
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <AIModelProviderWithLocale>
        {children}
      </AIModelProviderWithLocale>
    </LocaleProvider>
  );
}

export { useLocale } from './LocaleContext';
export { useAIModel } from './AIModelContext';
