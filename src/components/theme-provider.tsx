'use client';

import React, { useEffect } from 'react';
import { useFlowTimeStore } from '@/store/use-flowtime-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useFlowTimeStore((state) => state.settings.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return <>{children}</>;
}
