import React from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import type { DocResult } from '../lib/types'

interface Props {
  doc: DocResult | null
}

const DocumentViewer: React.FC<Props> = ({ doc }) => {
  if (!doc) {
    return <div style={{ color: '#F1A501' }}>Select a document to preview.</div>
  }

  const openSource = () => {
    if (doc.url) window.open(doc.url, '_blank')
  }

  const copyLink = async () => {
    if (!doc.url) return
    try {
      await navigator.clipboard.writeText(doc.url)
    } catch {}
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ color: '#F1A501', fontFamily: 'Special Elite, serif' }}>{doc.title || 'Untitled'}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={openSource} disabled={!doc.url}>Open source</Button>
          <Button onClick={copyLink} disabled={!doc.url}>Copy link</Button>
        </Box>
      </Stack>
      {doc.url ? (
        <iframe title="doc" src={doc.url} style={{ width: '100%', height: 360, border: 'none', background: '#000' }} />
      ) : (
        <div style={{ color: '#F1A501', whiteSpace: 'pre-wrap' }}>{doc.snippet || 'No preview available.'}</div>
      )}
    </Box>
  )
}

export default DocumentViewer


