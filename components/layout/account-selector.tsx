'use client'

import React, { useEffect, useRef, startTransition } from 'react'
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Skeleton,
  Alert,
  Chip,
  Stack,
} from '@mui/material'
import { useAccount } from '@/lib/contexts/account-context'
import { trpc } from '@/lib/trpc/client'

/**
 * Account Selector Component
 *
 * Displays a dropdown to select the active Google Ads account.
 * Features:
 * - Auto-selects first active account on mount
 * - Displays account name, customer ID, and last sync time
 * - Loading skeleton during data fetch
 * - Empty state when no accounts exist
 * - Clean, professional Material Design 3 UI
 */
export function AccountSelector() {
  const { selectedAccountId, setSelectedAccountId } = useAccount()
  const hasAutoSelectedRef = useRef(false)

  // Fetch all active accounts
  const { data: accounts, isLoading, error } = trpc.accounts.list.useQuery({
    isActive: true,
  })

  // Auto-select first active account on mount (only once)
  useEffect(() => {
    if (!hasAutoSelectedRef.current && !selectedAccountId && accounts && accounts.length > 0) {
      // Use startTransition to mark this as a non-urgent update
      startTransition(() => {
        setSelectedAccountId(accounts[0].id)
      })
      hasAutoSelectedRef.current = true
    }
  }, [accounts, selectedAccountId, setSelectedAccountId])

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ px: 2, py: 1.5 }}>
        <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ px: 2, py: 1.5 }}>
        <Alert severity="error" variant="outlined" sx={{ fontSize: '0.875rem' }}>
          Failed to load accounts
        </Alert>
      </Box>
    )
  }

  // Empty state
  if (!accounts || accounts.length === 0) {
    return (
      <Box sx={{ px: 2, py: 1.5 }}>
        <Alert severity="info" variant="outlined" sx={{ fontSize: '0.875rem' }}>
          No accounts found. Add your first account to get started.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 600,
          mb: 1,
          display: 'block',
        }}
      >
        Active Account
      </Typography>

      <FormControl fullWidth size="small">
        <Select
          value={selectedAccountId || ''}
          onChange={(e) => setSelectedAccountId(Number(e.target.value))}
          displayEmpty
          sx={{
            backgroundColor: 'background.paper',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          }}
          renderValue={(selected) => {
            if (!selected) {
              return <Typography color="text.secondary">Select account</Typography>
            }
            const account = accounts.find((acc) => acc.id === selected)
            if (!account) return null

            return (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {account.name}
                </Typography>
                <Chip
                  label={account.customerId}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.6875rem',
                    backgroundColor: 'action.hover',
                    color: 'text.secondary',
                  }}
                />
              </Stack>
            )
          }}
        >
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.id}>
              <Box sx={{ width: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {account.name}
                  </Typography>
                  <Chip
                    label={account.customerId}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.625rem',
                      backgroundColor: 'action.hover',
                      color: 'text.secondary',
                    }}
                  />
                </Stack>

                {account.lastSyncedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Last synced: {new Date(account.lastSyncedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                )}

                {!account.lastSyncedAt && (
                  <Typography variant="caption" color="warning.main">
                    Not synced yet
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
