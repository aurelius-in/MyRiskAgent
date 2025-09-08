import React from 'react'
import { Box, Typography, TextField, Button, Chip, Paper } from '@mui/material'
import { apiPost } from '../lib/api'

interface AskResponse { answer: string; citations: { id: string; title?: string; url?: string }[] }

const Ask: React.FC = () => {
  const [question, setQuestion] = React.useState('')
  const [answer, setAnswer] = React.useState('')
  const [cites, setCites] = React.useState<AskResponse['citations']>([])
  const [loading, setLoading] = React.useState(false)

  const ask = async () => {
    setLoading(true)
    try {
      const res = await apiPost<AskResponse>('/api/ask', { question })
      setAnswer(res.answer || '')
      setCites(res.citations || [])
    } catch (e) {
      setAnswer('')
      setCites([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Ask</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
      </Box>
      {answer && (
        <Paper sx={{ p: 2, bgcolor: '#111', border: '1px solid #B30700' }}>
          <div style={{ color: '#F1A501', marginBottom: 8 }}>{answer}</div>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {cites.map((c) => (
              <Chip key={c.id} label={c.title || c.id} component="a" href={c.url} target="_blank" clickable sx={{ color: '#F1A501', borderColor: '#B30700' }} variant="outlined" />
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  )
}

export default Ask
