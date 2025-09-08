import React from 'react'
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, Paper, Grid, Stack, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../lib/api'
import type { DocResult } from '../lib/types'
import SkeletonBlock from '../components/SkeletonBlock'
import { useOrg } from '../context/OrgContext'

const Documents: React.FC = () => {
  const { orgId } = useOrg()
  const [q, setQ] = React.useState('')
  const [ticker, setTicker] = React.useState('')
  const [mode, setMode] = React.useState<'vector' | 'keyword'>('vector')
  const [selected, setSelected] = React.useState<DocResult | null>(null)
  const { data, isFetching, refetch, isError } = useQuery({
    queryKey: ['docs', orgId, q, mode],
    enabled: false,
    queryFn: async () => {
      const path = mode === 'vector'
        ? `/api/docs/search?q=${encodeURIComponent(q)}&org_id=${orgId}`
        : `/api/docs/search/keyword?q=${encodeURIComponent(q)}&org_id=${orgId}`
      return apiGet<{ results: DocResult[] }>(path)
    },
  })

  const results = data?.results ?? []

  const fetchNews = async () => {
    await apiPost('/api/agents/news', { query: q, org: String(orgId) })
    await refetch()
  }

  const fetchFilings = async () => {
    await apiPost('/api/agents/filings', { ticker: ticker || undefined, org: q || undefined })
    await refetch()
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Documents</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField variant="outlined" size="small" placeholder="Search documents" value={q} onChange={e => setQ(e.target.value)}
          InputProps={{ sx: { color: '#F1A501' } }}
          sx={{ input: { color: '#F1A501' }, label: { color: '#F1A501' }, flex: 1 }}
        />
        <ToggleButtonGroup exclusive value={mode} onChange={(_, v) => v && setMode(v)} size="small">
          <ToggleButton value="vector" sx={{ color: '#F1A501', borderColor: '#B30700' }}>Vector</ToggleButton>
          <ToggleButton value="keyword" sx={{ color: '#F1A501', borderColor: '#B30700' }}>Keyword</ToggleButton>
        </ToggleButtonGroup>
        <TextField variant="outlined" size="small" placeholder="Ticker (e.g., ACMEX)" value={ticker} onChange={e => setTicker(e.target.value)}
          InputProps={{ sx: { color: '#F1A501' } }}
          sx={{ input: { color: '#F1A501' }, label: { color: '#F1A501' }, width: 200 }}
        />
        <Button variant="outlined" onClick={() => refetch()} disabled={isFetching} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Search</Button>
        <Button variant="outlined" onClick={fetchNews} disabled={isFetching} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Fetch Recent News</Button>
        <Button variant="outlined" onClick={fetchFilings} disabled={isFetching} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Fetch Filings</Button>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700', p: 1 }}>
            {isFetching && <SkeletonBlock height={100} />}
            {isError && <div style={{ color: '#B30700' }}>Search failed. Try again.</div>}
            {!isFetching && !isError && (
              <List>
                {results.map((r) => (
                  <ListItem key={r.id} button onClick={() => setSelected(r)}>
                    <ListItemText primary={r.title} secondary={r.snippet} sx={{ color: '#F1A501' }} />
                  </ListItem>
                ))}
                {results.length === 0 && <ListItem><ListItemText primary={'No results yet.'} sx={{ color: '#F1A501' }} /></ListItem>}
              </List>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700', p: 1, minHeight: 240 }}>
            {selected ? (
              <iframe title="doc" src={selected.url} style={{ width: '100%', height: 360, border: 'none', background: '#000' }} />
            ) : (
              <div style={{ color: '#F1A501' }}>Select a document to preview.</div>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Documents
