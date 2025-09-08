export async function apiGet<T>(path: string): Promise<T> {
  const url = path.startsWith('/api') ? path : `/api${path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = path.startsWith('/api') ? path : `/api${path}`
  const res = await fetch(url , {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json()
}

export async function apiGetBlob(path: string): Promise<Blob> {
  const url = path.startsWith('/api') ? path : `/api${path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.blob()
}
