import { Chip } from '@mui/material'
import { getCampaignStatusColor } from '@/lib/utils/evaluation'
import type { CampaignStatus, CreativeStatus } from '@/lib/types/evaluation'

interface StatusChipProps {
  status: CampaignStatus | CreativeStatus | null | undefined
  label: string
  size?: 'small' | 'medium'
}

/**
 * StatusChip Component
 *
 * Displays a colored chip for campaign or creative status
 * Colors are automatically determined based on status value
 */
export function StatusChip({ status, label, size = 'small' }: StatusChipProps) {
  const color = getCampaignStatusColor(status as CampaignStatus)

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  )
}
