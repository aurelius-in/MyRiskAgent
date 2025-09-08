import React from 'react'
import { Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import SkeletonBlock from '../components/SkeletonBlock'

interface ScoresResp { scores: { entity?: string; family?: string; score?: number }[] }

const Scores: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['scores', 1, 'latest'],
    queryFn: async () => apiGet<ScoresResp>('/api/scores/1/latest'),
  })

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Scores</Typography>
      <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700' }}>
        {isLoading && <SkeletonBlock height={100} />}
        {isError && <div style={{ color: '#B30700', padding: 8 }}>Failed to load scores.</div>}
        {!isLoading && !isError && (
          <List>
            {(data?.scores || []).map((s, idx) => (
              <ListItem key={idx}>
                <ListItemText primary={`${s.entity ?? 'Org'} - ${s.family ?? 'Family'}: ${s.score ?? ''}`} sx={{ color: '#F1A501' }} />
              </ListItem>
            ))}
            {(!data?.scores || data.scores.length === 0) && (
              <ListItem><ListItemText primary="No scores yet." sx={{ color: '#F1A501' }} /></ListItem>
            )}
          </List>
        )}
      </Paper>
    </Box>
  )
}

export default Scores
