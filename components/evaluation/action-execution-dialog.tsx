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
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Pause as PauseIcon,
  RemoveRedEye as ObserveIcon,
} from '@mui/icons-material'
import {  getActionTypeLabel, calculateNewValue } from '@/lib/utils/evaluation'
import { ActionType, type SelectedAction } from '@/lib/types/evaluation'
import { mockExecuteAction } from '@/lib/services/mock-execution'

interface ActionExecutionDialogProps {
  open: boolean
  onClose: () => void
  campaignId: string
  evaluationId: number
  selectedActions: SelectedAction[]
  onSuccess: () => void
}

/**
 * Action Execution Confirmation Dialog
 *
 * Shows:
 * - List of selected actions
 * - Calculated new values (budget, tROAS)
 * - Warnings for aggressive actions
 * - Mock execution simulation
 */
export function ActionExecutionDialog({
  open,
  onClose,
  campaignId,
  evaluationId,
  selectedActions,
  onSuccess,
}: ActionExecutionDialogProps) {
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Mock current values (in real scenario, fetch from backend)
  const mockCurrentBudget = 1000
  const mockCurrentTroas = 200

  const handleExecute = async () => {
    setExecuting(true)
    setExecutionResult(null)

    try {
      // Execute each action
      for (const action of selectedActions) {
        const result = await mockExecuteAction({
          campaignId,
          action,
          currentBudget: mockCurrentBudget,
          currentTroas: mockCurrentTroas,
        })

        if (!result.success) {
          setExecutionResult({
            success: false,
            message: result.error || 'Execution failed',
          })
          setExecuting(false)
          return
        }
      }

      // All actions executed successfully
      setExecutionResult({
        success: true,
        message: 'All actions executed successfully (Simulated)',
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

  const getActionIcon = (actionType: ActionType) => {
    switch (actionType) {
      case ActionType.BUDGET:
        return selectedActions.find((a) => a.type === actionType)?.change?.startsWith('+') ? (
          <TrendingUpIcon color="success" />
        ) : (
          <TrendingDownIcon color="warning" />
        )
      case ActionType.TROAS:
        return selectedActions.find((a) => a.type === actionType)?.change?.startsWith('+') ? (
          <TrendingUpIcon color="warning" />
        ) : (
          <TrendingDownIcon color="success" />
        )
      case ActionType.PAUSE:
        return <PauseIcon color="error" />
      case ActionType.OBSERVE:
        return <ObserveIcon color="info" />
      default:
        return <CheckCircleIcon />
    }
  }

  const calculateActionValue = (action: SelectedAction) => {
    if (action.type === ActionType.BUDGET && action.change) {
      const newValue = calculateNewValue(mockCurrentBudget, action.change)
      return newValue !== null
        ? `$${mockCurrentBudget.toFixed(2)} → $${newValue.toFixed(2)}`
        : action.change
    }

    if (action.type === ActionType.TROAS && action.change) {
      const newValue = calculateNewValue(mockCurrentTroas, action.change)
      return newValue !== null
        ? `${mockCurrentTroas.toFixed(0)}% → ${newValue.toFixed(0)}%`
        : action.change
    }

    return action.change || 'Execute'
  }

  const hasAggressiveAction = selectedActions.some(
    (a) =>
      (a.type === ActionType.BUDGET && a.change && a.change.includes('5')) ||
      (a.type === ActionType.TROAS && a.change && a.change.includes('5')) ||
      a.type === ActionType.PAUSE
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Confirm Action Execution
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Campaign ID: {campaignId}
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3 }}>
        {/* Warning for aggressive actions */}
        {hasAggressiveAction && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
              Aggressive Action Detected
            </Typography>
            <Typography variant="caption">
              You are about to make significant changes. Please ensure you understand the impact.
            </Typography>
          </Alert>
        )}

        {/* Mock execution notice */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="caption">
            <strong>Mock Mode:</strong> Actions will be simulated. No real changes will be made to Google Ads.
          </Typography>
        </Alert>

        {/* Action list */}
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Actions to Execute:
        </Typography>

        <List disablePadding>
          {selectedActions.map((action, index) => (
            <Box key={index}>
              <ListItem
                sx={{
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemIcon>{getActionIcon(action.type)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {getActionTypeLabel(action.type)}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {calculateActionValue(action)}
                    </Typography>
                  }
                />
              </ListItem>
            </Box>
          ))}
        </List>

        {/* Execution result */}
        {executionResult && (
          <Alert
            severity={executionResult.success ? 'success' : 'error'}
            sx={{ mt: 3 }}
          >
            {executionResult.message}
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={executing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleExecute}
          disabled={executing || executionResult?.success === true}
          startIcon={executing ? <CircularProgress size={16} /> : null}
        >
          {executing ? 'Executing...' : 'Confirm & Execute'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
