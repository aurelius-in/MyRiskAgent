import React from 'react'
import { Box, Typography, TextField, Button, Paper, Stack, FormGroup, FormControlLabel, Checkbox, Snackbar, Alert, Chip } from '@mui/material'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
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
  const [scopeNews, setScopeNews] = React.useState(true)
  const [scopeFilings, setScopeFilings] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<{ open: boolean; msg: string }>({ open: false, msg: '' })
  const [history, setHistory] = React.useState<string[]>(() => { try { const raw = localStorage.getItem('mra_ask_history'); return raw ? JSON.parse(raw) : [] } catch { return [] } })

  const ask = async () => {
    setLoading(true)
    try {
      const scope = [scopeNews ? 'news' : null, scopeFilings ? 'filings' : null].filter(Boolean)
      const res = await apiPost<AskResponse>('/api/ask', { question, org_id: orgId, scope })
      setAnswer(res.answer || '')
      setCites(res.citations || [])
      try { const next = [question, ...history.filter(q => q !== question)].slice(0, 8); setHistory(next); localStorage.setItem('mra_ask_history', JSON.stringify(next)) } catch {}
      setError(null)
    } catch (e) {
      setAnswer('')
      setCites([])
      setError('Ask failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const execBrief = async () => {
    setLoading(true)
    try {
      const res = await apiPost<{ html: string; summary: any }>(`/api/report/executive/${orgId}/latest`, {})
      setReportHtml(`<div style='padding:12px'><h3 style='color:#B30700;font-family:Special Elite,serif'>Executive Brief</h3>${res.html}</div>\n`)
      setOpenReport(true)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const fullReport = async () => {
    setLoading(true)
    try {
      const res = await apiPost<{ html: string; summary: any }>(`/api/report/full/${orgId}/latest`, {})
      setReportHtml(`<div style='padding:12px'><h3 style='color:#B30700;font-family:Special Elite,serif'>Full Report</h3>${res.html}</div>\n`)
      setOpenReport(true)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const checkSanctions = async () => {
    setLoading(true)
    try {
      const res = await apiPost<SanctionsResp>('/api/agents/sanctions', { name: question || 'ACME' })
      setSanctions(res)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async () => {
    const resp = await fetch(`/api/report/pdf/${orgId}/latest`)
    if (!resp.ok) return
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${orgId}_latest.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyCitations = async () => {
    if (!cites || cites.length === 0) return
    const md = cites.map(c => `- [${c.id}](${c.url || ''}) ${c.title || ''}`.trim()).join('\n')
    try {
      await navigator.clipboard.writeText(md)
      setToast({ open: true, msg: 'Citations copied' })
    } catch {
      setToast({ open: true, msg: 'Copy failed' })
    }
  }

  const copyAnswerMarkdown = async () => {
    if (!answer) return
    try {
      // Convert minimal HTML to Markdown: links and line breaks
      let md = answer
      md = md.replace(/<a\s+href=\"([^\"]+)\"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      md = md.replace(/<br\s*\/?>(\n)?/gi, '\n')
      md = md.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '# $1\n')
      md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1')
      md = md.replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '')
      md = md.replace(/<[^>]+>/g, '')
      await navigator.clipboard.writeText(md)
      setToast({ open: true, msg: 'Answer copied' })
    } catch {
      setToast({ open: true, msg: 'Copy failed' })
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontFamily: 'Special Elite, serif', letterSpacing: 0.5 }}>Ask</Typography>
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
        <FormGroup row>
          <FormControlLabel control={<Checkbox checked={scopeNews} onChange={e => setScopeNews(e.target.checked)} sx={{ color: '#F1A501' }} />} label="News" sx={{ color: '#F1A501' }} />
          <FormControlLabel control={<Checkbox checked={scopeFilings} onChange={e => setScopeFilings(e.target.checked)} sx={{ color: '#F1A501' }} />} label="Filings" sx={{ color: '#F1A501' }} />
        </FormGroup>
        <Button variant="outlined" onClick={ask} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Ask</Button>
        <Button variant="outlined" onClick={execBrief} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Executive Brief</Button>
        <Button variant="outlined" onClick={fullReport} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Full Report</Button>
        <Button variant="outlined" onClick={checkSanctions} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Sanctions</Button>
        <Button variant="outlined" onClick={downloadPdf} disabled={loading} sx={{ color: '#F1A501', borderColor: '#B30700' }}>Download PDF</Button>
      </Stack>
      {!!history.length && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          {history.map((h, i) => (
            <Chip key={i} label={h} onClick={() => setQuestion(h)} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />
          ))}
        </Stack>
      )}
      {error && <ErrorState message={error} />}
      {!error && !answer && !loading && <EmptyState message="Ask a question to get started." />}
      {answer && (
        <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700', mb: 2, '& h1,& h2,& h3': { fontFamily: 'Special Elite, serif', color: '#B30700' }, '& p, & li': { color: '#F1A501' } }}>
          <div style={{ color: '#F1A501', marginBottom: 8, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: answer }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <SourceChips items={cites} />
              <Chip size="small" label={`${cites.length} cites`} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={copyAnswerMarkdown}>Copy Answer</Button>
              <Button size="small" onClick={copyCitations}>Copy Citations</Button>
              <Button size="small" onClick={() => { setAnswer(''); setCites([]) }}>Clear</Button>
            </Stack>
          </Stack>
        </Paper>
      )}
      {sanctions && <SanctionsList items={sanctions.flags || []} />}
      <HtmlDialog open={openReport} onClose={() => setOpenReport(false)} title="Report" html={reportHtml} />
      <Snackbar open={toast.open} autoHideDuration={2000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" sx={{ bgcolor: '#111', color: '#F1A501', border: '1px solid #B30700' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  )
}

export default Ask
