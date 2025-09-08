import React from 'react'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material'

export interface OutlierRow {
  provider_id: number
  score: number
  z_total_amount?: number
  z_avg_amount?: number
  z_n_claims?: number
}

interface OutliersTableProps {
  rows: OutlierRow[]
}

const OutliersTable: React.FC<OutliersTableProps> = ({ rows }) => {
  return (
    <TableContainer component={Paper} sx={{ bgcolor: '#111', border: '1px solid #B30700' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: '#F1A501' }}>Provider</TableCell>
            <TableCell sx={{ color: '#F1A501' }} align="right">Score</TableCell>
            <TableCell sx={{ color: '#F1A501' }} align="right">z(total)</TableCell>
            <TableCell sx={{ color: '#F1A501' }} align="right">z(avg)</TableCell>
            <TableCell sx={{ color: '#F1A501' }} align="right">z(count)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.provider_id}>
              <TableCell sx={{ color: '#F1A501' }}>{r.provider_id}</TableCell>
              <TableCell sx={{ color: '#F1A501' }} align="right">{r.score.toFixed(1)}</TableCell>
              <TableCell sx={{ color: '#F1A501' }} align="right">{r.z_total_amount?.toFixed(2)}</TableCell>
              <TableCell sx={{ color: '#F1A501' }} align="right">{r.z_avg_amount?.toFixed(2)}</TableCell>
              <TableCell sx={{ color: '#F1A501' }} align="right">{r.z_n_claims?.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default OutliersTable
