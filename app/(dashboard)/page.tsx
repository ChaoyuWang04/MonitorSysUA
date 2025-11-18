'use client'

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  Alert,
  Skeleton,
} from '@mui/material'
import {
  EventNote as EventNoteIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { useAccount } from '@/lib/contexts/account-context'

export default function DashboardPage() {
  const { selectedAccountId } = useAccount()

  const { data: stats, isLoading } = trpc.stats.overview.useQuery(
    { accountId: selectedAccountId! },
    { enabled: !!selectedAccountId }
  )

  // No account selected
  if (!selectedAccountId) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="info" variant="outlined">
          Please select an account from the sidebar to view dashboard statistics.
        </Alert>
      </Container>
    )
  }

  // Skeleton loader for stat cards
  const StatCardSkeleton = () => (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="40%" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={200} height={48} />
          <Skeleton variant="text" width={300} />
        </Box>

        {/* Skeleton Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
            mb: 4,
          }}
        >
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </Box>

        {/* Skeleton Panels */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
            },
            gap: 3,
          }}
        >
          <Paper elevation={2} sx={{ p: 3 }}>
            <Skeleton variant="text" width="50%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={200} />
          </Paper>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Skeleton variant="text" width="50%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={200} />
          </Paper>
        </Box>
      </Container>
    )
  }

  if (!stats) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>No statistics available</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of Google Ads change events and activity
        </Typography>
      </Box>

      {/* Overview Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 4,
        }}
      >
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EventNoteIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h4">{stats.totalEvents.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Events
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h4">{stats.totalUsers.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Users
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CategoryIcon color="info" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h4">{stats.resourceTypes.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Resource Types
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EditIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h4">{stats.operationTypes.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Operation Types
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Resource Type Distribution */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
          },
          gap: 3,
        }}
      >
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resource Type Distribution
          </Typography>
          <Box sx={{ mt: 2 }}>
            {stats.resourceTypes.map((item) => (
              <Box
                key={item.resourceType}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  pb: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 'none',
                    mb: 0,
                    pb: 0,
                  },
                }}
              >
                <Typography variant="body1">
                  {item.resourceType.replace(/_/g, ' ')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" color="primary">
                    {item.count.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({((item.count / stats.totalEvents) * 100).toFixed(1)}%)
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Operation Type Distribution */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Operation Type Distribution
          </Typography>
          <Box sx={{ mt: 2 }}>
            {stats.operationTypes.map((item) => {
              const color =
                item.operationType === 'CREATE'
                  ? 'success.main'
                  : item.operationType === 'UPDATE'
                  ? 'primary.main'
                  : 'error.main'

              return (
                <Box
                  key={item.operationType}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': {
                      borderBottom: 'none',
                      mb: 0,
                      pb: 0,
                    },
                  }}
                >
                  <Typography variant="body1">{item.operationType}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" sx={{ color }}>
                      {item.count.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({((item.count / stats.totalEvents) * 100).toFixed(1)}%)
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}
