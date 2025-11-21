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
  Stack,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Alert,
} from '@mui/material'
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import { CreativeStatusBadge } from './creative-status-badge'
import { CreativeSyncDialog } from './creative-sync-dialog'
import {
  formatCPI,
  formatPercentage,
  formatCVR,
  formatNumber,
  formatDate,
} from '@/lib/utils/evaluation'
import { CreativeStatus, EvaluationDay, type CreativeEvaluation } from '@/lib/types/evaluation'

interface CreativeEvaluationDialogProps {
  open: boolean
  onClose: () => void
  evaluation: CreativeEvaluation
  onRefresh: () => void
}

/**
 * Creative Evaluation Detail Dialog
 *
 * Displays comprehensive evaluation report for a creative:
 * - Basic creative info (ID, campaign, evaluation day)
 * - Performance metrics (Impressions, Installs, CVR, CPI, ROAS)
 * - D3/D7 evaluation timeline
 * - Sync button for excellent creatives
 */
export function CreativeEvaluationDialog({
  open,
  onClose,
  evaluation,
  onRefresh,
}: CreativeEvaluationDialogProps) {
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)

  const {
    creativeName,
    creativeId,
    campaignId,
    evaluationDay,
    evaluationDate,
    impressions,
    installs,
    cvr,
    actualCpi,
    actualRoas,
    maxCpiThreshold,
    minRoasThreshold,
    creativeStatus,
  } = evaluation

  // Check if CPI and ROAS passed thresholds
  const cpiPassed = maxCpiThreshold && actualCpi ? actualCpi <= maxCpiThreshold : null
  const roasPassed = minRoasThreshold && actualRoas ? actualRoas >= minRoasThreshold : null

  const handleSyncClick = () => {
    setSyncDialogOpen(true)
  }

  const handleSyncSuccess = () => {
    setSyncDialogOpen(false)
    onRefresh()
    onClose()
  }

  return (
    <>
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
              {creativeName || creativeId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Evaluated on {formatDate(evaluationDate)} ({evaluationDay})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreativeStatusBadge status={creativeStatus} size="medium" />
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={3}>
            {/* Basic Info */}
            <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Creative Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Creative ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                      {creativeId || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Campaign ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                      {campaignId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Evaluation Day
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {evaluationDay || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Performance Metrics
                </Typography>

                <Grid container spacing={2}>
                  {/* Impressions */}
                  <Grid item xs={6} sm={4}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Impressions
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {formatNumber(impressions)}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Installs */}
                  <Grid item xs={6} sm={4}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Installs
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {formatNumber(installs)}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* CVR */}
                  <Grid item xs={12} sm={4}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: cvr && cvr >= 0.0067 ? 'success.lighter' : 'grey.50',
                        borderRadius: 2,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        CVR (Conversion Rate)
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: cvr && cvr >= 0.0067 ? 'success.main' : 'text.primary',
                        }}
                      >
                        {formatCVR(cvr)}
                      </Typography>
                      {cvr && cvr >= 0.0067 && (
                        <Typography variant="caption" color="success.main">
                          Excellent! ⭐
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  {/* CPI */}
                  <Grid item xs={6}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        CPI (Cost Per Install)
                      </Typography>
                      <Stack direction="row" alignItems="baseline" spacing={1} mb={1}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {formatCPI(actualCpi)}
                        </Typography>
                        {cpiPassed !== null && (
                          cpiPassed ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <CancelIcon color="error" fontSize="small" />
                          )
                        )}
                      </Stack>
                      {maxCpiThreshold && (
                        <Typography variant="caption" color="text.secondary">
                          Threshold: {formatCPI(maxCpiThreshold)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  {/* ROAS */}
                  <Grid item xs={6}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        ROAS (Return on Ad Spend)
                      </Typography>
                      <Stack direction="row" alignItems="baseline" spacing={1} mb={1}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {formatPercentage(actualRoas)}
                        </Typography>
                        {roasPassed !== null && (
                          roasPassed ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <CancelIcon color="error" fontSize="small" />
                          )
                        )}
                      </Stack>
                      {minRoasThreshold && (
                        <Typography variant="caption" color="text.secondary">
                          Threshold: {formatPercentage(minRoasThreshold)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Evaluation Timeline */}
            <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Evaluation Timeline
                </Typography>

                <Stepper activeStep={evaluationDay === EvaluationDay.D7 ? 1 : 0} alternativeLabel>
                  <Step>
                    <StepLabel>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        D3 Evaluation
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        First screening
                      </Typography>
                    </StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        D7 Evaluation
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Final judgment
                      </Typography>
                    </StepLabel>
                  </Step>
                </Stepper>
              </CardContent>
            </Card>

            {/* Sync Button for Excellent Creatives */}
            {creativeStatus === CreativeStatus.EXCELLENT && (
              <Alert severity="success" variant="outlined">
                <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
                  🎉 Excellent Creative Detected!
                </Typography>
                <Typography variant="caption" paragraph>
                  This creative meets all criteria for an "high-volume excellent creative".
                  Consider syncing it to mature campaigns for scale-up.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSyncClick}
                  sx={{ mt: 1 }}
                >
                  Sync to Mature Campaigns
                </Button>
              </Alert>
            )}

            {/* Failed Creative Notice */}
            {creativeStatus === CreativeStatus.FAILED && (
              <Alert severity="error" variant="outlined">
                <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
                  Creative Did Not Pass Evaluation
                </Typography>
                <Typography variant="caption">
                  {cpiPassed === false && 'CPI exceeds threshold. '}
                  {roasPassed === false && 'ROAS below threshold. '}
                  Consider pausing this creative to avoid wasting budget.
                </Typography>
              </Alert>
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

      {/* Sync Dialog */}
      <CreativeSyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        creativeId={creativeId || ''}
        sourceCampaignId={campaignId}
        onSuccess={handleSyncSuccess}
      />
    </>
  )
}
