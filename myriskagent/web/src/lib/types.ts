export interface DocResult {
  id: number | string
  title?: string
  url?: string
  snippet?: string
}

export interface ScoreFamily { score: number; confidence: number }
export interface ProfileResp { scores: Record<string, ScoreFamily> }

export interface ProviderOutlierRow {
  provider_id: number
  provider_name?: string
  score: number
  z_total_amount?: number
  z_avg_amount?: number
  z_n_claims?: number
}

export interface OutliersResp { providers: ProviderOutlierRow[] }
export interface ScoresListResp { scores: { entity?: string; family?: string; score?: number }[] }

export interface SanctionFlag { name: string; list: string; score: number; source_url: string }
export interface SanctionsResp { count: number; flags: SanctionFlag[] }
