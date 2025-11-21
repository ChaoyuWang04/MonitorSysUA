'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Alert,
  TextField,
  MenuItem,
  Paper,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowParams,
} from '@mui/x-data-grid'
import { Image as ImageIcon } from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { useAccount } from '@/lib/contexts/account-context'
import { EmptyState } from '@/components/common/empty-state'
import { CreativeStatusBadge } from '@/components/evaluation/creative-status-badge'
import { CreativeEvaluationDialog } from '@/components/evaluation/creative-evaluation-dialog'
import {
  formatCPI,
  formatPercentage,
  formatCVR,
  formatDate,
  getEvaluationDayLabel,
} from '@/lib/utils/evaluation'
import { CreativeStatus, EvaluationDay, type CreativeEvaluation } from '@/lib/types/evaluation'

/**
 * Creative Evaluation List Page
 *
 * Features:
 * - View all creative evaluations for test campaigns
 * - Filter by campaign, status, evaluation day (D3/D7)
 * - Server-side pagination
 * - Highlight excellent creatives (high CVR)
 * - Click row to view detailed evaluation and sync options
 */
export default function CreativeEvaluationPage() {
  const { selectedAccountId } = useAccount()

  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })

  // Filter state
  const [filters, setFilters] = useState({
    campaignId: '',
    status: '',
    evaluationDay: '',
  })

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedCreative, setSelectedCreative] = useState<CreativeEvaluation | null>(null)

  // Fetch creative evaluations
  const { data, isLoading, refetch } = trpc.evaluation.getCreativeEvaluations.useQuery(
    {
      accountId: selectedAccountId!,
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      campaignId: filters.campaignId || undefined,
      status: filters.status || undefined,
      evaluationDay: filters.evaluationDay || undefined,
    },
    {
      enabled: !!selectedAccountId,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  )

  const handleRowClick = (params: GridRowParams) => {
    setSelectedCreative(params.row as CreativeEvaluation)
    setDetailDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDetailDialogOpen(false)
    setSelectedCreative(null)
  }

  const handleRefresh = () => {
    refetch()
  }

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'creativeName',
      headerName: 'Creative Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {params.value || params.row.creativeId}
        </Typography>
      ),
    },
    {
      field: 'campaignId',
      headerName: 'Campaign ID',
      width: 150,
      renderCell: (params) => (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'creativeStatus',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <CreativeStatusBadge status={params.value} />
      ),
    },
    {
      field: 'evaluationDay',
      headerName: 'Day',
      width: 80,
      renderCell: (params) => (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: params.value === 'D7' ? 'primary.main' : 'text.secondary',
          }}
        >
          {getEvaluationDayLabel(params.value)}
        </Typography>
      ),
    },
    {
      field: 'cvr',
      headerName: 'CVR',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: params.value >= 0.0067 ? 700 : 400, // Highlight excellent CVR
            color: params.value >= 0.0067 ? 'success.main' : 'text.primary',
          }}
        >
          {formatCVR(params.value)}
        </Typography>
      ),
    },
    {
      field: 'actualCpi',
      headerName: 'CPI',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCPI(value),
    },
    {
      field: 'actualRoas',
      headerName: 'ROAS',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatPercentage(value),
    },
    {
      field: 'evaluationDate',
      headerName: 'Evaluation Date',
      width: 140,
      valueFormatter: (value) => formatDate(value),
    },
  ]

  // No account selected
  if (!selectedAccountId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Creative Evaluation
        </Typography>
        <Alert severity="info" variant="outlined">
          Please select an account from the sidebar to view creative evaluations.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      {/* Page Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
            Creative Evaluation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Test campaign creatives evaluated at D3 and D7 (CPI, ROAS, CVR)
          </Typography>
        </Box>
      </Stack>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            label="Campaign ID"
            placeholder="Filter by campaign ID..."
            value={filters.campaignId}
            onChange={(e) => setFilters({ ...filters, campaignId: e.target.value })}
            sx={{ minWidth: 200 }}
          />

          <TextField
            size="small"
            label="Status"
            select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value={CreativeStatus.TESTING}>Testing</MenuItem>
            <MenuItem value={CreativeStatus.PASSED}>Passed</MenuItem>
            <MenuItem value={CreativeStatus.FAILED}>Failed</MenuItem>
            <MenuItem value={CreativeStatus.EXCELLENT}>Excellent ⭐</MenuItem>
            <MenuItem value={CreativeStatus.SYNCED}>Synced</MenuItem>
          </TextField>

          <TextField
            size="small"
            label="Evaluation Day"
            select
            value={filters.evaluationDay}
            onChange={(e) => setFilters({ ...filters, evaluationDay: e.target.value })}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Days</MenuItem>
            <MenuItem value={EvaluationDay.D3}>D3</MenuItem>
            <MenuItem value={EvaluationDay.D7}>D7</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {/* Data Grid */}
      <Paper
        elevation={0}
        sx={{
          height: 600,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
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
          getRowClassName={(params) => {
            // Highlight excellent creatives
            if (params.row.creativeStatus === CreativeStatus.EXCELLENT) {
              return 'excellent-row'
            }
            // Gray out failed creatives
            if (params.row.creativeStatus === CreativeStatus.FAILED) {
              return 'failed-row'
            }
            return ''
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            },
            '& .excellent-row': {
              bgcolor: 'success.lighter',
              '&:hover': {
                bgcolor: 'success.light',
              },
            },
            '& .failed-row': {
              opacity: 0.6,
            },
          }}
          slots={{
            noRowsOverlay: () => (
              <EmptyState
                icon={ImageIcon}
                title="No Creative Evaluations Found"
                description="No creative evaluations are available for test campaigns yet."
                actionLabel="Refresh"
                onAction={handleRefresh}
              />
            ),
          }}
        />
      </Paper>

      {/* Detail Dialog */}
      {selectedCreative && (
        <CreativeEvaluationDialog
          open={detailDialogOpen}
          onClose={handleCloseDialog}
          evaluation={selectedCreative}
          onRefresh={refetch}
        />
      )}
    </Box>
  )
}
