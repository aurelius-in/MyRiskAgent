import React from 'react'
import { List, ListItem, ListItemText, Paper, Chip, Stack } from '@mui/material'

export interface SanctionFlag { name: string; list: string; score: number; source_url: string }

interface SanctionsListProps { items: SanctionFlag[] }

const SanctionsList: React.FC<SanctionsListProps> = ({ items }) => {
  return (
    <Paper sx={{ p: 1, bgcolor: '#111', border: '1px solid #B30700' }}>
      <List>
        {items.map((f, idx) => {
          const sev = f.score >= 0.8 ? 'High' : f.score >= 0.5 ? 'Medium' : 'Low'
          return (
            <ListItem key={idx} component="a" href={f.source_url} target="_blank">
              <ListItemText primary={`${f.name} (${f.list})`} secondary={f.source_url} sx={{ color: '#F1A501' }} />
              <Stack direction="row" spacing={1}>
                <Chip label={`Score ${f.score.toFixed(2)}`} sx={{ bgcolor: '#111', border: '1px solid #B30700', color: '#F1A501' }} />
                <Chip label={sev} sx={{ bgcolor: sev === 'High' ? '#330000' : sev === 'Medium' ? '#332200' : '#002233', border: '1px solid #B30700', color: '#F1A501' }} />
              </Stack>
            </ListItem>
          )
        })}
        {items.length === 0 && <ListItem><ListItemText primary="No sanctions matches." sx={{ color: '#F1A501' }} /></ListItem>}
      </List>
    </Paper>
  )
}

export default SanctionsList
