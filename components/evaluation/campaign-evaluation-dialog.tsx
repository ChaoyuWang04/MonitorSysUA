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
} from '@mui/material'
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material'
import { BarChart } from '@mui/x-charts/BarChart'
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge'
import { StatusChip } from './status-chip'
import {
  formatAchievementRate,
  formatPercentage,
  formatCurrency,
  formatDate,
  getCampaignStatusLabel,
  getRecommendationLabel,
  getRecommendationColor,
} from '@/lib/utils/evaluation'
import type { CampaignEvaluation } from '@/lib/types/evaluation'
import { ActionRecommendationCard } from './action-recommendation-card'

interface CampaignEvaluationDialogProps {
  open: boolean
  onClose: () => void
  evaluation: CampaignEvaluation
  onRefresh: () => void
}

/**
 * Campaign Evaluation Detail Dialog
 *
 * Displays comprehensive evaluation report for a campaign:
 * - Basic campaign info (type, spend, evaluation date)
 * - Performance metrics (ROAS7, RET7) vs baseline
 * - Achievement rate gauge
 * - Recommendation with action options
 */
export function CampaignEvaluationDialog({
  open,
  onClose,
  evaluation,
  onRefresh,
}: CampaignEvaluationDialogProps) {
  const {
    campaignName,
    campaignId,
    campaignType,
    totalSpend,
    actualRoas7,
    actualRet7,
    baselineRoas7,
    baselineRet7,
    roasAchievementRate,
    retAchievementRate,
    minAchievementRate,
    status,
    recommendationType,
    evaluationDate,
  } = evaluation

  // Calculate percentage difference
  const roasDiff = actualRoas7 && baselineRoas7 ? actualRoas7 - baselineRoas7 : null
  const retDiff = actualRet7 && baselineRet7 ? actualRet7 - baselineRet7 : null

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
            {campaignName || campaignId}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Evaluated on {formatDate(evaluationDate)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusChip status={status} label={getCampaignStatusLabel(status)} size="medium" />
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
                Campaign Information
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Campaign ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                    {campaignId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Type
                  </Typography>
                  <Chip
                    label={campaignType?.toUpperCase() || 'N/A'}
                    size="small"
                    color={campaignType === 'test' ? 'info' : 'default'}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Total Spend
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(totalSpend)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Evaluation Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDate(evaluationDate)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Performance Metrics vs Baseline
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
                {/* ROAS7 */}
                <Box>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: roasDiff && roasDiff >= 0 ? 'success.lighter' : 'error.lighter',
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                        ROAS7
                      </Typography>
                      {roasDiff !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {roasDiff >= 0 ? (
                            <TrendingUpIcon fontSize="small" color="success" />
                          ) : (
                            <TrendingDownIcon fontSize="small" color="error" />
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: roasDiff >= 0 ? 'success.main' : 'error.main',
                            }}
                          >
                            {roasDiff >= 0 ? '+' : ''}
                            {formatPercentage(roasDiff)}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="baseline">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Actual
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {formatPercentage(actualRoas7)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        vs
                      </Typography>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Baseline
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                          {formatPercentage(baselineRoas7)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Achievement Rate
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatAchievementRate(roasAchievementRate)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* RET7 */}
                <Box>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: retDiff && retDiff >= 0 ? 'success.lighter' : 'error.lighter',
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                        RET7
                      </Typography>
                      {retDiff !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {retDiff >= 0 ? (
                            <TrendingUpIcon fontSize="small" color="success" />
                          ) : (
                            <TrendingDownIcon fontSize="small" color="error" />
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: retDiff >= 0 ? 'success.main' : 'error.main',
                            }}
                          >
                            {retDiff >= 0 ? '+' : ''}
                            {formatPercentage(retDiff)}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="baseline">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Actual
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {formatPercentage(actualRet7)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        vs
                      </Typography>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Baseline
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                          {formatPercentage(baselineRet7)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Achievement Rate
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatAchievementRate(retAchievementRate)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Overall Achievement Gauge */}
              <Box mt={3} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Overall Achievement Rate (Minimum)
                  </Typography>
                  <Gauge
                    width={200}
                    height={150}
                    value={minAchievementRate || 0}
                    valueMin={0}
                    valueMax={150}
                    sx={(theme) => ({
                      [`& .${gaugeClasses.valueText}`]: {
                        fontSize: 24,
                        fontWeight: 700,
                      },
                      [`& .${gaugeClasses.valueArc}`]: {
                        fill:
                          (minAchievementRate || 0) >= 110
                            ? theme.palette.success.main
                            : (minAchievementRate || 0) >= 100
                            ? theme.palette.info.main
                            : (minAchievementRate || 0) >= 85
                            ? theme.palette.warning.main
                            : (minAchievementRate || 0) >= 60
                            ? theme.palette.warning.dark
                            : theme.palette.error.main,
                      },
                    })}
                    text={({ value }) => `${value?.toFixed(1) ?? '0.0'}%`}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Takes the lower of ROAS7 and RET7 achievement rates
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Action Recommendation */}
          <ActionRecommendationCard
            campaignId={campaignId}
            evaluationId={evaluation.id}
            recommendationType={recommendationType}
            onSuccess={() => {
              onRefresh()
              onClose()
            }}
          />
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
