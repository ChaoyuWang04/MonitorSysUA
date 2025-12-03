'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Alert,
  TextField,
  Paper,
  Tabs,
  Tab,
  Button,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowParams,
} from '@mui/x-data-grid'
import { Speed as SpeedIcon } from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { useAccount } from '@/lib/contexts/account-context'
import { EmptyState } from '@/components/common/empty-state'
import { OperationScoreDialog } from '@/components/evaluation/operation-score-dialog'
import { OptimizerLeaderboard } from '@/components/evaluation/optimizer-leaderboard'
import {
  formatPercentage,
  formatDate,
  getOperationStatusLabel,
  getOperationStatusColor,
} from '@/lib/utils/evaluation'
import { OperationStatus, type OperationScore } from '@/lib/types/evaluation'

/**
 * Operation Scores Page
 *
 * Features:
 * - View daily operation execution scores for all optimizers
 * - Filter by optimizer, date range, status
 * - Server-side pagination
 * - Two tabs: Operation Scores List and Optimizer Leaderboard
 * - Click row to view detailed daily operation report
 */
export default function OperationScoresPage() {
  const { selectedAccountId } = useAccount()

  // Tab state
  const [activeTab, setActiveTab] = useState(0)

  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  })

  // Filter state
  const [filters, setFilters] = useState({
    optimizerEmail: '',
    campaignId: '',
  })

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<OperationScore | null>(null)

  // Fetch operation scores
  const { data, isLoading, refetch } = trpc.evaluation.getOperationScores.useQuery(
    {
      accountId: selectedAccountId!,
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      optimizerEmail: filters.optimizerEmail || undefined,
      campaignId: filters.campaignId || undefined,
    },
    {
      enabled: !!selectedAccountId && activeTab === 0,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  )

  const recalcMutation = trpc.evaluation.recalculateOperationScores.useMutation({
    onSuccess: () => refetch(),
  })

  const handleRowClick = (params: GridRowParams) => {
    setSelectedOperation(params.row as OperationScore)
    setDetailDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDetailDialogOpen(false)
    setSelectedOperation(null)
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleRecalculate = () => {
    recalcMutation.mutate({})
  }

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'evaluationDate',
      headerName: 'Date',
      width: 120,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 't1Score',
      headerName: 'T+1',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        const val = (params as { value?: number | null })?.value
        return val !== null && val !== undefined ? Number(val).toFixed(1) : '—'
      },
    },
    {
      field: 't3Score',
      headerName: 'T+3',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        const val = (params as { value?: number | null })?.value
        return val !== null && val !== undefined ? Number(val).toFixed(1) : '—'
      },
    },
    {
      field: 't7Score',
      headerName: 'T+7',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        const val = (params as { value?: number | null })?.value
        return val !== null && val !== undefined ? Number(val).toFixed(1) : '—'
      },
    },
    {
      field: 'optimizerName',
      headerName: 'Optimizer',
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
          {params.value || params.row.optimizerId}
        </Typography>
      ),
    },
    {
      field: 'totalScore',
      headerName: 'Total Score',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color:
              (params.value ?? params.row.finalScore ?? params.row.baseScore) >= 90
                ? 'success.main'
                : (params.value ?? params.row.finalScore ?? params.row.baseScore) >= 70
                  ? 'info.main'
                  : 'text.primary',
          }}
        >
          {(
            params.value ?? params.row.finalScore ?? params.row.baseScore ?? null
          )?.toFixed?.(1) || 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'decisionQualityScore',
      headerName: 'Decision Quality',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        const val =
          (params as { value?: number | null; row?: any } | undefined)?.value ??
          (params as { row?: any } | undefined)?.row?.baseScore ??
          (params as { row?: any } | undefined)?.row?.finalScore

        return val !== null && val !== undefined ? Number(val).toFixed(1) : 'N/A'
      },
    },
    {
      field: 'executionEfficiencyScore',
      headerName: 'Execution',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        const val =
          (params as { value?: number | null; row?: any } | undefined)?.value ??
          (params as { row?: any } | undefined)?.row?.baseScore ??
          (params as { row?: any } | undefined)?.row?.finalScore

        return val !== null && val !== undefined ? Number(val).toFixed(1) : 'N/A'
      },
    },
    {
      field: 'riskManagementScore',
      headerName: 'Risk Mgmt',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        const val =
          (params as { value?: number | null; row?: any } | undefined)?.value ??
          (params as { row?: any } | undefined)?.row?.baseScore ??
          (params as { row?: any } | undefined)?.row?.finalScore

        return val !== null && val !== undefined ? Number(val).toFixed(1) : 'N/A'
      },
    },
    {
      field: 'actionsExecuted',
      headerName: 'Actions',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'primary.main',
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value || params.row.riskLevel
        const color = getOperationStatusColor(status)
        const label = getOperationStatusLabel(status)

        return (
          <Typography
            variant="caption"
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: `${color}.lighter`,
              color: `${color}.main`,
              fontWeight: 600,
            }}
          >
            {label}
          </Typography>
        )
      },
    },
  ]

  // No account selected
  if (!selectedAccountId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Operation Scores
        </Typography>
        <Alert severity="info" variant="outlined">
          Please select an account from the sidebar to view operation scores.
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
            Operation Scores
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Daily evaluation scores for optimizer performance and decision quality
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleRecalculate}
          disabled={recalcMutation.status === 'pending'}
        >
          {recalcMutation.status === 'pending' ? 'Recalculating…' : 'Recalculate scores'}
        </Button>
      </Stack>

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Operation Scores" />
          <Tab label="Optimizer Leaderboard" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <>
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
                label="Optimizer ID"
                placeholder="Filter by optimizer..."
                value={filters.optimizerEmail}
                onChange={(e) => setFilters({ ...filters, optimizerEmail: e.target.value })}
                sx={{ minWidth: 200 }}
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
              getRowClassName={(params) => {
                // Highlight excellent operations
                if (params.row.status === OperationStatus.EXCELLENT) {
                  return 'excellent-row'
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
              }}
              slots={{
                noRowsOverlay: () => (
                  <EmptyState
                    icon={SpeedIcon}
                    title="No Operation Scores Found"
                    description="No operation scores are available yet."
                    actionLabel="Refresh"
                    onAction={handleRefresh}
                  />
                ),
              }}
            />
          </Paper>
        </>
      )}

      {activeTab === 1 && <OptimizerLeaderboard />}

      {/* Detail Dialog */}
      {selectedOperation && (
        <OperationScoreDialog
          open={detailDialogOpen}
          onClose={handleCloseDialog}
          operation={selectedOperation}
          onRefresh={refetch}
        />
      )}
    </Box>
  )
}
