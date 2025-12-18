'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from '@/lib/query/query-client';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider with devtools
 * Creates a single QueryClient instance per component lifecycle
 * Devtools only shown in development
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient once per component instance
  // Using useState ensures the client is created once and persists across re-renders
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
