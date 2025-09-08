import React from 'react'
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableSortLabel, TextField, Button, Autocomplete, Snackbar, Alert, Chip, Stack, TableContainer, Switch, FormControlLabel, IconButton, List, ListItem, ListItemText } from '@mui/material'
import StarBorder from '@mui/icons-material/StarBorder'
import Star from '@mui/icons-material/Star'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import { useOrg } from '../context/OrgContext'
import SkeletonBlock from '../components/SkeletonBlock'
import ProviderDetailDialog from '../components/ProviderDetailDialog'
import { exportToCsv } from '../lib/csv'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

interface ProviderRow {
  provider_id: number
  total_amount: number
  avg_amount: number
  n_claims: number
  industry?: string
  region?: string
}

interface ProvidersResp { providers: ProviderRow[] }

type Order = 'asc' | 'desc'

const Providers: React.FC = () => {
  const { orgId } = useOrg()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['providers', orgId],
    queryFn: async () => apiGet<ProvidersResp>(`/api/providers?org_id=${orgId}`),
    staleTime: 15_000,
  })

  const [orderBy, setOrderBy] = React.useState<keyof ProviderRow>('total_amount')
  const [order, setOrder] = React.useState<Order>('desc')
  const [industry, setIndustry] = React.useState<string>(() => { try { return localStorage.getItem('mra_prov_industry') || '' } catch { return '' } })
  const [region, setRegion] = React.useState<string>(() => { try { return localStorage.getItem('mra_prov_region') || '' } catch { return '' } })
  const [query, setQuery] = React.useState<string>(() => { try { return localStorage.getItem('mra_prov_query') || '' } catch { return '' } })
  const [qDebounced, setQDebounced] = React.useState<string>(query)
  const industryOptions = React.useMemo(() => Array.from(new Set((data?.providers || []).map(p => p.industry).filter(Boolean))) as string[], [data])
  const regionOptions = React.useMemo(() => Array.from(new Set((data?.providers || []).map(p => p.region).filter(Boolean))) as string[], [data])

  const handleSort = (key: keyof ProviderRow) => {
    if (orderBy === key) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(key)
      setOrder('desc')
    }
  }

  const rows = React.useMemo(() => {
    const src = data?.providers || []
    const filtered = src.filter(p =>
      (industry ? String(p.industry || '').toLowerCase().includes(industry.toLowerCase()) : true) &&
      (region ? String(p.region || '').toLowerCase().includes(region.toLowerCase()) : true) &&
      (qDebounced ? (
        String(p.provider_id).includes(qDebounced) ||
        String(p.industry || '').toLowerCase().includes(qDebounced.toLowerCase()) ||
        String(p.region || '').toLowerCase().includes(qDebounced.toLowerCase())
      ) : true)
    )
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[orderBy] ?? 0
      const bVal = b[orderBy] ?? 0
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return order === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [data, orderBy, order, industry, region, qDebounced])

  // Persist sort and scroll to top on filter changes
  React.useEffect(() => {
    try {
      localStorage.setItem('mra_prov_order_by', String(orderBy))
      localStorage.setItem('mra_prov_order', order)
    } catch {}
  }, [orderBy, order])

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [qDebounced, industry, region])

  React.useEffect(() => {
    const t = setTimeout(() => setQDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const togglePinProvider = (id: number) => {
    setPinnedProviders(prev => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter(x => x !== id) : [id, ...prev].slice(0, 50)
      try { localStorage.setItem('mra_pinned_providers', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Clear filters
  const clearFilters = () => { setIndustry(''); setRegion(''); setQuery('') }

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<any>(null)
  const [toast, setToast] = React.useState<{ open: boolean; msg: string }>({ open: false, msg: '' })
  const [dense, setDense] = React.useState<boolean>(false)
  const [pinnedProviders, setPinnedProviders] = React.useState<number[]>(() => {
    try { const raw = localStorage.getItem('mra_pinned_providers'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  const openDetail = async (providerId: number) => {
    const d = await apiGet(`/api/providers/${providerId}/detail?org_id=${orgId}`)
    setDetail(d)
    setDetailOpen(true)
  }

  const exportCsv = () => {
    exportToCsv(`providers_${orgId}.csv`, rows as any)
  }

  const copyCsv = async () => {
    const header = ['provider_id','total_amount','avg_amount','n_claims','industry','region']
    const lines = [header.join(',')]
    rows.forEach(r => lines.push(`${r.provider_id},${r.total_amount},${r.avg_amount},${r.n_claims},${r.industry || ''},${r.region || ''}`))
    const csv = lines.join('\n') + '\n'
    try {
      await navigator.clipboard.writeText(csv)
      setToast({ open: true, msg: 'Table copied' })
    } catch {
      setToast({ open: true, msg: 'Copy failed' })
    }
  }

  const downloadServerCsv = async () => {
    const resp = await fetch(`/api/providers/export?org_id=${orgId}`)
    if (!resp.ok) return
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `providers_${orgId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  React.useEffect(() => {
    try {
      localStorage.setItem('mra_prov_industry', industry)
      localStorage.setItem('mra_prov_region', region)
      localStorage.setItem('mra_prov_query', query)
    } catch {}
  }, [industry, region, query])

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Providers</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search id/industry/region" value={query} onChange={e => setQuery(e.target.value)} sx={{ minWidth: 220 }} />
        <Autocomplete
          options={industryOptions}
          value={industry || null}
          onChange={(_, v) => setIndustry(v || '')}
          renderInput={(params) => <TextField {...params} size="small" placeholder="Industry" />}
          sx={{ minWidth: 220 }}
        />
        <Autocomplete
          options={regionOptions}
          value={region || null}
          onChange={(_, v) => setRegion(v || '')}
          renderInput={(params) => <TextField {...params} size="small" placeholder="Region" />}
          sx={{ minWidth: 180 }}
        />
        <Button variant="outlined" onClick={exportCsv} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Export CSV (client)</Button>
        <Button variant="outlined" onClick={downloadServerCsv} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Download CSV (API)</Button>
        <Button variant="outlined" onClick={clearFilters} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Clear</Button>
        <Button variant="outlined" onClick={copyCsv} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Copy CSV</Button>
        <FormControlLabel control={<Switch checked={dense} onChange={(e) => setDense(e.target.checked)} />} label="Dense" sx={{ color: '#F1A501' }} />
      </Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {query && <Chip label={`q: ${query}`} onDelete={() => setQuery('')} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />}
        {industry && <Chip label={`industry: ${industry}`} onDelete={() => setIndustry('')} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />}
        {region && <Chip label={`region: ${region}`} onDelete={() => setRegion('')} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />}
        <Chip label={`${rows.length} rows`} sx={{ bgcolor: '#111', border: '1px solid #333', color: '#F1A501' }} />
        <Button size="small" onClick={() => { setOrderBy('total_amount'); setOrder('desc') }}>Reset Sort</Button>
      </Stack>
      {pinnedProviders.length > 0 && (
        <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700', mb: 2, p: 1 }}>
          <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Pinned Providers</Typography>
          <List>
            {pinnedProviders.map(pid => (
              <ListItem key={`pinprov-${pid}`} secondaryAction={
                <Button size="small" onClick={() => togglePinProvider(pid)} sx={{ color: '#F1A501', borderColor: '#B30700' }} variant="outlined">Unpin</Button>
              }>
                <ListItemText primary={`Provider ${pid}`} sx={{ color: '#F1A501' }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700' }}>
        {isLoading && <SkeletonBlock height={160} />}
        {isError && <ErrorState message="Failed to load providers." />}
        {!isLoading && !isError && rows.length === 0 && <EmptyState message="No providers match your filters." />}
        {!isLoading && !isError && rows.length > 0 && (
          <TableContainer sx={{ maxHeight: 440 }}>
          <Table size={dense ? 'small' : 'medium'} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#F1A501' }}>
                  <TableSortLabel active={orderBy === 'provider_id'} direction={order} onClick={() => handleSort('provider_id')}>Provider</TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: '#F1A501' }}>
                  <TableSortLabel active={orderBy === 'total_amount'} direction={order} onClick={() => handleSort('total_amount')}>Total</TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: '#F1A501' }}>
                  <TableSortLabel active={orderBy === 'avg_amount'} direction={order} onClick={() => handleSort('avg_amount')}>Avg</TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: '#F1A501' }}>
                  <TableSortLabel active={orderBy === 'n_claims'} direction={order} onClick={() => handleSort('n_claims')}>Claims</TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: '#F1A501' }}>Industry</TableCell>
                <TableCell sx={{ color: '#F1A501' }}>Region</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.provider_id} hover style={{ cursor: 'pointer' }} onClick={() => openDetail(r.provider_id)}>
                  <TableCell sx={{ color: '#F1A501', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); togglePinProvider(r.provider_id) }} sx={{ color: '#F1A501' }}>
                      {pinnedProviders.includes(r.provider_id) ? <Star /> : <StarBorder />}
                    </IconButton>
                    {r.provider_id}
                  </TableCell>
                  <TableCell sx={{ color: '#F1A501' }} align="right">{r.total_amount.toFixed(2)}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }} align="right">{r.avg_amount.toFixed(2)}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }} align="right">{r.n_claims}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }}>{r.industry ? <Chip size="small" label={r.industry} onClick={(e) => { e.stopPropagation(); setIndustry(r.industry || '') }} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} /> : ''}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }}>{r.region ? <Chip size="small" label={r.region} onClick={(e) => { e.stopPropagation(); setRegion(r.region || '') }} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} /> : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        )}
      </Paper>
      <ProviderDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} detail={detail || undefined} />
      <Snackbar open={toast.open} autoHideDuration={2000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" sx={{ bgcolor: '#111', color: '#F1A501', border: '1px solid #B30700' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  )
}

export default Providers
