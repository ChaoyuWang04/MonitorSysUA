'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Divider,
  IconButton,
  Chip,
  LinearProgress,
} from '@mui/material'
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
} from '@mui/icons-material'
import { BarChart } from '@mui/x-charts/BarChart'
import { formatDate, getOperationStatusColor, getOperationStatusLabel } from '@/lib/utils/evaluation'
import { type OperationScore } from '@/lib/types/evaluation'

interface OperationScoreDialogProps {
  open: boolean
  onClose: () => void
  operation: OperationScore
  onRefresh: () => void
}

/**
 * Operation Score Detail Dialog
 *
 * Displays comprehensive daily operation report:
 * - Overall score with breakdown (Decision Quality, Execution Efficiency, Risk Management)
 * - Action execution summary
 * - Score visualization with bar chart
 * - Performance indicators
 */
export function OperationScoreDialog({
  open,
  onClose,
  operation,
  onRefresh,
}: OperationScoreDialogProps) {
  const {
    optimizerName,
    optimizerId,
    evaluationDate,
    totalScore,
    decisionQualityScore,
    executionEfficiencyScore,
    riskManagementScore,
    actionsExecuted,
    successfulActions,
    failedActions,
    avgResponseTime,
    status,
  } = operation

  const successRate = actionsExecuted && actionsExecuted > 0 && successfulActions !== undefined
    ? (successfulActions / actionsExecuted) * 100
    : 0

  // Score data for bar chart
  const scoreData = [
    { category: 'Decision\nQuality', score: decisionQualityScore || 0, max: 100 },
    { category: 'Execution\nEfficiency', score: executionEfficiencyScore || 0, max: 100 },
    { category: 'Risk\nManagement', score: riskManagementScore || 0, max: 100 },
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {optimizerName || optimizerId}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Operation Score for {formatDate(evaluationDate)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={getOperationStatusLabel(status)}
            color={getOperationStatusColor(status)}
            size="medium"
            sx={{ fontWeight: 600 }}
          />
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* Total Score Card */}
          <Card elevation={0} sx={{ border: 2, borderColor: 'primary.main', bgcolor: 'primary.lighter' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Total Operation Score
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                {totalScore?.toFixed(1) || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Out of 100 points
              </Typography>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Score Breakdown
              </Typography>

              <Stack spacing={2}>
                {/* Decision Quality */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <TrendingUpIcon color="primary" />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Decision Quality
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {decisionQualityScore?.toFixed(1) || 'N/A'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={decisionQualityScore || 0}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'primary.main',
                          borderRadius: 1,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Quality of recommended actions and strategy decisions
                    </Typography>
                  </Box>
                </Box>

                {/* Execution Efficiency */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <SpeedIcon color="success" />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Execution Efficiency
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {executionEfficiencyScore?.toFixed(1) || 'N/A'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={executionEfficiencyScore || 0}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'success.main',
                          borderRadius: 1,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Speed and accuracy of action execution
                    </Typography>
                  </Box>
                </Box>

                {/* Risk Management */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <SecurityIcon color="warning" />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Risk Management
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                        {riskManagementScore?.toFixed(1) || 'N/A'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={riskManagementScore || 0}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'warning.main',
                          borderRadius: 1,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Ability to avoid risky decisions and minimize losses
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Score Visualization */}
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Score Comparison
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <BarChart
                  dataset={scoreData}
                  xAxis={[{ scaleType: 'band', dataKey: 'category' }]}
                  series={[
                    {
                      dataKey: 'score',
                      label: 'Score',
                      color: '#1976d2',
                    },
                  ]}
                  width={500}
                  height={250}
                  margin={{ top: 20, bottom: 40, left: 50, right: 20 }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Action Execution Summary */}
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Action Execution Summary
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Total Actions
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {actionsExecuted}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Successful
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {successfulActions}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Failed
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {failedActions}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {successRate.toFixed(0)}%
                  </Typography>
                </Box>
              </Box>

              {avgResponseTime !== null && avgResponseTime !== undefined && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Average Response Time
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {avgResponseTime.toFixed(2)}s
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Performance Indicator */}
          {successRate >= 95 && totalScore && totalScore >= 90 && (
            <Card elevation={0} sx={{ border: 2, borderColor: 'success.main', bgcolor: 'success.lighter' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircleIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.dark' }} gutterBottom>
                    Excellent Performance! 🎉
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    This optimizer achieved outstanding results with {successRate.toFixed(0)}% success rate and a total
                    score of {totalScore.toFixed(1)}.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
