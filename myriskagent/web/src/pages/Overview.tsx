import React from 'react'
import { Box, Grid, Typography, Paper, Button } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiPost } from '../lib/api'
import RiskGauge from '../components/RiskGauge'
import TrendSparkline from '../components/TrendSparkline'
import WhatIfPanel from '../components/WhatIfPanel'

interface ScoreFamily { score: number; confidence: number }
interface ProfileResp { scores: Record<string, ScoreFamily> }

const Overview: React.FC = () => {
  const { data, refetch } = useQuery({
    queryKey: ['profile', 1, 'latest'],
    queryFn: async () => {
      const resp = await apiPost<ProfileResp>('/api/risk/recompute/1/latest', {})
      return resp
    },
    staleTime: 15_000,
  })

  const [trend] = React.useState<number[]>(Array.from({ length: 24 }, (_, i) => 40 + i % 6))
  const [open, setOpen] = React.useState(false)

  const fin = data?.scores?.['Financial Health Risk']?.score ?? 42
  const comp = data?.scores?.['Compliance and Reputation Risk']?.score ?? 35
  const op = data?.scores?.['Operational and Outlier Risk']?.score ?? 50
  const combined = data?.scores?.['Combined Index']?.score ?? 44

  const applyWhatIf = async (params: { alpha: number; beta: number; gamma: number; delta: number }) => {
    await apiPost('/api/risk/recompute/1/latest', { params })
    await refetch()
    setOpen(false)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Overview</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Combined Index</Typography>
              <Button variant="outlined" onClick={() => setOpen(true)} sx={{ color: '#F1A501', borderColor: '#B30700' }}>What If</Button>
            </Box>
            <RiskGauge label="Engagement Risk" value={combined} />
            <TrendSparkline values={trend} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
            <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Family Scores</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <RiskGauge label="Financial" value={fin} />
              <RiskGauge label="Compliance" value={comp} />
              <RiskGauge label="Operational" value={op} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
      <WhatIfPanel open={open} onClose={() => setOpen(false)} onChange={applyWhatIf} />
    </Box>
  )
}

export default Overview
