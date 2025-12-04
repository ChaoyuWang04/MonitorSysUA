'use client'

import { useMemo, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Drawer,
  Divider,
  Chip,
  Alert,
} from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowParams,
} from '@mui/x-data-grid'
import {
  Sync as SyncIcon,
  CloudSync as CloudSyncIcon,
} from '@mui/icons-material'
import { trpc } from '@/lib/trpc/client'
import { useAccount } from '@/lib/contexts/account-context'

type TabKey = 'campaigns' | 'adGroups' | 'ads'

type CampaignFilters = { status: string; channelType: string; mediaSource: string }
type AdGroupFilters = { status: string; type: string; mediaSource: string }
type AdFilters = { status: string; type: string; mediaSource: string }

const mediaSources = [{ label: 'Google', value: 'google' }]

function formatDate(value?: string | Date | null) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMicros(value?: bigint | null, currency = 'USD') {
  if (value === null || value === undefined) return '—'
  const numberValue = Number(value) / 1_000_000
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(numberValue)
}

export default function EntitiesPage() {
  const { selectedAccountId } = useAccount()
  const [activeTab, setActiveTab] = useState<TabKey>('campaigns')

  const [campaignPagination, setCampaignPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })
  const [adGroupPagination, setAdGroupPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })
  const [adPagination, setAdPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })

  const [campaignFilters, setCampaignFilters] = useState<CampaignFilters>({ status: '', channelType: '', mediaSource: 'google' })
  const [adGroupFilters, setAdGroupFilters] = useState<AdGroupFilters>({ status: '', type: '', mediaSource: 'google' })
  const [adFilters, setAdFilters] = useState<AdFilters>({ status: '', type: '', mediaSource: 'google' })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<any>(null)

  const syncEntities = trpc.entities.sync.useMutation({
    onSuccess: () => {
      refetchForActiveTab()
    },
  })

  const campaignsQuery = trpc.entities.listCampaigns.useQuery(
    {
      accountId: selectedAccountId!,
      page: campaignPagination.page + 1,
      pageSize: campaignPagination.pageSize,
      status: campaignFilters.status || undefined,
      channelType: campaignFilters.channelType || undefined,
      mediaSource: campaignFilters.mediaSource,
    },
    { enabled: !!selectedAccountId && activeTab === 'campaigns' }
  )

  const adGroupsQuery = trpc.entities.listAdGroups.useQuery(
    {
      accountId: selectedAccountId!,
      page: adGroupPagination.page + 1,
      pageSize: adGroupPagination.pageSize,
      status: adGroupFilters.status || undefined,
      type: adGroupFilters.type || undefined,
      mediaSource: adGroupFilters.mediaSource,
    },
    { enabled: !!selectedAccountId && activeTab === 'adGroups' }
  )

  const adsQuery = trpc.entities.listAds.useQuery(
    {
      accountId: selectedAccountId!,
      page: adPagination.page + 1,
      pageSize: adPagination.pageSize,
      status: adFilters.status || undefined,
      type: adFilters.type || undefined,
      mediaSource: adFilters.mediaSource,
    },
    { enabled: !!selectedAccountId && activeTab === 'ads' }
  )

  const handleSync = async () => {
    if (!selectedAccountId) return
    await syncEntities.mutateAsync({ accountId: selectedAccountId })
    refetchForActiveTab()
  }

  const refetchForActiveTab = () => {
    if (activeTab === 'campaigns') campaignsQuery.refetch()
    if (activeTab === 'adGroups') adGroupsQuery.refetch()
    if (activeTab === 'ads') adsQuery.refetch()
  }

  const commonChangeCols: GridColDef[] = [
    {
      field: 'latestChange',
      headerName: 'Latest Change',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const change = params.value
        if (!change) return <Typography variant="body2" color="text.secondary">No history</Typography>
        return (
          <Stack spacing={0.5}>
            <Typography variant="body2">{change.summaryZh || change.summary}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(change.timestamp)}
            </Typography>
          </Stack>
        )
      },
    },
  ]

  const campaignColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1.4, minWidth: 180 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => <Chip label={params.value || '—'} size="small" variant="outlined" />,
    },
    {
      field: 'channelType',
      headerName: 'Channel',
      width: 140,
      renderCell: (params) => <Chip label={params.value || '—'} size="small" />,
    },
    {
      field: 'biddingStrategyType',
      headerName: 'Bidding',
      width: 160,
    },
    {
      field: 'budgetAmountMicros',
      headerName: 'Budget',
      width: 140,
      valueFormatter: (params: any) => formatMicros(params?.value ?? null),
    },
    {
      field: 'lastModifiedTime',
      headerName: 'Updated',
      width: 150,
      valueFormatter: (params: any) => formatDate(params?.value ?? null),
    },
    ...commonChangeCols,
  ]

  const adGroupColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1.2, minWidth: 160 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'type', headerName: 'Type', width: 150 },
    {
      field: 'cpcBidMicros',
      headerName: 'CPC Bid',
      width: 130,
      valueFormatter: (params: any) => formatMicros(params?.value ?? null),
    },
    {
      field: 'lastModifiedTime',
      headerName: 'Updated',
      width: 150,
      valueFormatter: (params: any) => formatDate(params?.value ?? null),
    },
    ...commonChangeCols,
  ]

  const adColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1.2, minWidth: 160 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'type', headerName: 'Type', width: 160 },
    { field: 'displayUrl', headerName: 'Display URL', flex: 1, minWidth: 160 },
    {
      field: 'lastModifiedTime',
      headerName: 'Updated',
      width: 150,
      valueFormatter: (params: any) => formatDate(params?.value ?? null),
    },
    ...commonChangeCols,
  ]

  const activeQuery = activeTab === 'campaigns'
    ? campaignsQuery
    : activeTab === 'adGroups'
      ? adGroupsQuery
      : adsQuery

  const activeColumns = activeTab === 'campaigns'
    ? campaignColumns
    : activeTab === 'adGroups'
      ? adGroupColumns
      : adColumns

  const activePagination = activeTab === 'campaigns'
    ? campaignPagination
    : activeTab === 'adGroups'
      ? adGroupPagination
      : adPagination

  const setActivePagination = (model: GridPaginationModel) => {
    if (activeTab === 'campaigns') setCampaignPagination(model)
    else if (activeTab === 'adGroups') setAdGroupPagination(model)
    else setAdPagination(model)
  }

  const activeFilters = activeTab === 'campaigns'
    ? campaignFilters
    : activeTab === 'adGroups'
      ? adGroupFilters
      : adFilters

  const setActiveFilters = (next: CampaignFilters | AdGroupFilters | AdFilters) => {
    if (activeTab === 'campaigns') setCampaignFilters(next as CampaignFilters)
    else if (activeTab === 'adGroups') setAdGroupFilters(next as AdGroupFilters)
    else setAdFilters(next as AdFilters)
  }

  const handleRowClick = (params: GridRowParams) => {
    setSelectedRow(params.row)
    setDrawerOpen(true)
  }

  const renderFilters = () => {
    const filterSet = activeFilters
    const campaignFilterSet = activeTab === 'campaigns' ? (filterSet as CampaignFilters) : null
    const adGroupFilterSet = activeTab === 'adGroups' ? (filterSet as AdGroupFilters) : null
    const adFilterSet = activeTab === 'ads' ? (filterSet as AdFilters) : null
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', flexWrap: 'wrap' }}>
        <TextField
          select
          label="Status"
          size="small"
          value={filterSet.status}
          // @ts-ignore MUI select typing noise
          onChange={((e) => setActiveFilters({ ...filterSet, status: (e as SelectChangeEvent<string>).target.value as string })) as any}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="ENABLED">Enabled</MenuItem>
          <MenuItem value="PAUSED">Paused</MenuItem>
          <MenuItem value="REMOVED">Removed</MenuItem>
        </TextField>

        {campaignFilterSet && (
          <TextField
            select
            label="Channel"
            size="small"
            value={campaignFilterSet.channelType}
            // @ts-ignore MUI select typing noise
            onChange={((e) => setActiveFilters({ ...campaignFilterSet, channelType: (e as SelectChangeEvent<string>).target.value as string })) as any}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="SEARCH">Search</MenuItem>
            <MenuItem value="DISPLAY">Display</MenuItem>
            <MenuItem value="VIDEO">Video</MenuItem>
            <MenuItem value="PERFORMANCE_MAX">Performance Max</MenuItem>
          </TextField>
        )}

        {adGroupFilterSet && (
          <TextField
            select
            label="Ad Group Type"
            size="small"
            value={adGroupFilterSet.type}
            // @ts-ignore MUI select typing noise
            onChange={((e) => setActiveFilters({ ...adGroupFilterSet, type: (e as SelectChangeEvent<string>).target.value as string })) as any}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="SEARCH_STANDARD">Search Standard</MenuItem>
            <MenuItem value="DISPLAY_STANDARD">Display Standard</MenuItem>
            <MenuItem value="VIDEO_BUMPER">Video Bumper</MenuItem>
          </TextField>
        )}

        {adFilterSet && (
          <TextField
            select
            label="Ad Type"
            size="small"
            value={adFilterSet.type}
            // @ts-ignore MUI select typing noise
            onChange={((e) => setActiveFilters({ ...adFilterSet, type: (e as SelectChangeEvent<string>).target.value as string })) as any}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="RESPONSIVE_SEARCH_AD">Responsive Search</MenuItem>
            <MenuItem value="IMAGE_AD">Image</MenuItem>
            <MenuItem value="VIDEO_AD">Video</MenuItem>
          </TextField>
        )}

        <TextField
          select
          label="Media Source"
          size="small"
          value={filterSet.mediaSource}
          // @ts-ignore MUI select typing noise
          onChange={((e) => setActiveFilters({ ...filterSet, mediaSource: (e as SelectChangeEvent<string>).target.value as string })) as any}
          sx={{ minWidth: 180 }}
        >
          {mediaSources.map((item) => (
            <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
          ))}
        </TextField>
      </Stack>
    )
  }

  const drawerContent = useMemo(() => {
    if (!selectedRow) return null
    const change = selectedRow.latestChange
    return (
      <Box sx={{ width: 360, p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {selectedRow.name || 'Unnamed'}
        </Typography>
        <Stack spacing={1.5}>
          {Object.entries(selectedRow).map(([key, value]) => {
            if (key === 'latestChange' || key === 'id' || key === 'accountId') return null
            return (
              <Box key={key}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {key}
                </Typography>
                <Typography variant="body2">
                  {typeof value === 'string' || typeof value === 'number' ? value : Array.isArray(value) ? value.join(', ') : value ? String(value) : '—'}
                </Typography>
              </Box>
            )
          })}
          <Divider />
          <Typography variant="subtitle2">Latest Change</Typography>
          {change ? (
            <Stack spacing={0.5}>
              <Typography variant="body2">{change.summaryZh || change.summary}</Typography>
              <Typography variant="caption" color="text.secondary">{formatDate(change.timestamp)}</Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">No change history</Typography>
          )}
        </Stack>
      </Box>
    )
  }, [selectedRow])

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Campaigns & Ads</Typography>
          <Typography variant="body2" color="text.secondary">
            Full-state view of campaigns, ad groups, and ads with latest change history.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<CloudSyncIcon />}
            disabled={!selectedAccountId || syncEntities.isPending}
            onClick={handleSync}
          >
            Sync now
          </Button>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            disabled={!selectedAccountId || syncEntities.isPending}
            onClick={handleSync}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {!selectedAccountId && (
        <Alert severity="info">Select an account to view campaigns and ads.</Alert>
      )}

      {selectedAccountId && (
        <>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{ mb: 2 }}
          >
            <Tab label="Campaigns" value="campaigns" />
            <Tab label="Ad Groups" value="adGroups" />
            <Tab label="Ads" value="ads" />
          </Tabs>

          <Stack spacing={2} sx={{ mb: 2 }}>
            {renderFilters()}
          </Stack>

          <DataGrid
            autoHeight
            rows={activeQuery.data?.data || []}
            columns={activeColumns}
            paginationMode="server"
            rowCount={activeQuery.data?.total || 0}
            paginationModel={activePagination}
            onPaginationModelChange={setActivePagination}
            pageSizeOptions={[10, 25, 50, 100]}
            loading={activeQuery.isLoading}
            disableRowSelectionOnClick
            onRowClick={handleRowClick}
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
            }}
          />
        </>
      )}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </Drawer>
    </Box>
  )
}
