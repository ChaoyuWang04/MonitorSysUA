'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Box,
  Button,
  Typography,
  Stack,
  IconButton,
  Chip,
  Alert,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowParams,
} from '@mui/x-data-grid'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { AccountDialog } from '@/components/accounts/account-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { useToast } from '@/components/common/toast-provider'
import { EmptyState } from '@/components/common/empty-state'
import type { Account } from '@/server/db/schema'

/**
 * Account Management Page
 *
 * Features:
 * - View all Google Ads accounts in DataGrid
 * - Add new accounts
 * - Edit existing accounts
 * - Delete accounts (soft delete)
 * - Sync account data from Google Ads
 * - Real-time status indicators
 */
export default function AccountsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null)

  const toast = useToast()
  const utils = trpc.useUtils()

  // Fetch accounts
  const { data: accounts, isLoading } = trpc.accounts.list.useQuery()

  // Mutations
  const deleteAccount = trpc.accounts.delete.useMutation({
    onSuccess: async () => {
      toast.success('Account deleted successfully')
      // Invalidate accounts query to trigger refetch
      await utils.accounts.list.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`)
    },
  })

  const handleAddAccount = useCallback(() => {
    setEditingAccount(null)
    setDialogOpen(true)
  }, [])

  const handleEditAccount = useCallback((account: Account) => {
    setEditingAccount(account)
    setDialogOpen(true)
  }, [])

  const handleDeleteAccount = useCallback((id: number) => {
    setAccountToDelete(id)
    setConfirmDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (accountToDelete) {
      await deleteAccount.mutateAsync({ id: accountToDelete })
      setConfirmDialogOpen(false)
      setAccountToDelete(null)
    }
  }, [accountToDelete, deleteAccount])

  const handleCancelDelete = useCallback(() => {
    setConfirmDialogOpen(false)
    setAccountToDelete(null)
  }, [])

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false)
    setEditingAccount(null)
    // Query invalidation is now handled by the mutations in AccountDialog
  }, [])

  // DataGrid columns (memoized to prevent unnecessary re-renders)
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Account Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'customerId',
      headerName: 'Customer ID',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            backgroundColor: 'action.hover',
          }}
        />
      ),
    },
    {
      field: 'currency',
      headerName: 'Currency',
      width: 100,
    },
    {
      field: 'timeZone',
      headerName: 'Time Zone',
      width: 180,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={params.value ? <ActiveIcon /> : <InactiveIcon />}
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'lastSyncedAt',
      headerName: 'Last Synced',
      width: 200,
      renderCell: (params) => {
        if (!params.value) {
          return (
            <Typography variant="caption" color="warning.main">
              Not synced yet
            </Typography>
          )
        }
        return (
          <Typography variant="caption" color="text.secondary">
            {new Date(params.value).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        )
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      renderCell: (params) => (
        <Typography variant="caption" color="text.secondary">
          {new Date(params.value).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEditAccount(params.row as Account)}
          showInMenu={false}
          key="edit"
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDeleteAccount(params.row.id)}
          showInMenu={false}
          key="delete"
        />,
      ],
    },
  ], [handleEditAccount, handleDeleteAccount])

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              Account Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your Google Ads accounts and sync data
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddAccount}
            sx={{ textTransform: 'none' }}
          >
            Add Account
          </Button>
        </Stack>
      </Box>

      {/* Info Alert */}
      <Box sx={{ px: 3, pt: 2 }}>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>MCC Account:</strong> All accounts are managed via MCC {process.env.NEXT_PUBLIC_MCC_ID || '753-758-1501'}
          </Typography>
        </Alert>
      </Box>

      {/* DataGrid */}
      <Box sx={{ flex: 1, px: 3, pb: 3 }}>
        <DataGrid
          rows={accounts ?? []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          slots={{
            noRowsOverlay: () => (
              <EmptyState
                icon={AccountIcon}
                title="No accounts found"
                description="Add your first Google Ads account to start monitoring change events. All accounts will be managed via your MCC account."
                actionLabel="Add Account"
                onAction={handleAddAccount}
              />
            ),
          }}
          sx={{
            backgroundColor: 'background.paper',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Box>

      {/* Add/Edit Dialog */}
      <AccountDialog
        open={dialogOpen}
        account={editingAccount}
        onClose={handleDialogClose}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        title="Delete Account"
        message="Are you sure you want to delete this account? This will also delete all associated change events. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  )
}
