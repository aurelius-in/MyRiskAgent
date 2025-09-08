import React from 'react'
import { Box, Button, Drawer, Slider, Typography } from '@mui/material'

interface WhatIfPanelProps {
  open: boolean
  onClose: () => void
  onChange: (params: { alpha: number; beta: number; gamma: number; delta: number }) => void
}

const WhatIfPanel: React.FC<WhatIfPanelProps> = ({ open, onClose, onChange }) => {
  const [alpha, setAlpha] = React.useState(1)
  const [beta, setBeta] = React.useState(1)
  const [gamma, setGamma] = React.useState(1)
  const [delta, setDelta] = React.useState(1)

  const apply = () => onChange({ alpha, beta, gamma, delta })

  const slider = (label: string, value: number, set: (v: number) => void) => (
    <Box sx={{ mb: 2 }}>
      <Typography gutterBottom sx={{ color: '#F1A501' }}>{label}: {value.toFixed(2)}</Typography>
      <Slider value={value} min={0} max={2} step={0.05} onChange={(_, v) => set(v as number)} />
    </Box>
  )

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: '#111', width: 360, p: 2, borderLeft: '1px solid #B30700' } }}>
      <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif', mb: 2 }}>What If</Typography>
      {slider('alpha', alpha, setAlpha)}
      {slider('beta', beta, setBeta)}
      {slider('gamma', gamma, setGamma)}
      {slider('delta', delta, setDelta)}
      <Button onClick={apply} variant="outlined" sx={{ color: '#F1A501', borderColor: '#B30700' }}>Apply</Button>
    </Drawer>
  )
}

export default WhatIfPanel
