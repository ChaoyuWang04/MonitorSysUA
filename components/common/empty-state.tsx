'use client'

import { Box, Typography, Button, Stack } from '@mui/material'
import { SvgIconComponent } from '@mui/icons-material'

export interface EmptyStateProps {
  icon?: SvgIconComponent
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Stack spacing={3} alignItems="center" maxWidth={400}>
        {Icon && (
          <Icon
            sx={{
              fontSize: 80,
              color: 'action.disabled',
              opacity: 0.5,
            }}
          />
        )}
        <Box>
          <Typography variant="h6" color="text.primary" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {actionLabel && onAction && (
          <Button variant="contained" onClick={onAction} sx={{ mt: 2 }}>
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Box>
  )
}
