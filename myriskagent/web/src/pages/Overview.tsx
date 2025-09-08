import React from 'react'
import { Box, Grid, Typography, Paper } from '@mui/material'
import RiskGauge from '../components/RiskGauge'

const Overview: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Overview</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
            <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Combined Index</Typography>
            <RiskGauge label="Engagement Risk" value={44} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
            <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Family Scores</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <RiskGauge label="Financial" value={42} />
              <RiskGauge label="Compliance" value={35} />
              <RiskGauge label="Operational" value={50} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Overview
