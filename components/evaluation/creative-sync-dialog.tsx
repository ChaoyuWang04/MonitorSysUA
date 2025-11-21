'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
  CircularProgress,
  Autocomplete,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { mockCreativeSync } from '@/lib/services/mock-execution'

interface CreativeSyncDialogProps {
  open: boolean
  onClose: () => void
  creativeId: string
  sourceCampaignId: string
  onSuccess: () => void
}

interface MatureCampaign {
  id: string
  name: string
  dailyBudget: number
  status: string
}

/**
 * Creative Sync Dialog
 *
 * Allows users to sync an excellent creative to multiple mature campaigns.
 * Features:
 * - Multi-select mature campaigns with Autocomplete
 * - Preview of selected campaigns
 * - Mock sync execution
 * - Success/error feedback
 *
 * Phase B TODO: Replace mock data with tRPC query:
 * const { data: matureCampaigns } = trpc.evaluation.getMatureCampaigns.useQuery({
 *   accountId: selectedAccountId,
 *   excludeCampaignId: sourceCampaignId,
 * })
 */
export function CreativeSyncDialog({
  open,
  onClose,
  creativeId,
  sourceCampaignId,
  onSuccess,
}: CreativeSyncDialogProps) {
  const [selectedCampaigns, setSelectedCampaigns] = useState<MatureCampaign[]>([])
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Mock mature campaigns data
  // In Phase B, this will be fetched from tRPC endpoint: trpc.evaluation.getMatureCampaigns.useQuery()
  const matureCampaigns: MatureCampaign[] = [
    { id: 'camp_mature_001', name: 'Mature Campaign A - iOS US', dailyBudget: 5000, status: 'Active' },
    { id: 'camp_mature_002', name: 'Mature Campaign B - Android US', dailyBudget: 4500, status: 'Active' },
    { id: 'camp_mature_003', name: 'Mature Campaign C - iOS UK', dailyBudget: 3000, status: 'Active' },
    { id: 'camp_mature_004', name: 'Mature Campaign D - Android UK', dailyBudget: 2800, status: 'Active' },
    { id: 'camp_mature_005', name: 'Mature Campaign E - iOS CA', dailyBudget: 2500, status: 'Active' },
    { id: 'camp_mature_006', name: 'Mature Campaign F - Android CA', dailyBudget: 2200, status: 'Active' },
  ]

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCampaigns([])
      setExecutionResult(null)
    }
  }, [open])

  const handleSync = async () => {
    if (selectedCampaigns.length === 0) {
      setExecutionResult({
        success: false,
        message: 'Please select at least one mature campaign',
      })
      return
    }

    setExecuting(true)
    setExecutionResult(null)

    try {
      const targetCampaignIds = selectedCampaigns.map((c) => c.id)
      const result = await mockCreativeSync(creativeId, sourceCampaignId, targetCampaignIds)

      if (!result.success) {
        setExecutionResult({
          success: false,
          message: result.error || 'Sync failed',
        })
        setExecuting(false)
        return
      }

      // Success
      setExecutionResult({
        success: true,
        message: result.message || 'Creative synced successfully',
      })

      // Close dialog and refresh after delay
      setTimeout(() => {
        setExecuting(false)
        onSuccess()
      }, 1500)
    } catch (error) {
      setExecutionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      })
      setExecuting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Sync Creative to Mature Campaigns
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Creative ID: {creativeId}
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3 }}>
        {/* Info Alert */}
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
            About Creative Syncing
          </Typography>
          <Typography variant="caption">
            This creative has proven excellent performance in the test campaign. Syncing it to mature
            campaigns can help scale up impressions and conversions. Select target campaigns below.
          </Typography>
        </Alert>

        {/* Mock Mode Notice */}
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="caption">
            <strong>Mock Mode:</strong> Sync will be simulated. No real changes will be made to Google Ads.
          </Typography>
        </Alert>

        {/* Campaign Selection */}
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Select Mature Campaigns:
        </Typography>

        <Autocomplete
          multiple
          options={matureCampaigns}
          getOptionLabel={(option) => option.name}
          value={selectedCampaigns}
          onChange={(_, newValue) => setSelectedCampaigns(newValue)}
          disabled={executing || executionResult?.success === true}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search and select campaigns..."
              size="small"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index })
              return (
                <Chip
                  label={option.name}
                  size="small"
                  {...tagProps}
                  key={key}
                />
              )
            })
          }
          sx={{ mb: 3 }}
        />

        {/* Selected Campaigns Preview */}
        {selectedCampaigns.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Selected Campaigns ({selectedCampaigns.length}):
            </Typography>
            <List
              disablePadding
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {selectedCampaigns.map((campaign) => (
                <ListItem
                  key={campaign.id}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {campaign.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        Daily Budget: ${campaign.dailyBudget.toLocaleString()} • {campaign.status}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Execution Result */}
        {executionResult && (
          <Alert
            severity={executionResult.success ? 'success' : 'error'}
            icon={executionResult.success ? <CheckCircleIcon /> : undefined}
            sx={{ mt: 3 }}
          >
            {executionResult.message}
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={executing}>
          {executionResult?.success ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleSync}
          disabled={executing || executionResult?.success === true || selectedCampaigns.length === 0}
          startIcon={executing ? <CircularProgress size={16} /> : null}
        >
          {executing ? 'Syncing...' : 'Sync Creative'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
