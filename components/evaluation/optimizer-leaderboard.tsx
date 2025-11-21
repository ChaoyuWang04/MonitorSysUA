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
        key={optimizer.optimizer_email}
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
                    {optimizer.optimizer_email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {optimizer.total_operations} operations
                  </Typography>
                </Box>
                <Chip
                  label={`Min Rate: ${optimizer.avg_min_achievement.toFixed(1)}%`}
                  color={
                    optimizer.avg_min_achievement >= 110
                      ? 'success'
                      : optimizer.avg_min_achievement >= 100
                        ? 'info'
                        : 'default'
                  }
                  sx={{ fontWeight: 700, fontSize: '0.875rem' }}
                />
              </Stack>

              {/* Achievement Rates Breakdown */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mt: 1 }}>
                {/* ROAS Achievement */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <TrendingUpIcon fontSize="small" color="primary" />
                    <Typography variant="caption" color="text.secondary">
                      ROAS7
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {optimizer.avg_roas_achievement.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(optimizer.avg_roas_achievement, 150)}
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
                </Box>

                {/* RET Achievement */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <SpeedIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="text.secondary">
                      RET7
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {optimizer.avg_ret_achievement.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(optimizer.avg_ret_achievement, 150)}
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
                </Box>

                {/* Min Achievement */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <SecurityIcon fontSize="small" color="warning" />
                    <Typography variant="caption" color="text.secondary">
                      Min Rate
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {optimizer.avg_min_achievement.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(optimizer.avg_min_achievement, 150)}
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
                </Box>
              </Box>

              {/* Performance Stats */}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Excellent Rate
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: optimizer.excellent_rate >= 0.5 ? 'success.main' : 'text.primary',
                    }}
                  >
                    {formatPercentage(optimizer.excellent_rate)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Good Rate
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatPercentage(optimizer.good_rate)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Failed Rate
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: optimizer.failed_rate >= 0.2 ? 'error.main' : 'text.primary',
                    }}
                  >
                    {formatPercentage(optimizer.failed_rate)}
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
      {!isLoading && (!data?.leaderboard || data.leaderboard.length === 0) && (
        <EmptyState
          icon={TrophyIcon}
          title="No Optimizer Data"
          description="No optimizer performance data available for the selected time range."
        />
      )}

      {/* Leaderboard */}
      {!isLoading && data?.leaderboard && data.leaderboard.length > 0 && (
        <Stack spacing={2}>
          {/* Top Performer Alert */}
          {data.leaderboard.length > 0 && data.leaderboard[0].avg_min_achievement >= 110 && (
            <Alert severity="success" icon={<TrophyIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
                Top Performer: {data.leaderboard[0].optimizer_email}
              </Typography>
              <Typography variant="caption">
                Achieved an outstanding minimum achievement rate of {data.leaderboard[0].avg_min_achievement.toFixed(1)}% with{' '}
                {data.leaderboard[0].total_operations} operations. Excellent rate: {formatPercentage(data.leaderboard[0].excellent_rate)}
              </Typography>
            </Alert>
          )}

          {/* Optimizer Cards */}
          {data.leaderboard.map((optimizer, index) => renderOptimizerCard(optimizer, index))}
        </Stack>
      )}
    </Box>
  )
}
