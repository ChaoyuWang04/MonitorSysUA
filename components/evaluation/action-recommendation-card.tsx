'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  TextField,
  Stack,
  Alert,
} from '@mui/material'
import {
  Lightbulb as LightbulbIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material'
import { ActionExecutionDialog } from './action-execution-dialog'
import {
  getRecommendationLabel,
  getRecommendationColor,
  getScaleUpActions,
  getScaleDownActions,
  getShutdownActions,
} from '@/lib/utils/evaluation'
import {
  RecommendationType,
  ActionType,
  type SelectedAction,
  type ActionOption,
} from '@/lib/types/evaluation'

interface ActionRecommendationCardProps {
  campaignId: string
  evaluationId: number
  recommendationType: RecommendationType | null | undefined
  onSuccess?: () => void
}

/**
 * Action Recommendation Card Component
 *
 * Displays recommended actions for a campaign based on its evaluation:
 * - Scale-up: Increase budget or decrease tROAS
 * - Scale-down: Decrease budget, increase tROAS, change creative, or pause
 * - Shutdown: Pause campaign immediately
 * - Observe: Continue monitoring
 *
 * Users can select one or more actions and execute them (Mock mode)
 */
export function ActionRecommendationCard({
  campaignId,
  evaluationId,
  recommendationType,
  onSuccess,
}: ActionRecommendationCardProps) {
  const [selectedActions, setSelectedActions] = useState<SelectedAction[]>([])
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false)

  // Get available actions based on recommendation type
  const getAvailableActions = (): ActionOption[] => {
    if (!recommendationType) return []

    if (
      recommendationType === RecommendationType.AGGRESSIVE_SCALE ||
      recommendationType === RecommendationType.CONSERVATIVE_SCALE
    ) {
      return getScaleUpActions()
    }

    if (recommendationType === RecommendationType.CONSERVATIVE_REDUCE) {
      return getScaleDownActions()
    }

    if (recommendationType === RecommendationType.SHUTDOWN) {
      return getShutdownActions()
    }

    // Observe - no actions needed
    return []
  }

  const availableActions = getAvailableActions()

  const handleActionChange = (action: ActionType, change?: string) => {
    // Check if this action is already selected
    const existingIndex = selectedActions.findIndex((a) => a.type === action)

    if (existingIndex >= 0) {
      if (change) {
        // Update existing action
        const updated = [...selectedActions]
        updated[existingIndex] = { type: action, change }
        setSelectedActions(updated)
      } else {
        // Remove action
        setSelectedActions(selectedActions.filter((a) => a.type !== action))
      }
    } else {
      // Add new action
      if (change || action === ActionType.PAUSE || action === ActionType.OBSERVE) {
        setSelectedActions([...selectedActions, { type: action, change }])
      }
    }
  }

  const handleExecute = () => {
    if (selectedActions.length === 0) return
    setExecutionDialogOpen(true)
  }

  const handleExecutionSuccess = () => {
    setExecutionDialogOpen(false)
    setSelectedActions([])
    onSuccess?.()
  }

  // No recommendation
  if (!recommendationType || recommendationType === RecommendationType.OBSERVE) {
    return (
      <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <LightbulbIcon color="action" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Recommendation
            </Typography>
            <Chip
              label={getRecommendationLabel(recommendationType)}
              color={getRecommendationColor(recommendationType)}
              size="small"
            />
          </Stack>
          <Alert severity="info" variant="outlined">
            Campaign performance is within acceptable range. Continue monitoring for the next 7 days.
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <LightbulbIcon color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Recommended Actions
            </Typography>
            <Chip
              label={getRecommendationLabel(recommendationType)}
              color={getRecommendationColor(recommendationType)}
              size="small"
            />
          </Stack>

          <Typography variant="body2" color="text.secondary" paragraph>
            Based on the evaluation, we recommend the following actions to optimize campaign performance:
          </Typography>

          {/* Action Options */}
          <Stack spacing={2}>
            {availableActions.map((actionOption) => {
              const isSelected = selectedActions.some((a) => a.type === actionOption.type)
              const selectedAction = selectedActions.find((a) => a.type === actionOption.type)

              return (
                <Box
                  key={actionOption.type}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: isSelected ? 'primary.lighter' : 'transparent',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Select with default value
                            if (actionOption.options && actionOption.options.length > 0) {
                              handleActionChange(actionOption.type, actionOption.options[0])
                            } else {
                              handleActionChange(actionOption.type)
                            }
                          } else {
                            handleActionChange(actionOption.type)
                          }
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {actionOption.label}
                        </Typography>
                        {actionOption.description && (
                          <Typography variant="caption" color="text.secondary">
                            {actionOption.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />

                  {/* Sub-options (percentage changes) */}
                  {isSelected && actionOption.options && (
                    <RadioGroup
                      value={selectedAction?.change || actionOption.options[0]}
                      onChange={(e) => handleActionChange(actionOption.type, e.target.value)}
                      sx={{ ml: 4, mt: 1 }}
                    >
                      {actionOption.options.map((option) => (
                        <FormControlLabel
                          key={option}
                          value={option}
                          control={<Radio size="small" />}
                          label={<Typography variant="body2">{option}</Typography>}
                        />
                      ))}
                    </RadioGroup>
                  )}
                </Box>
              )
            })}
          </Stack>

          {/* Execute Button */}
          <Box mt={3}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleExecute}
              disabled={selectedActions.length === 0}
              fullWidth
              size="large"
            >
              Execute Selected Actions ({selectedActions.length})
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Execution Dialog */}
      <ActionExecutionDialog
        open={executionDialogOpen}
        onClose={() => setExecutionDialogOpen(false)}
        campaignId={campaignId}
        evaluationId={evaluationId}
        selectedActions={selectedActions}
        onSuccess={handleExecutionSuccess}
      />
    </>
  )
}
