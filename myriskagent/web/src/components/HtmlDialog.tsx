import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface HtmlDialogProps {
  open: boolean
  title?: string
  html: string
  onClose: () => void
  actions?: React.ReactNode
}

const HtmlDialog: React.FC<HtmlDialogProps> = ({ open, title = 'Preview', html, onClose, actions }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ bgcolor: '#000', color: '#F1A501', fontFamily: 'Special Elite, serif' }}>
        {title}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: '#F1A501' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#000' }}>
        <Box sx={{ maxHeight: '70vh', overflowY: 'auto', p: 1, border: '1px solid #222', bgcolor: '#0a0a0a' }}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#000', borderTop: '1px solid #111' }}>
        {actions}
        {!actions && (
          <>
            <Button onClick={() => window.print()} sx={{ color: '#F1A501', borderColor: '#B30700' }} variant="outlined">Print</Button>
            <Button onClick={() => {
              try {
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'executive_brief.html'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              } catch {}
            }} sx={{ color: '#F1A501', borderColor: '#B30700' }} variant="outlined">Export HTML</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default HtmlDialog
