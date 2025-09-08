import React from 'react'
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Stack, Chip, Button, Box } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ReactECharts from 'echarts-for-react'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

interface ProviderDetail {
  provider_id: number
  org_id: number
  count: number
  total: number
  avg: number
  series: { date: string; amount: number }[]
  notes?: string
}

interface Props {
  open: boolean
  onClose: () => void
  detail?: ProviderDetail
}

const ProviderDetailDialog: React.FC<Props> = ({ open, onClose, detail }) => {
  const values = (detail?.series || []).map(s => s.amount)
  const mean = values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0
  const std = values.length ? Math.sqrt(values.map(v => (v-mean)*(v-mean)).reduce((a,b)=>a+b,0)/values.length) : 1
  const spikes = new Set<number>()
  (detail?.series || []).forEach((s, idx) => { if (std>0 && Math.abs(s.amount - mean) > 2 * std) spikes.add(idx) })
  const option = {
    backgroundColor: 'transparent',
    xAxis: { type: 'category', data: (detail?.series || []).map(s => s.date), axisLabel: { color: '#F1A501' } },
    yAxis: { type: 'value', axisLabel: { color: '#F1A501' } },
    series: [{ type: 'line', data: (detail?.series || []).map((s, idx) => ({ value: s.amount, itemStyle: spikes.has(idx) ? { color: '#B30700' } : undefined })), lineStyle: { color: '#F1A501' } }],
  }
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ bgcolor: '#000', color: '#F1A501', fontFamily: 'Special Elite, serif' }}>
        Provider {detail?.provider_id}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: '#F1A501' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#000' }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          <Chip label={`Claims ${detail?.count ?? 0}`} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />
          <Chip label={`Total ${detail?.total?.toFixed(2) ?? '0.00'}`} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />
          <Chip label={`Avg ${detail?.avg?.toFixed(2) ?? '0.00'}`} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Button onClick={async () => {
            const resp = await fetch(`/api/evidence/download/provider/${detail?.provider_id}/${detail?.org_id ?? ''}`)
            if (!resp.ok) return
            const blob = await resp.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `evidence_provider_${detail?.provider_id}_${detail?.org_id}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }}>Download Evidence ZIP</Button>
          <Button onClick={async () => {
            if (!detail) return
            const header = 'date,amount\n'
            const rows = (detail.series || []).map(s => `${s.date},${s.amount}`).join('\n')
            const csv = header + rows + (rows ? '\n' : '')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `provider_${detail.provider_id}_series.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }}>Export CSV</Button>
        </Box>
        <ReactECharts option={option} style={{ height: 240 }} />
        {(() => {
          const s = detail?.series || []
          if (s.length < 2) return null
          const diffs = [] as { idx: number; from: string; to: string; delta: number }[]
          for (let i = 1; i < s.length; i++) {
            diffs.push({ idx: i, from: s[i-1].date, to: s[i].date, delta: s[i].amount - s[i-1].amount })
          }
          const top = diffs.sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3)
          return (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ color: '#F1A501', mb: 0.5 }}>Top deviations</Typography>
              <Stack spacing={0.5}>
                {top.map((d, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ color: '#F1A501' }}>
                    {d.delta >= 0 ? <ArrowUpwardIcon fontSize="small" sx={{ color: '#B30700' }} /> : <ArrowDownwardIcon fontSize="small" sx={{ color: '#B30700' }} />}
                    <Typography variant="body2">{d.from} → {d.to}: {d.delta >= 0 ? '+' : ''}{d.delta.toFixed(2)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )
        })()}
        {detail?.notes && (
          <Typography sx={{ color: '#F1A501', mt: 1, whiteSpace: 'pre-wrap' }}>{detail.notes}</Typography>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ProviderDetailDialog
