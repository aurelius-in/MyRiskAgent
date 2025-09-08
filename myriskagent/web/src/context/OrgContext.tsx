import React, { createContext, useContext, useState } from 'react'

interface OrgState {
  orgId: number
  orgName: string
  setOrg: (orgId: number, orgName: string) => void
}

const OrgContext = createContext<OrgState | undefined>(undefined)

export const OrgProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [orgId, setOrgId] = useState<number>(1)
  const [orgName, setOrgName] = useState<string>('ACME')

  const setOrg = (id: number, name: string) => {
    setOrgId(id)
    setOrgName(name)
  }

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
