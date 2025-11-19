'use client'

import React, { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Stack,
  Alert,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowParams,
} from '@mui/x-data-grid'
import {
  Sync as SyncIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { useAccount } from '@/lib/contexts/account-context'
import { EventDetailDialog } from '@/components/events/event-detail'
import { EmptyState } from '@/components/common/empty-state'
import { EventNote as EventNoteIcon } from '@mui/icons-material'
import type { ChangeEvent } from '@/server/db/schema'

/**
 * Events Page
 *
 * Features:
 * - View change events for selected account
 * - Filter by user, resource type, operation type
 * - Search functionality
 * - Server-side pagination
 * - Sync new events from Google Ads
 * - Event detail view
 */
export default function EventsPage() {
  const { selectedAccountId } = useAccount()

  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })

  // Filter state
  const [filters, setFilters] = useState({
    userEmail: '',
    resourceType: '',
    operationType: '',
    search: '',
  })

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<ChangeEvent | null>(null)

  // Fetch events
  const { data, isLoading, refetch } = trpc.events.list.useQuery(
    {
      accountId: selectedAccountId!,
      page: paginationModel.page + 1, // MUI uses 0-indexed, backend uses 1-indexed
      pageSize: paginationModel.pageSize,
      ...filters,
    },
    {
      enabled: !!selectedAccountId,
    }
  )

  // Sync mutation
  const syncEvents = trpc.events.sync.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const handleSync = async () => {
    if (!selectedAccountId) return
    await syncEvents.mutateAsync({
      accountId: selectedAccountId,
      days: 7,
    })
  }

  const handleRowClick = (params: GridRowParams) => {
    setSelectedEvent(params.row as ChangeEvent)
    setDetailDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDetailDialogOpen(false)
    // Clear selected event after dialog animation completes
    setTimeout(() => setSelectedEvent(null), 200)
  }

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'Time',
      width: 180,
      renderCell: (params) => (
        <Typography variant="caption" color="text.secondary">
          {new Date(params.value).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </Typography>
      ),
    },
    {
      field: 'userEmail',
      headerName: 'User',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'operationType',
      headerName: 'Operation',
      width: 120,
      renderCell: (params) => {
        const colorMap: Record<string, 'success' | 'info' | 'error'> = {
          CREATE: 'success',
          UPDATE: 'info',
          REMOVE: 'error',
        }
        return (
          <Chip
            label={params.value}
            size="small"
            color={colorMap[params.value] || 'default'}
            variant="outlined"
          />
        )
      },
    },
    {
      field: 'resourceType',
      headerName: 'Resource Type',
      width: 180,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            backgroundColor: 'action.hover',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
          }}
        />
      ),
    },
    {
      field: 'summaryZh',
      headerName: 'Summary',
      flex: 2,
      minWidth: 300,
      renderCell: (params) => {
        // Use Chinese summary if available, fallback to English summary
        const summaryText = params.row.summaryZh || params.row.summary
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', py: 1 }}>
            <Typography variant="body2" color="text.primary">
              {summaryText}
            </Typography>
          </Box>
        )
      },
    },
    {
      field: 'clientType',
      headerName: 'Client',
      width: 100,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View details">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedEvent(params.row as ChangeEvent)
              setDetailDialogOpen(true)
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  // No account selected
  if (!selectedAccountId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" variant="outlined">
          Please select an account from the sidebar to view events.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              Change Events
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor all changes made to your Google Ads account
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={isLoading}
              sx={{ textTransform: 'none' }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={handleSync}
              disabled={syncEvents.isPending}
              sx={{ textTransform: 'none' }}
            >
              {syncEvents.isPending ? 'Syncing...' : 'Sync Events'}
            </Button>
          </Stack>
        </Stack>

        {/* Filters */}
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            sx={{ minWidth: 200 }}
          />
          <TextField
            select
            size="small"
            label="Operation Type"
            value={filters.operationType}
            onChange={(e) => setFilters({ ...filters, operationType: e.target.value })}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CREATE">CREATE</MenuItem>
            <MenuItem value="UPDATE">UPDATE</MenuItem>
            <MenuItem value="REMOVE">REMOVE</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Resource Type"
            value={filters.resourceType}
            onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CAMPAIGN_BUDGET">Campaign Budget</MenuItem>
            <MenuItem value="CAMPAIGN">Campaign</MenuItem>
            <MenuItem value="AD_GROUP">Ad Group</MenuItem>
            <MenuItem value="AD_GROUP_AD">Ad Group Ad</MenuItem>
          </TextField>
          <TextField
            size="small"
            placeholder="Filter by user email"
            value={filters.userEmail}
            onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
            sx={{ minWidth: 200 }}
          />
        </Stack>
      </Box>

      {/* DataGrid */}
      <Box sx={{ flex: 1, px: 3, pb: 3, pt: 2 }}>
        <DataGrid
          rows={data?.data || []}
          columns={columns}
          rowCount={data?.total || 0}
          loading={isLoading}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          slots={{
            noRowsOverlay: () => (
              <EmptyState
                icon={EventNoteIcon}
                title="No events found"
                description="No change events match your current filters. Try adjusting your search criteria or sync new events from Google Ads."
                actionLabel="Sync Events"
                onAction={handleSync}
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
              cursor: 'pointer',
            },
          }}
        />
      </Box>

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={detailDialogOpen}
        onClose={handleCloseDialog}
      />
    </Box>
  )
}
