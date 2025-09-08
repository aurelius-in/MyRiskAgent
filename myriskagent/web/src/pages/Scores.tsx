import React from 'react'
import { Box, Typography, List, ListItem, ListItemText, Paper, Divider, Button } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import SkeletonBlock from '../components/SkeletonBlock'
import OutliersTable from '../components/OutliersTable'
import type { ScoresListResp, OutliersResp } from '../lib/types'
import { exportToCsv } from '../lib/csv'

const Scores: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['scores', 1, 'latest'],
    queryFn: async () => apiGet<ScoresListResp>('/api/scores/1/latest'),
  })

  const outliers = useQuery({
    queryKey: ['outliers', 1, 'latest'],
    queryFn: async () => apiGet<OutliersResp>('/api/outliers/providers?org_id=1&period=latest'),
  })

  const exportOutliers = () => {
    exportToCsv('provider_outliers.csv', (outliers.data?.providers || []) as any)
  }

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const onUploadClick = () => fileInputRef.current?.click()
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    await fetch('/api/ingest/claims?org_id=1', { method: 'POST', body: form })
    await Promise.all([refetch(), outliers.refetch()])
    e.target.value = ''
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Scores</Typography>
      <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700', mb: 2 }}>
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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" gutterBottom>Provider Outliers</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={exportOutliers} disabled={outliers.isLoading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Export CSV</Button>
          <input ref={fileInputRef} type="file" accept=".csv,.parquet,.pq" style={{ display: 'none' }} onChange={onFileChange} />
          <Button variant="outlined" onClick={onUploadClick} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Upload Claims</Button>
        </Box>
      </Box>
      <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700' }}>
        {outliers.isLoading && <SkeletonBlock height={160} />}
        {outliers.isError && <div style={{ color: '#B30700', padding: 8 }}>Failed to load outliers.</div>}
        {!outliers.isLoading && !outliers.isError && <OutliersTable rows={outliers.data?.providers || []} />}
      </Paper>
    </Box>
  )
}

export default Scores
