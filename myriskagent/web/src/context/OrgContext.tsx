import React, { createContext, useContext, useEffect, useState } from 'react'

interface OrgState {
  orgId: number
  orgName: string
  setOrg: (orgId: number, orgName: string) => void
}

const OrgContext = createContext<OrgState | undefined>(undefined)

export const OrgProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [orgId, setOrgId] = useState<number>(() => {
    try { const v = localStorage.getItem('mra_org_id'); return v ? Number(v) : 1 } catch { return 1 }
  })
  const [orgName, setOrgName] = useState<string>(() => {
    try { return localStorage.getItem('mra_org_name') || 'ACME' } catch { return 'ACME' }
  })

  const setOrg = (id: number, name: string) => {
    setOrgId(id)
    setOrgName(name)
  }

  useEffect(() => {
    try {
      localStorage.setItem('mra_org_id', String(orgId))
      localStorage.setItem('mra_org_name', orgName)
    } catch {}
  }, [orgId, orgName])

  return (
    <OrgContext.Provider value={{ orgId, orgName, setOrg }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg(): OrgState {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
