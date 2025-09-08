import React from 'react'
import { Box, Typography } from '@mui/material'

interface Props { message?: string }

const EmptyState: React.FC<Props> = ({ message }) => {
  return (
    <Box sx={{ color: '#F1A501', textAlign: 'center', py: 4 }}>
      <Typography variant="body1">{message || 'Nothing to display yet.'}</Typography>
    </Box>
  )
}

export default EmptyState


