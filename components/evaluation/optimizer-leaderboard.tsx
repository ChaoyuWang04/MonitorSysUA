'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Stack,
  Avatar,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  MenuItem,
  LinearProgress,
  Alert,
} from '@mui/material'
import {
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
} from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { useAccount } from '@/lib/contexts/account-context'
import { EmptyState } from '@/components/common/empty-state'
import { formatPercentage } from '@/lib/utils/evaluation'
import { type OptimizerScore } from '@/lib/types/evaluation'

/**
 * Optimizer Leaderboard Component
 *
 * Features:
 * - Rank optimizers by average performance scores
 * - Filter by time range (7 days, 30 days, all time)
 * - Display top 3 with podium styling
 * - Show detailed metrics for each optimizer
 * - Medal icons for top performers
 */
export function OptimizerLeaderboard() {
  const { selectedAccountId } = useAccount()

  // Time range filter
  const [timeRange, setTimeRange] = useState('30')

  // Fetch optimizer leaderboard
  const { data, isLoading } = trpc.evaluation.getOptimizerLeaderboard.useQuery(
    {
      accountId: selectedAccountId!,
      days: parseInt(timeRange),
    },
    {
      enabled: !!selectedAccountId,
      staleTime: 5 * 60 * 1000,
    }
  )

  const getMedalColor = (rank: number): string => {
    if (rank === 1) return '#FFD700' // Gold
    if (rank === 2) return '#C0C0C0' // Silver
    if (rank === 3) return '#CD7F32' // Bronze
    return 'transparent'
  }

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `${rank}`
  }

  const renderOptimizerCard = (optimizer: OptimizerScore, index: number) => {
    const rank = index + 1
    const isTopThree = rank <= 3

    return (
      <Card
        key={optimizer.optimizerId}
        elevation={isTopThree ? 3 : 0}
        sx={{
          border: isTopThree ? 3 : 1,
          borderColor: isTopThree ? getMedalColor(rank) : 'divider',
          bgcolor: isTopThree ? 'grey.50' : 'background.paper',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            {/* Rank/Medal */}
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: isTopThree ? getMedalColor(rank) : 'grey.300',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: isTopThree ? '#000' : '#fff',
                border: isTopThree ? '3px solid' : 'none',
                borderColor: isTopThree ? getMedalColor(rank) : 'transparent',
                boxShadow: isTopThree ? 3 : 0,
              }}
            >
              {isTopThree ? getMedalEmoji(rank) : rank}
            </Avatar>

            {/* Optimizer Info */}
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {optimizer.optimizerName || optimizer.optimizerId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {optimizer.totalOperations} operations • {optimizer.totalDays} days active
                  </Typography>
                </Box>
                <Chip
                  label={`Score: ${optimizer.avgTotalScore?.toFixed(1) || 'N/A'}`}
                  color={
                    (optimizer.avgTotalScore || 0) >= 90
                      ? 'success'
                      : (optimizer.avgTotalScore || 0) >= 70
                        ? 'info'
                        : 'default'
                  }
                  sx={{ fontWeight: 700, fontSize: '0.875rem' }}
                />
              </Stack>

              {/* Score Breakdown */}
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Decision Quality */}
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <TrendingUpIcon fontSize="small" color="primary" />
                    <Typography variant="caption" color="text.secondary">
                      Decision Quality
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {optimizer.avgDecisionQuality?.toFixed(1) || 'N/A'}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={optimizer.avgDecisionQuality || 0}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'primary.main',
                        borderRadius: 1,
                      },
                    }}
                  />
                </Grid>

                {/* Execution Efficiency */}
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <SpeedIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="text.secondary">
                      Execution
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {optimizer.avgExecutionEfficiency?.toFixed(1) || 'N/A'}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={optimizer.avgExecutionEfficiency || 0}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'success.main',
                        borderRadius: 1,
                      },
                    }}
                  />
                </Grid>

                {/* Risk Management */}
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <SecurityIcon fontSize="small" color="warning" />
                    <Typography variant="caption" color="text.secondary">
                      Risk Mgmt
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {optimizer.avgRiskManagement?.toFixed(1) || 'N/A'}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={optimizer.avgRiskManagement || 0}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'warning.main',
                        borderRadius: 1,
                      },
                    }}
                  />
                </Grid>
              </Grid>

              {/* Performance Stats */}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Success Rate
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: (optimizer.successRate || 0) >= 95 ? 'success.main' : 'text.primary',
                    }}
                  >
                    {formatPercentage(optimizer.successRate)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Avg Response Time
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {optimizer.avgResponseTime?.toFixed(2)}s
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Actions
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {optimizer.totalActions}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      {/* Filter Controls */}
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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Optimizer Rankings
          </Typography>
          <TextField
            size="small"
            label="Time Range"
            select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="7">Last 7 Days</MenuItem>
            <MenuItem value="30">Last 30 Days</MenuItem>
            <MenuItem value="90">Last 90 Days</MenuItem>
            <MenuItem value="0">All Time</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>Loading leaderboard...</Typography>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && (!data || data.length === 0) && (
        <EmptyState
          icon={TrophyIcon}
          title="No Optimizer Data"
          description="No optimizer performance data available for the selected time range."
        />
      )}

      {/* Leaderboard */}
      {!isLoading && data && data.length > 0 && (
        <Stack spacing={2}>
          {/* Top Performer Alert */}
          {data.length > 0 && data[0].avgTotalScore && data[0].avgTotalScore >= 90 && (
            <Alert severity="success" icon={<TrophyIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
                Top Performer: {data[0].optimizerName || data[0].optimizerId}
              </Typography>
              <Typography variant="caption">
                Achieved an outstanding average score of {data[0].avgTotalScore.toFixed(1)} over{' '}
                {data[0].totalDays} days with {data[0].totalOperations} operations.
              </Typography>
            </Alert>
          )}

          {/* Optimizer Cards */}
          {data.map((optimizer, index) => renderOptimizerCard(optimizer, index))}
        </Stack>
      )}
    </Box>
  )
}
