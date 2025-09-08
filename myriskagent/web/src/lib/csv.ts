export function exportToCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows || rows.length === 0) return
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => escape((r as any)[h])).join(','))).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
