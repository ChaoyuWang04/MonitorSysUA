'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from '@/lib/trpc/client'
import { AccountProvider } from '@/lib/contexts/account-context'
import { ToastProvider } from '@/components/common/toast-provider'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 seconds - faster UI updates after mutations
        refetchOnMount: false, // Only refetch if data is stale (after staleTime expires)
        refetchOnWindowFocus: false, // Avoid excessive refetching
        refetchOnReconnect: false, // Avoid refetching on network reconnect
      },
    },
  }))

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AccountProvider>
            {children}
          </AccountProvider>
        </ToastProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
