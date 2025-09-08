import React from 'react'
import { Box, Typography, List, ListItem, ListItemText, Paper, Divider, Button, Slider, TextField, Snackbar, Alert } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import SkeletonBlock from '../components/SkeletonBlock'
import OutliersTable from '../components/OutliersTable'
import type { ScoresListResp, OutliersResp } from '../lib/types'
import { exportToCsv } from '../lib/csv'
import { useOrg } from '../context/OrgContext'
import ProviderDetailDialog from '../components/ProviderDetailDialog'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const Scores: React.FC = () => {
  const { orgId } = useOrg()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['scores', orgId, 'latest'],
    queryFn: async () => apiGet<ScoresListResp>(`/api/scores/${orgId}/latest`),
  })

  const [industry, setIndustry] = React.useState('')
  const [region, setRegion] = React.useState('')

  const outliers = useQuery({
    queryKey: ['outliers', orgId, 'latest', industry, region],
    queryFn: async () => apiGet<OutliersResp>(`/api/outliers/providers?org_id=${orgId}&period=latest${industry ? `&industry=${encodeURIComponent(industry)}` : ''}${region ? `&region=${encodeURIComponent(region)}` : ''}`),
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
    try {
      const resp = await fetch(`/api/ingest/claims?org_id=${orgId}`, { method: 'POST', body: form })
      if (!resp.ok) throw new Error('upload failed')
      await Promise.all([refetch(), outliers.refetch()])
      setToast({ open: true, kind: 'success', msg: 'Claims uploaded' })
    } catch {
      setToast({ open: true, kind: 'error', msg: 'Upload failed' })
    }
    e.target.value = ''
  }

  const [minScore, setMinScore] = React.useState<number>(0)

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<any>(null)
  const [toast, setToast] = React.useState<{ open: boolean; kind: 'success' | 'error'; msg: string }>({ open: false, kind: 'success', msg: '' })
  const openDetail = async (providerId: number) => {
    const d = await apiGet(`/api/providers/${providerId}/detail?org_id=${orgId}`)
    setDetail(d)
    setDetailOpen(true)
  }

  const filtered = (outliers.data?.providers || []).filter(p => (p.score ?? 0) >= minScore)

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Scores</Typography>
      <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700', mb: 2 }}>
        {isLoading && <SkeletonBlock height={100} />}
        {isError && <ErrorState message="Failed to load scores." />}
        {!isLoading && !isError && (
          <List>
            {(data?.scores || []).map((s, idx) => (
              <ListItem key={idx}>
                <ListItemText primary={`${s.entity ?? 'Org'} - ${s.family ?? 'Family'}: ${s.score ?? ''}`} sx={{ color: '#F1A501' }} />
              </ListItem>
            ))}
            {(!data?.scores || data.scores.length === 0) && <EmptyState message="No scores yet." />}
          </List>
        )}
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" gutterBottom>Provider Outliers</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="Industry" value={industry} onChange={e => setIndustry(e.target.value)} sx={{ input: { color: '#F1A501' } }} />
          <TextField size="small" placeholder="Region" value={region} onChange={e => setRegion(e.target.value)} sx={{ input: { color: '#F1A501' } }} />
          <Button variant="outlined" onClick={exportOutliers} disabled={outliers.isLoading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Export CSV</Button>
          <input ref={fileInputRef} type="file" accept=".csv,.parquet,.pq" style={{ display: 'none' }} onChange={onFileChange} />
          <Button variant="outlined" onClick={onUploadClick} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Upload Claims</Button>
        </Box>
      </Box>

      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ color: '#F1A501' }}>Min Score: {minScore.toFixed(0)}</Typography>
        <Slider value={minScore} onChange={(_, v) => setMinScore(v as number)} min={0} max={100} step={1} sx={{ color: '#B30700' }} />
      </Box>

      <Paper sx={{ bgcolor: '#111', border: '1px solid #B30700' }}>
        {outliers.isLoading && <SkeletonBlock height={160} />}
        {outliers.isError && <ErrorState message="Failed to load outliers." />}
        {!outliers.isLoading && !outliers.isError && filtered.length === 0 && <EmptyState message="No outliers match your filters." />}
        {!outliers.isLoading && !outliers.isError && filtered.length > 0 && <OutliersTable rows={filtered} onSelect={openDetail} />}
      </Paper>

      <ProviderDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} detail={detail || undefined} />
      <Snackbar open={toast.open} autoHideDuration={2000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.kind} sx={{ bgcolor: '#111', color: '#F1A501', border: '1px solid #B30700' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  )
}

export default Scores
