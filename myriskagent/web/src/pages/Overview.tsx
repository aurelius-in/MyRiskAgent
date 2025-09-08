import React from 'react'
import { Box, Grid, Typography, Paper } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiPost } from '../lib/api'
import RiskGauge from '../components/RiskGauge'

interface ScoreFamily { score: number; confidence: number }
interface ProfileResp { scores: Record<string, ScoreFamily> }

const Overview: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['profile', 1, 'latest'],
    queryFn: async () => {
      const resp = await apiPost<ProfileResp>('/api/risk/recompute/1/latest', {})
      return resp
    },
    staleTime: 15_000,
  })

  const fin = data?.scores?.['Financial Health Risk']?.score ?? 42
  const comp = data?.scores?.['Compliance and Reputation Risk']?.score ?? 35
  const op = data?.scores?.['Operational and Outlier Risk']?.score ?? 50
  const combined = data?.scores?.['Combined Index']?.score ?? 44

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Overview</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
            <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Combined Index</Typography>
            <RiskGauge label="Engagement Risk" value={combined} />
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
    </Box>
  )
}

export default Overview
