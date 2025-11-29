'use client'

/**
 * AppsFlyer Sync Status Card
 *
 * Displays the status of AppsFlyer data synchronization:
 * - Events sync status
 * - Cohort KPI sync status
 * - Baseline update status
 *
 * Shows warning if data is stale (>36 hours since last successful sync)
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Tooltip,
  IconButton,
  Chip,
  Divider,
  Stack,
} from '@mui/material'
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
  HourglassEmpty as HourglassIcon,
} from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { formatDistanceToNow } from 'date-fns'
import type { ReactElement } from 'react'

// Hours after which data is considered stale
const STALE_THRESHOLD_HOURS = 36

interface SyncLogEntry {
  id: number
  syncType: string
  status: string
  recordsProcessed: number | null
  startedAt: string | Date
  completedAt: string | Date | null
  errorMessage: string | null
  dateRangeStart: string | Date | null
  dateRangeEnd: string | Date | null
}

interface SyncStatusItemProps {
  syncType: string
  displayName: string
  log: SyncLogEntry | null
}

/**
 * Check if the sync is stale (more than threshold hours since last success)
 */
function isStale(log: SyncLogEntry | null): boolean {
  if (!log || log.status !== 'success') return true

  const completedAt = log.completedAt ? new Date(log.completedAt) : new Date(log.startedAt)
  const hoursAgo = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60)
  return hoursAgo > STALE_THRESHOLD_HOURS
}

/**
 * Get appropriate status icon and color
 */
function getStatusInfo(log: SyncLogEntry | null): {
  icon: ReactElement
  color: 'success' | 'error' | 'warning' | 'info'
  label: string
} {
  if (!log) {
    return {
      icon: <HourglassIcon fontSize="small" />,
      color: 'info',
      label: 'No sync yet',
    }
  }

  switch (log.status) {
    case 'running':
      return {
        icon: <SyncIcon fontSize="small" sx={{ animation: 'spin 1s linear infinite' }} />,
        color: 'info',
        label: 'Running',
      }
    case 'success':
      if (isStale(log)) {
        return {
          icon: <WarningIcon fontSize="small" />,
          color: 'warning',
          label: 'Stale',
        }
      }
      return {
        icon: <CheckCircleIcon fontSize="small" />,
        color: 'success',
        label: 'OK',
      }
    case 'failed':
      return {
        icon: <ErrorIcon fontSize="small" />,
        color: 'error',
        label: 'Failed',
      }
    default:
      return {
        icon: <HourglassIcon fontSize="small" />,
        color: 'info',
        label: 'Unknown',
      }
  }
}

/**
 * Single sync type status row
 */
function SyncStatusItem({ syncType, displayName, log }: SyncStatusItemProps) {
  const statusInfo = getStatusInfo(log)
  const timeAgo = log?.completedAt
    ? formatDistanceToNow(new Date(log.completedAt), { addSuffix: true })
    : log?.startedAt
    ? formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })
    : 'Never'

  const tooltipContent = log ? (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption" component="div">
        <strong>Last sync:</strong> {timeAgo}
      </Typography>
      {log.recordsProcessed !== null && (
        <Typography variant="caption" component="div">
          <strong>Records:</strong> {log.recordsProcessed.toLocaleString()}
        </Typography>
      )}
      {log.dateRangeStart && log.dateRangeEnd && (
        <Typography variant="caption" component="div">
          <strong>Range:</strong>{' '}
          {new Date(log.dateRangeStart).toLocaleDateString()} -{' '}
          {new Date(log.dateRangeEnd).toLocaleDateString()}
        </Typography>
      )}
      {log.status === 'failed' && log.errorMessage && (
        <Typography variant="caption" component="div" color="error">
          <strong>Error:</strong> {log.errorMessage.substring(0, 100)}
          {log.errorMessage.length > 100 ? '...' : ''}
        </Typography>
      )}
    </Box>
  ) : (
    'No sync data available'
  )

  return (
    <Tooltip title={tooltipContent} placement="top" arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {displayName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {timeAgo}
          </Typography>
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            size="small"
            color={statusInfo.color}
            variant="outlined"
            sx={{ minWidth: 80 }}
          />
        </Box>
      </Box>
    </Tooltip>
  )
}

/**
 * Main Sync Status Card component
 */
export function SyncStatusCard() {
  const { data, isLoading, refetch, isFetching } = trpc.appsflyer.getSyncStatus.useQuery({
    limit: 10,
  })

  // Extract latest logs by type
  const getLatestByType = (syncType: string): SyncLogEntry | null => {
    if (!data?.logs) return null
    return data.logs.find((log) => log.syncType === syncType) as SyncLogEntry | null
  }

  const eventsLog = getLatestByType('events')
  const kpiLog = getLatestByType('cohort_kpi')
  const baselineLog = getLatestByType('baseline_update')

  // Determine overall health
  const hasFailure =
    eventsLog?.status === 'failed' ||
    kpiLog?.status === 'failed' ||
    baselineLog?.status === 'failed'
  const hasStale = isStale(eventsLog) || isStale(kpiLog)
  const isRunning =
    eventsLog?.status === 'running' ||
    kpiLog?.status === 'running' ||
    baselineLog?.status === 'running'

  const overallColor = hasFailure
    ? 'error.main'
    : hasStale
    ? 'warning.main'
    : isRunning
    ? 'info.main'
    : 'success.main'

  if (isLoading) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={150} height={28} />
          </Box>
          <Skeleton variant="rectangular" height={100} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      elevation={2}
      sx={{
        position: 'relative',
        borderLeft: 4,
        borderColor: overallColor,
      }}
    >
      <CardContent>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SyncIcon sx={{ color: overallColor }} />
            <Typography variant="subtitle1" fontWeight={600}>
              AppsFlyer Sync Status
            </Typography>
          </Box>
          <Tooltip title="Refresh status">
            <IconButton
              size="small"
              onClick={() => refetch()}
              disabled={isFetching}
              sx={{
                animation: isFetching ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Status Items */}
        <Stack divider={<Divider flexItem />} spacing={0}>
          <SyncStatusItem
            syncType="events"
            displayName="Events (IAP + Ad Revenue)"
            log={eventsLog}
          />
          <SyncStatusItem
            syncType="cohort_kpi"
            displayName="Cohort KPIs"
            log={kpiLog}
          />
          <SyncStatusItem
            syncType="baseline_update"
            displayName="Baseline Update"
            log={baselineLog}
          />
        </Stack>

        {/* Warning message for stale data */}
        {hasStale && !hasFailure && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: 'warning.light',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <WarningIcon fontSize="small" color="warning" />
            <Typography variant="caption" color="warning.dark">
              Data may be outdated. Last successful sync was more than {STALE_THRESHOLD_HOURS}{' '}
              hours ago.
            </Typography>
          </Box>
        )}

        {/* Error message */}
        {hasFailure && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: 'error.light',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <ErrorIcon fontSize="small" color="error" />
            <Typography variant="caption" color="error.dark">
              Sync failure detected. Check logs with <code>just af-docker-logs</code>
            </Typography>
          </Box>
        )}

        {/* Schedule info */}
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Daily sync at 2:00 AM UTC, baseline update 1st of month at 3:00 AM UTC
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
