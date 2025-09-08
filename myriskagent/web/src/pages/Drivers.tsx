import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import RiskWaterfall, { WaterfallItem } from '../components/RiskWaterfall'
import SkeletonBlock from '../components/SkeletonBlock'

interface DriversResp { drivers: { name: string; value: number }[]; rationales?: string[] }

const Drivers: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['drivers', 1, 'latest'],
    queryFn: async () => apiGet<DriversResp>('/api/risk/drivers/1/latest'),
    staleTime: 15_000,
  })

  const items: WaterfallItem[] = (data?.drivers || []).map(d => ({ name: d.name, value: d.value }))
  const rationales = data?.rationales || []

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Drivers</Typography>
      <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700', mb: 2 }}>
        {isLoading && <SkeletonBlock height={200} />}
        {isError && <div style={{ color: '#B30700' }}>Failed to load drivers.</div>}
        {!isLoading && !isError && <RiskWaterfall items={items} />}
      </Paper>
      {!!rationales.length && (
        <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
          <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif', mb: 1 }}>Why these matter</Typography>
          <ul>
            {rationales.map((r, i) => (
              <li key={i} style={{ color: '#F1A501' }}>{r}</li>
            ))}
          </ul>
        </Paper>
      )}
    </Box>
  )
}

export default Drivers
