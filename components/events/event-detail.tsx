'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  Paper,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material'
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Label as LabelIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import type { ChangeEvent } from '@/server/db/schema'

/**
 * Format field value for display, including special handling for Micros fields
 */
function formatFieldValue(fieldName: string, value: any): string {
  if (value === null || value === undefined) {
    return '(null)'
  }

  // Handle Micros fields (monetary values)
  if (typeof fieldName === 'string' && fieldName.toLowerCase().includes('micros') && typeof value === 'number') {
    const amount = value / 1_000_000
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${value} micros)`
  }

  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

interface EventDetailDialogProps {
  event: ChangeEvent | null
  open: boolean
  onClose: () => void
}

export function EventDetailDialog({ event, open, onClose }: EventDetailDialogProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  if (!event) return null

  const fieldChanges = event.fieldChanges as Record<string, { old: any; new: any }> | null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Event Details
        <Chip
          label={event.operationType}
          color={
            event.operationType === 'CREATE'
              ? 'success'
              : event.operationType === 'UPDATE'
              ? 'primary'
              : 'error'
          }
          size="small"
        />
      </DialogTitle>

      <DialogContent dividers>
        {/* Basic Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Basic Information
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2">
                <strong>User:</strong> {event.userEmail}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="body2">
                <strong>Time:</strong>{' '}
                {new Date(event.timestamp).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LabelIcon fontSize="small" color="action" />
              <Typography variant="body2" component="span">
                <strong>Resource Type:</strong>
              </Typography>
              <Chip
                label={event.resourceType.replace(/_/g, ' ')}
                size="small"
                variant="outlined"
              />
            </Box>
            {event.clientType && (
              <Typography variant="body2">
                <strong>Client Type:</strong> {event.clientType}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Resource Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Resource Information
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-all' }}>
            <strong>Resource Name:</strong> {event.resourceName}
          </Typography>
          {event.campaign && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Campaign:</strong> {event.campaign}
            </Typography>
          )}
          {event.adGroup && (
            <Typography variant="body2">
              <strong>Ad Group:</strong> {event.adGroup}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            摘要
          </Typography>
          <Alert severity="info" icon={false}>
            {event.summaryZh || event.summary}
          </Alert>

          {/* Collapsible Technical Details */}
          {event.summaryZh && event.summary && (
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      transform: showTechnicalDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                }
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                技术详情
              </Button>
              <Collapse in={showTechnicalDetails}>
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }}
                >
                  {event.summary}
                </Box>
              </Collapse>
            </Box>
          )}
        </Box>

        {/* Field Changes */}
        {fieldChanges && Object.keys(fieldChanges).length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Field Changes ({Object.keys(fieldChanges).length})
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {Object.entries(fieldChanges).map(([field, change]) => (
                  <Paper
                    key={field}
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: 'grey.50',
                      border: '1px solid',
                      borderColor: 'grey.200',
                    }}
                  >
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      {field}
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Old Value:
                        </Typography>
                        <Box
                          sx={{
                            mt: 0.5,
                            p: 1,
                            bgcolor: 'error.50',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            wordBreak: 'break-all',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {formatFieldValue(field, change.old)}
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          New Value:
                        </Typography>
                        <Box
                          sx={{
                            mt: 0.5,
                            p: 1,
                            bgcolor: 'success.50',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            wordBreak: 'break-all',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {formatFieldValue(field, change.new)}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          </>
        )}

        {/* Changed Fields Paths */}
        {event.changedFieldsPaths && event.changedFieldsPaths.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Changed Field Paths
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {event.changedFieldsPaths.map((path) => (
                  <Chip key={path} label={path} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
