import React from 'react'
import { Box, Grid, Typography, Paper, Button, List, ListItem, ListItemText, Divider } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiPost } from '../lib/api'
import RiskGauge from '../components/RiskGauge'
import TrendSparkline from '../components/TrendSparkline'
import SocialSparkline from '../components/SocialSparkline'
import WhatIfPanel from '../components/WhatIfPanel'
import SkeletonBlock from '../components/SkeletonBlock'
import { useOrg } from '../context/OrgContext'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

interface ScoreFamily { score: number; confidence: number }
interface ProfileResp { scores: Record<string, ScoreFamily> }

const Overview: React.FC = () => {
  const { orgId } = useOrg()
  const [pinned, setPinned] = React.useState<any[]>(() => {
    try { const raw = localStorage.getItem('mra_pinned_docs'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  const { data, refetch, isFetching, isError } = useQuery({
    queryKey: ['profile', orgId, 'latest'],
    queryFn: async () => {
      const resp = await apiPost<ProfileResp>(`/api/risk/recompute/${orgId}/latest`, {})
      return resp
    },
    staleTime: 15_000,
  })
  const social = useQuery({
    queryKey: ['social', orgId],
    queryFn: async () => (await fetch(`/api/social/${orgId}/recent`)).json(),
    staleTime: 60_000,
  })

  const [trend] = React.useState<number[]>(Array.from({ length: 24 }, (_, i) => 40 + i % 6))
  const [open, setOpen] = React.useState(false)

  const fin = data?.scores?.['Financial Health Risk']?.score ?? 42
  const comp = data?.scores?.['Compliance and Reputation Risk']?.score ?? 35
  const op = data?.scores?.['Operational and Outlier Risk']?.score ?? 50
  const combined = data?.scores?.['Combined Index']?.score ?? 44

  const applyWhatIf = async (params: { alpha: number; beta: number; gamma: number; delta: number }) => {
    await apiPost(`/api/risk/recompute/${orgId}/latest`, { params })
    await refetch()
    setOpen(false)
  }

  const downloadEvidence = async () => {
    const res = await fetch(`/api/evidence/org/${orgId}/latest`)
    if (res.ok) {
      const data = await res.json()
      if (data?.uri) {
        window.open(data.uri, '_blank')
      }
    }
  }

  const downloadEvidenceZip = async () => {
    const resp = await fetch(`/api/evidence/download/org/${orgId}/latest`)
    if (!resp.ok) return
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evidence_org_${orgId}_latest.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Overview</Typography>
      {isFetching && <SkeletonBlock height={200} />}
      {isError && <ErrorState message="Failed to load. Retrying may help." />}
      {!isFetching && !isError && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Combined Index</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" onClick={() => setOpen(true)} sx={{ color: '#F1A501', borderColor: '#B30700' }}>What If</Button>
                  <Button variant="outlined" onClick={downloadEvidence} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Evidence</Button>
                  <Button variant="outlined" onClick={downloadEvidenceZip} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Download ZIP</Button>
                </Box>
              </Box>
              <RiskGauge label="Engagement Risk" value={combined} />
              <TrendSparkline values={trend} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Family Scores</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <RiskGauge label="Financial" value={fin} />
                <RiskGauge label="Compliance" value={comp} />
                <RiskGauge label="Operational" value={op} />
              </Box>
            </Paper>
            <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
              <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>Social Signals</Typography>
              {social.isLoading && <SkeletonBlock height={60} />}
              {social.isError && <ErrorState message="Failed to load social signals." />}
              {!social.isLoading && !social.isError && social.data && (social.data.events || []).length === 0 && (
                <EmptyState message="No recent social events." />
              )}
              {!social.isLoading && !social.isError && social.data && (social.data.events || []).length > 0 && <SocialSparkline events={social.data.events || []} />}
              {!social.isLoading && !social.isError && social.data && (
                <Typography sx={{ color: '#F1A501', mt: 1 }}>Online component: {Number(social.data.c_online || 0).toFixed(1)}</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
              <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif', mb: 1 }}>Pinned Documents</Typography>
              {pinned.length === 0 ? (
                <EmptyState message="No pinned documents yet." />)
                : (
                  <List>
                    {pinned.slice(0, 8).map((d, idx) => (
                      <ListItem key={`pin-${idx}`} component="a" href={d.url} target="_blank">
                        <ListItemText primary={d.title} secondary={d.snippet} sx={{ color: '#F1A501' }} />
                      </ListItem>
                    ))}
                  </List>
                )}
            </Paper>
          </Grid>
        </Grid>
      )}
      <WhatIfPanel open={open} onClose={() => setOpen(false)} onChange={applyWhatIf} />
    </Box>
  )
}

export default Overview
