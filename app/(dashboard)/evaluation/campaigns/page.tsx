'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Alert,
  TextField,
  MenuItem,
  LinearProgress,
  Paper,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowParams,
} from '@mui/x-data-grid'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { useAccount } from '@/lib/contexts/account-context'
import { EmptyState } from '@/components/common/empty-state'
import { Assessment as AssessmentIcon } from '@mui/icons-material'
import { StatusChip } from '@/components/evaluation/status-chip'
import { CampaignEvaluationDialog } from '@/components/evaluation/campaign-evaluation-dialog'
import {
  formatAchievementRate,
  formatDate,
  getCampaignStatusLabel,
  getRecommendationLabel,
} from '@/lib/utils/evaluation'
import { CampaignStatus, type CampaignEvaluation } from '@/lib/types/evaluation'

/**
 * Campaign Evaluation List Page
 *
 * Features:
 * - View all campaign evaluations for selected account
 * - Filter by status, date range, campaign name
 * - Server-side pagination
 * - Click row to view detailed evaluation report
 * - Action recommendations with execution capability
 */
export default function CampaignEvaluationPage() {
  const { selectedAccountId } = useAccount()

  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })

  // Filter state
  const [filters, setFilters] = useState({
    status: '',
    searchQuery: '',
  })

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignEvaluation | null>(null)

  // Fetch campaign evaluations
  const { data, isLoading, refetch } = trpc.evaluation.getCampaignEvaluations.useQuery(
    {
      accountId: selectedAccountId!,
      page: paginationModel.page + 1, // MUI uses 0-indexed, backend uses 1-indexed
      pageSize: paginationModel.pageSize,
      status: filters.status || undefined,
      searchQuery: filters.searchQuery || undefined,
    },
    {
      enabled: !!selectedAccountId,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  )

  const handleRowClick = (params: GridRowParams) => {
    setSelectedCampaign(params.row as CampaignEvaluation)
    setDetailDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDetailDialogOpen(false)
    setSelectedCampaign(null)
  }

  const handleRefresh = () => {
    refetch()
  }

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'campaignName',
      headerName: 'Campaign Name',
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
          {params.value || params.row.campaignId}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <StatusChip
          status={params.value}
          label={getCampaignStatusLabel(params.value)}
        />
      ),
    },
    {
      field: 'minAchievementRate',
      headerName: 'Achievement Rate',
      width: 180,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        const rate = params.value
        if (rate === null || rate === undefined) return 'N/A'

        // Convert to number (Drizzle decimal returns string)
        const numRate = typeof rate === 'string' ? parseFloat(rate) : rate
        if (isNaN(numRate)) return 'N/A'

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(numRate, 150)} // Cap at 150% for visual purposes
              sx={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor:
                    numRate >= 110
                      ? 'success.main'
                      : numRate >= 100
                      ? 'info.main'
                      : numRate >= 85
                      ? 'warning.main'
                      : numRate >= 60
                      ? 'warning.dark'
                      : 'error.main',
                },
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                minWidth: '60px',
                textAlign: 'right',
                color:
                  numRate >= 110
                    ? 'success.main'
                    : numRate >= 100
                    ? 'info.main'
                    : numRate >= 85
                    ? 'warning.main'
                    : numRate >= 60
                    ? 'warning.dark'
                    : 'error.main',
              }}
            >
              {formatAchievementRate(rate)}
            </Typography>
          </Box>
        )
      },
    },
    {
      field: 'recommendationType',
      headerName: 'Recommendation',
      width: 180,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: 'text.secondary',
          }}
        >
          {getRecommendationLabel(params.value)}
        </Typography>
      ),
    },
    {
      field: 'evaluationDate',
      headerName: 'Evaluation Date',
      width: 140,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'campaignType',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Typography
          variant="caption"
          sx={{
            textTransform: 'uppercase',
            fontWeight: 600,
            color: params.value === 'test' ? 'info.main' : 'text.secondary',
          }}
        >
          {params.value || 'N/A'}
        </Typography>
      ),
    },
  ]

  // No account selected
  if (!selectedAccountId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Campaign Evaluation
        </Typography>
        <Alert severity="info" variant="outlined">
          Please select an account from the sidebar to view campaign evaluations.
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
            Campaign Evaluation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor campaign performance against baseline metrics (ROAS7 & RET7)
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
            label="Status"
            select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value={CampaignStatus.EXCELLENT}>Excellent (≥110%)</MenuItem>
            <MenuItem value={CampaignStatus.HEALTHY}>Healthy (100-110%)</MenuItem>
            <MenuItem value={CampaignStatus.OBSERVATION}>Observation (85-100%)</MenuItem>
            <MenuItem value={CampaignStatus.WARNING}>Warning (60-85%)</MenuItem>
            <MenuItem value={CampaignStatus.DANGER}>Danger (&lt;60%)</MenuItem>
          </TextField>

          <TextField
            size="small"
            label="Search Campaign"
            placeholder="Search by campaign name or ID..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            sx={{ flex: 1 }}
          />
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
          }}
          slots={{
            noRowsOverlay: () => (
              <EmptyState
                icon={AssessmentIcon}
                title="No Evaluations Found"
                description="No campaign evaluations are available for this account yet."
                actionLabel="Refresh"
                onAction={handleRefresh}
              />
            ),
          }}
        />
      </Paper>

      {/* Detail Dialog */}
      {selectedCampaign && (
        <CampaignEvaluationDialog
          open={detailDialogOpen}
          onClose={handleCloseDialog}
          evaluation={selectedCampaign}
          onRefresh={refetch}
        />
      )}
    </Box>
  )
}
