import React from 'react'
import { Box, Typography, TextField, Button, Paper, Stack } from '@mui/material'
import { apiPost } from '../lib/api'
import SourceChips from '../components/SourceChips'
import HtmlDialog from '../components/HtmlDialog'
import SanctionsList from '../components/SanctionsList'
import type { SanctionsResp } from '../lib/types'
import { useOrg } from '../context/OrgContext'

interface AskResponse { answer: string; citations: { id: string; title?: string; url?: string }[] }

const Ask: React.FC = () => {
  const { orgId } = useOrg()
  const [question, setQuestion] = React.useState('')
  const [answer, setAnswer] = React.useState('')
  const [cites, setCites] = React.useState<AskResponse['citations']>([])
  const [loading, setLoading] = React.useState(false)
  const [reportHtml, setReportHtml] = React.useState('')
  const [openReport, setOpenReport] = React.useState(false)
  const [sanctions, setSanctions] = React.useState<SanctionsResp | null>(null)

  const ask = async () => {
    setLoading(true)
    try {
      const res = await apiPost<AskResponse>('/api/ask', { question, org_id: orgId })
      setAnswer(res.answer || '')
      setCites(res.citations || [])
    } catch (e) {
      setAnswer('')
      setCites([])
    } finally {
      setLoading(false)
    }
  }

  const execBrief = async () => {
    setLoading(true)
    try {
      const res = await apiPost<{ html: string; summary: unknown }>(`/api/report/executive/${orgId}/latest`, {})
      setReportHtml(res.html || '')
      setOpenReport(true)
    } finally {
      setLoading(false)
    }
  }

  const fullReport = async () => {
    setLoading(true)
    try {
      const res = await apiPost<{ html: string; summary: unknown }>(`/api/report/full/${orgId}/latest`, {})
      setReportHtml(res.html || '')
      setOpenReport(true)
    } finally {
      setLoading(false)
    }
  }

  const checkSanctions = async () => {
    setLoading(true)
    try {
      const res = await apiPost<SanctionsResp>('/api/agents/sanctions', { name: question || 'ACME' })
      setSanctions(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Ask</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Ask a question"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          InputProps={{ sx: { color: '#F1A501' } }}
          sx={{ input: { color: '#F1A501' }, label: { color: '#F1A501' } }}
        />
        <Button variant="outlined" onClick={ask} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Ask</Button>
        <Button variant="outlined" onClick={execBrief} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Executive Brief</Button>
        <Button variant="outlined" onClick={fullReport} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Full Report</Button>
        <Button variant="outlined" onClick={checkSanctions} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Sanctions</Button>
      </Stack>
      {answer && (
        <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700', mb: 2 }}>
          <div style={{ color: '#F1A501', marginBottom: 8 }}>{answer}</div>
          <SourceChips items={cites} />
        </Paper>
      )}
      {sanctions && <SanctionsList items={sanctions.flags || []} />}
      <HtmlDialog open={openReport} onClose={() => setOpenReport(false)} title="Report" html={reportHtml} />
    </Box>
  )
}

export default Ask
