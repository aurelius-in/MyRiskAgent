import React from 'react'
import { Dialog, DialogTitle, DialogContent, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ReactECharts from 'echarts-for-react'

interface ProviderDetail {
  provider_id: number
  org_id: number
  count: number
  total: number
  avg: number
  series: { date: string; amount: number }[]
}

interface Props {
  open: boolean
  onClose: () => void
  detail?: ProviderDetail
}

const ProviderDetailDialog: React.FC<Props> = ({ open, onClose, detail }) => {
  const option = {
    backgroundColor: 'transparent',
    xAxis: { type: 'category', data: (detail?.series || []).map(s => s.date), axisLabel: { color: '#F1A501' } },
    yAxis: { type: 'value', axisLabel: { color: '#F1A501' } },
    series: [{ type: 'line', data: (detail?.series || []).map(s => s.amount), lineStyle: { color: '#F1A501' } }],
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
        <Typography sx={{ color: '#F1A501', mb: 1 }}>Claims: {detail?.count ?? 0} • Total: {detail?.total?.toFixed(2) ?? '0.00'} • Avg: {detail?.avg?.toFixed(2) ?? '0.00'}</Typography>
        <ReactECharts option={option} style={{ height: 240 }} />
      </DialogContent>
    </Dialog>
  )
}

export default ProviderDetailDialog
