import React from 'react'
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableSortLabel, TextField, Button } from '@mui/material'
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
  const [industry, setIndustry] = React.useState('')
  const [region, setRegion] = React.useState('')

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
      (region ? String(p.region || '').toLowerCase().includes(region.toLowerCase()) : true)
    )
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[orderBy] ?? 0
      const bVal = b[orderBy] ?? 0
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return order === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [data, orderBy, order, industry, region])

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<any>(null)
  const openDetail = async (providerId: number) => {
    const d = await apiGet(`/api/providers/${providerId}/detail?org_id=${orgId}`)
    setDetail(d)
    setDetailOpen(true)
  }

  const exportCsv = () => {
    exportToCsv(`providers_${orgId}.csv`, rows as any)
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Providers</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="Industry" value={industry} onChange={e => setIndustry(e.target.value)} sx={{ input: { color: '#F1A501' } }} />
        <TextField size="small" placeholder="Region" value={region} onChange={e => setRegion(e.target.value)} sx={{ input: { color: '#F1A501' } }} />
        <Button variant="outlined" onClick={exportCsv} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Export CSV (client)</Button>
        <Button variant="outlined" onClick={downloadServerCsv} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Download CSV (API)</Button>
      </Box>
      <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700' }}>
        {isLoading && <SkeletonBlock height={160} />}
        {isError && <ErrorState message="Failed to load providers." />}
        {!isLoading && !isError && rows.length === 0 && <EmptyState message="No providers match your filters." />}
        {!isLoading && !isError && rows.length > 0 && (
          <Table size="small">
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
                  <TableCell sx={{ color: '#F1A501' }}>{r.provider_id}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }} align="right">{r.total_amount.toFixed(2)}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }} align="right">{r.avg_amount.toFixed(2)}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }} align="right">{r.n_claims}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }}>{r.industry || ''}</TableCell>
                  <TableCell sx={{ color: '#F1A501' }}>{r.region || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
      <ProviderDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} detail={detail || undefined} />
    </Box>
  )
}

export default Providers
