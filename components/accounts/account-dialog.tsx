'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Switch,
  FormControlLabel,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/common/toast-provider'
import type { Account } from '@/server/db/schema'

interface AccountDialogProps {
  open: boolean
  account: Account | null // null for create, Account for edit
  onClose: () => void
}

// Common time zones for Google Ads
const TIME_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Australia/Sydney',
]

// Common currencies
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'HKD']

/**
 * Account Add/Edit Dialog
 *
 * Features:
 * - Add new Google Ads account
 * - Edit existing account
 * - Customer ID validation (10 digits)
 * - Currency and timezone selection
 * - Active/Inactive toggle
 * - Error handling
 */
export function AccountDialog({ open, account, onClose }: AccountDialogProps) {
  const isEditMode = !!account
  const toast = useToast()
  const utils = trpc.useUtils()

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    name: '',
    currency: 'USD',
    timeZone: 'America/New_York',
    isActive: true,
  })

  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens/closes or account changes
  useEffect(() => {
    if (open) {
      if (account) {
        setFormData({
          customerId: account.customerId,
          name: account.name,
          currency: account.currency || 'USD',
          timeZone: account.timeZone || 'America/New_York',
          isActive: account.isActive,
        })
      } else {
        setFormData({
          customerId: '',
          name: '',
          currency: 'USD',
          timeZone: 'America/New_York',
          isActive: true,
        })
      }
      setError(null)
    }
  }, [open, account])

  // Mutations
  const createAccount = trpc.accounts.create.useMutation({
    onSuccess: async () => {
      toast.success('Account created successfully')
      // Invalidate accounts query to trigger refetch
      await utils.accounts.list.invalidate()
      onClose()
    },
    onError: (err) => {
      setError(err.message)
      toast.error(`Failed to create account: ${err.message}`)
    },
  })

  const updateAccount = trpc.accounts.update.useMutation({
    onSuccess: async () => {
      toast.success('Account updated successfully')
      // Invalidate accounts query to trigger refetch
      await utils.accounts.list.invalidate()
      onClose()
    },
    onError: (err) => {
      setError(err.message)
      toast.error(`Failed to update account: ${err.message}`)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate customer ID format
    const customerIdRegex = /^\d{10}$/
    if (!customerIdRegex.test(formData.customerId)) {
      setError('Customer ID must be exactly 10 digits (e.g., 2766411035)')
      return
    }

    if (isEditMode && account) {
      await updateAccount.mutateAsync({
        id: account.id,
        name: formData.name,
        currency: formData.currency,
        timeZone: formData.timeZone,
        isActive: formData.isActive,
      })
    } else {
      await createAccount.mutateAsync(formData)
    }
  }

  const isLoading = createAccount.isPending || updateAccount.isPending

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isEditMode ? 'Edit Account' : 'Add New Account'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error && (
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          )}

          <TextField
            label="Customer ID"
            placeholder="2766411035"
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            required
            disabled={isEditMode} // Cannot change customer ID in edit mode
            helperText={
              isEditMode
                ? 'Customer ID cannot be changed'
                : '10-digit Google Ads customer ID (without dashes)'
            }
            inputProps={{
              pattern: '[0-9]{10}',
              maxLength: 10,
            }}
          />

          <TextField
            label="Account Name"
            placeholder="e.g., Main Campaign Account"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            helperText="A friendly name to identify this account"
          />

          <TextField
            select
            label="Currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            helperText="Account currency (informational only)"
          >
            {CURRENCIES.map((currency) => (
              <MenuItem key={currency} value={currency}>
                {currency}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Time Zone"
            value={formData.timeZone}
            onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
            helperText="Account time zone (informational only)"
          >
            {TIME_ZONES.map((tz) => (
              <MenuItem key={tz} value={tz}>
                {tz}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            }
            label="Active"
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isLoading} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
          sx={{ textTransform: 'none' }}
        >
          {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Account'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
