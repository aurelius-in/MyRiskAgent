import React from 'react'
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, Paper, Grid, Stack, ToggleButtonGroup, ToggleButton, Autocomplete } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../lib/api'
import type { DocResult } from '../lib/types'
import SkeletonBlock from '../components/SkeletonBlock'
import { useOrg } from '../context/OrgContext'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import DocumentViewer from '../components/DocumentViewer'

const Documents: React.FC = () => {
  const { orgId } = useOrg()
  const [q, setQ] = React.useState('')
  const [ticker, setTicker] = React.useState('')
  const [mode, setMode] = React.useState<'vector' | 'keyword'>('vector')
  const [selected, setSelected] = React.useState<DocResult | null>(null)
  const [domain, setDomain] = React.useState<string | null>(null)
  const [recentLimit, setRecentLimit] = React.useState<number>(10)
  const [pinned, setPinned] = React.useState<DocResult[]>(() => {
    try { const raw = localStorage.getItem('mra_pinned_docs'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })

  const recent = useQuery({
    queryKey: ['docs-recent', orgId, recentLimit],
    queryFn: async () => apiGet<{ results: DocResult[] }>(`/api/docs/recent?org_id=${orgId}&limit=${recentLimit}`),
    staleTime: 60_000,
  })

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

  const results = (data?.results ?? []).filter(r => {
    if (!domain) return true
    try { return (r.url || '').includes(domain) } catch { return true }
  })
  const domainOptions = React.useMemo(() => {
    const urls = (data?.results ?? []).map(r => r.url || '')
    const hosts = urls.map(u => { try { return new URL(u).host } catch { return '' } }).filter(Boolean)
    return Array.from(new Set(hosts))
  }, [data])

  const togglePin = (doc: DocResult) => {
    setPinned(prev => {
      const exists = prev.find(d => String(d.id) === String(doc.id))
      const next = exists ? prev.filter(d => String(d.id) !== String(doc.id)) : [{ id: doc.id, title: doc.title, url: doc.url, snippet: doc.snippet }, ...prev]
      try { localStorage.setItem('mra_pinned_docs', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const fetchNews = async () => {
    await apiPost('/api/agents/news', { query: q, org: String(orgId) })
    await Promise.all([recent.refetch(), refetch()])
  }

  const fetchFilings = async () => {
    await apiPost('/api/agents/filings', { ticker: ticker || undefined, org: q || undefined })
    await Promise.all([recent.refetch(), refetch()])
  }

  const showRecent = (!isFetching && !isError && results.length === 0)

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
        <Autocomplete options={domainOptions} value={domain} onChange={(_, v) => setDomain(v)} renderInput={(params) => <TextField {...params} size="small" placeholder="Domain filter" />} sx={{ width: 220 }} />
        <Button variant="outlined" onClick={() => refetch()} disabled={isFetching} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Search</Button>
        <Button variant="outlined" onClick={fetchNews} disabled={isFetching} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Fetch Recent News</Button>
        <Button variant="outlined" onClick={fetchFilings} disabled={isFetching} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Fetch Filings</Button>
        <Button variant="outlined" onClick={() => { setQ(''); setTicker(''); setDomain(null); setSelected(null) }} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Clear</Button>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700', p: 1 }}>
            {!!pinned.length && (
              <>
                <Typography variant="subtitle1" sx={{ color: '#B30700', fontFamily: 'Special Elite, serif' }}>Pinned</Typography>
                <List>
                  {pinned.map((r) => (
                    <ListItem key={`pin-${r.id}`} button onClick={() => setSelected(r)}>
                      <ListItemText primary={r.title} secondary={r.snippet} sx={{ color: '#F1A501' }} />
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ borderColor: '#222', my: 1 }} />
              </>
            )}
            {isFetching && <SkeletonBlock height={100} />}
            {isError && <ErrorState message="Search failed. Try again." />}
            {!isFetching && !isError && (
              <>
                <List>
                  {results.map((r) => (
                    <ListItem key={r.id} button onClick={() => setSelected(r)}>
                      <ListItemText primary={r.title} secondary={r.snippet} sx={{ color: '#F1A501' }} />
                    </ListItem>
                  ))}
                  {results.length === 0 && recent.data && recent.data.results && recent.data.results.map((r) => (
                    <ListItem key={`recent-${r.id}`} button onClick={() => setSelected(r)}>
                      <ListItemText primary={r.title} secondary={r.snippet} sx={{ color: '#F1A501' }} />
                    </ListItem>
                  ))}
                  {results.length === 0 && (!recent.data || (recent.data.results || []).length === 0) && (
                    <EmptyState message="No results yet." />
                  )}
                </List>
                {showRecent && (
                  <Box sx={{ textAlign: 'center', pb: 1 }}>
                    <Button size="small" onClick={() => setRecentLimit(l => l + 10)}>Load more</Button>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700', p: 1, minHeight: 240 }}>
            <DocumentViewer doc={selected} onTogglePin={togglePin} isPinned={!!selected && !!pinned.find(d => String(d.id) === String(selected.id))} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Documents
