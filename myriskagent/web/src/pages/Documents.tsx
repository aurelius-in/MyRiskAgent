import React from 'react'
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, Paper } from '@mui/material'
import { apiGet } from '../lib/api'
import type { DocResult } from '../lib/types'

const Documents: React.FC = () => {
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<DocResult[]>([])
  const [loading, setLoading] = React.useState(false)

  const search = async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ results: DocResult[] }>(`/api/docs/search?q=${encodeURIComponent(q)}`)
      setResults(data.results || [])
    } catch (e) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Documents</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField variant="outlined" size="small" placeholder="Search documents" value={q} onChange={e => setQ(e.target.value)}
          InputProps={{ sx: { color: '#F1A501' } }}
          sx={{ input: { color: '#F1A501' }, label: { color: '#F1A501' } }}
        />
        <Button variant="outlined" onClick={search} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Search</Button>
      </Box>
      <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700' }}>
        <List>
          {results.map((r) => (
            <ListItem key={r.id} component="a" href={r.url || '#'} target="_blank">
              <ListItemText primary={r.title} secondary={r.snippet} sx={{ color: '#F1A501' }} />
            </ListItem>
          ))}
          {results.length === 0 && <ListItem><ListItemText primary={loading ? 'Loading...' : 'No results yet.'} sx={{ color: '#F1A501' }} /></ListItem>}
        </List>
      </Paper>
    </Box>
  )
}

export default Documents
