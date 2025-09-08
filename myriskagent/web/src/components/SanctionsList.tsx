import React from 'react'
import { List, ListItem, ListItemText, Paper } from '@mui/material'

export interface SanctionFlag { name: string; list: string; score: number; source_url: string }

interface SanctionsListProps { items: SanctionFlag[] }

const SanctionsList: React.FC<SanctionsListProps> = ({ items }) => {
  return (
    <Paper sx={{ p: 1, bgcolor: '#111', border: '1px solid #B30700' }}>
      <List>
        {items.map((f, idx) => (
          <ListItem key={idx} component="a" href={f.source_url} target="_blank">
            <ListItemText primary={`${f.name} (${f.list})`} secondary={`score: ${f.score.toFixed(2)}`} sx={{ color: '#F1A501' }} />
          </ListItem>
        ))}
        {items.length === 0 && <ListItem><ListItemText primary="No sanctions matches." sx={{ color: '#F1A501' }} /></ListItem>}
      </List>
    </Paper>
  )
}

export default SanctionsList
