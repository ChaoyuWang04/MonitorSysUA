import { Chip } from '@mui/material'
import {
  getCreativeStatusColor,
  getCreativeStatusLabel,
  getCreativeStatusIcon,
} from '@/lib/utils/evaluation'
import type { CreativeStatus } from '@/lib/types/evaluation'

interface CreativeStatusBadgeProps {
  status: CreativeStatus | null | undefined
  size?: 'small' | 'medium'
}

/**
 * CreativeStatusBadge Component
 *
 * Displays a colored chip for creative status with emoji icon
 * - Testing: 🔄 Blue
 * - Passed: ✅ Green
 * - Failed: ❌ Red
 * - Excellent: ⭐ Green
 * - Pending: ⏳ Orange
 * - Synced: 🔗 Blue
 */
export function CreativeStatusBadge({ status, size = 'small' }: CreativeStatusBadgeProps) {
  const color = getCreativeStatusColor(status)
  const label = getCreativeStatusLabel(status)
  const icon = getCreativeStatusIcon(status)

  return (
    <Chip
      label={`${icon} ${label}`}
      color={color}
      size={size}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  )
}
