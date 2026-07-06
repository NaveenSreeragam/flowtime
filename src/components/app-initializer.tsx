'use client';

import React, { useEffect } from 'react';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { supabase } from '@/lib/supabase/client';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const loadInitialData = useFlowTimeStore((state) => state.loadInitialData);
  const tick = useFlowTimeStore((state) => state.tick);
  const setUser = useFlowTimeStore((state) => state.setUser);

  useEffect(() => {
    // Load initial tasks, settings, templates
    loadInitialData();

    // Monitor Supabase auth session
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });

      return () => subscription.unsubscribe();
    }
  }, [loadInitialData, setUser]);

  // Global 1s ticker for running tasks
  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(timer);
  }, [tick]);

  return <>{children}</>;
}
