import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiPost } from '../lib/api'
import RiskWaterfall, { WaterfallItem } from '../components/RiskWaterfall'
import SkeletonBlock from '../components/SkeletonBlock'
import type { ProfileResp } from '../lib/types'

const Drivers: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['drivers', 1, 'latest'],
    queryFn: async () => apiPost<ProfileResp>('/api/risk/recompute/1/latest', {}),
    staleTime: 15_000,
  })

  // Placeholder mapping until backend returns explicit drivers
  const items: WaterfallItem[] = [
    { name: 'Margins', value: 5 },
    { name: 'Legal Mentions', value: 3 },
    { name: 'Supply Delays', value: -2 },
    { name: 'Online Buzz', value: 1 },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Drivers</Typography>
      <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
        {isLoading && <SkeletonBlock height={200} />}
        {isError && <div style={{ color: '#B30700' }}>Failed to load drivers.</div>}
        {!isLoading && !isError && <RiskWaterfall items={items} />}
      </Paper>
    </Box>
  )
}

export default Drivers
