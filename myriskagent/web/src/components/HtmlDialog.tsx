import React from 'react'
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface HtmlDialogProps {
  open: boolean
  title?: string
  html: string
  onClose: () => void
}

const HtmlDialog: React.FC<HtmlDialogProps> = ({ open, title = 'Preview', html, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ bgcolor: '#000', color: '#F1A501', fontFamily: 'Special Elite, serif' }}>
        {title}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: '#F1A501' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#000' }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </DialogContent>
    </Dialog>
  )
}

export default HtmlDialog
