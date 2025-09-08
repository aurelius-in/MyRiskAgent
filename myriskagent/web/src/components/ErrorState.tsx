import React from 'react'
import { Alert } from '@mui/material'

interface Props { message?: string }

const ErrorState: React.FC<Props> = ({ message }) => {
  return (
    <Alert severity="error" sx={{ bgcolor: '#1a0000', color: '#F1A501', border: '1px solid #B30700' }}>
      {message || 'Something went wrong. Please try again.'}
    </Alert>
  )
}

export default ErrorState


