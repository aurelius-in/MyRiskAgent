import React from 'react'
import { Box, Chip } from '@mui/material'

export interface Source { id: string; title?: string; url?: string }

interface SourceChipsProps {
  items: Source[]
}

const SourceChips: React.FC<SourceChipsProps> = ({ items }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {items.map((c) => (
        <Chip key={c.id} label={c.title || c.id} component="a" href={c.url} target="_blank" clickable sx={{ color: '#F1A501', borderColor: '#B30700' }} variant="outlined" />
      ))}
    </Box>
  )
}

export default SourceChips
