import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import RiskWaterfall from '../components/RiskWaterfall'

const Drivers: React.FC = () => {
  const items = [
    { name: 'Margins', value: 5 },
    { name: 'Legal Mentions', value: 3 },
    { name: 'Supply Delays', value: -2 },
    { name: 'Online Buzz', value: 1 },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Drivers</Typography>
      <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
        <RiskWaterfall items={items} />
      </Paper>
    </Box>
  )
}

export default Drivers
