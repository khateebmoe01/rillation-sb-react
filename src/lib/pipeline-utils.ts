// Pipeline stage utilities

// Define pipeline stages in order (deepest/most advanced last)
export const PIPELINE_STAGES_ORDERED = [
  'Showed Up to Disco',
  'Qualified',
  'Demo Booked',
  'Showed Up to Demo',
  'Proposal Sent',
  'Closed',
] as const

// Map pipeline stage to boolean column in engaged_leads
export const stageToBooleanMap: Record<string, string> = {
  'Showed Up to Disco': 'showed_up_to_disco',
  'Qualified': 'qualified',
  'Demo Booked': 'demo_booked',
  'Showed Up to Demo': 'showed_up_to_demo',
  'Proposal Sent': 'proposal_sent',
  'Closed': 'closed',
}

// Map boolean column to pipeline stage
export const booleanToStageMap: Record<string, string> = {
  'showed_up_to_disco': 'Showed Up to Disco',
  'qualified': 'Qualified',
  'demo_booked': 'Demo Booked',
  'showed_up_to_demo': 'Showed Up to Demo',
  'proposal_sent': 'Proposal Sent',
  'closed': 'Closed',
}

// Helper to check if a value is truthy (handles various formats)
export const isTruthy = (val: any): boolean => {
  if (val === true || val === 1 || val === '1') return true
  if (typeof val === 'string') {
    const lower = val.toLowerCase()
    return lower === 'true' || lower === 'yes' || lower === 'y'
  }
  return !!val && val !== null && val !== undefined && val !== ''
}

/**
 * Get the deepest (most advanced) pipeline stage for a lead.
 * Returns the stage name or null if the lead isn't in any pipeline stage.
 */
export function getDeepestStage(lead: any): string | null {
  // Iterate from deepest to shallowest stage
  for (let i = PIPELINE_STAGES_ORDERED.length - 1; i >= 0; i--) {
    const stage = PIPELINE_STAGES_ORDERED[i]
    const booleanColumn = stageToBooleanMap[stage]
    if (isTruthy(lead[booleanColumn])) {
      return stage
    }
  }
  return null
}

/**
 * Check if a lead's deepest stage matches the given stage.
 * Use this to filter leads to only show in their deepest stage.
 */
export function isLeadAtDeepestStage(lead: any, stageName: string): boolean {
  return getDeepestStage(lead) === stageName
}

/**
 * Get the stage index (0-based, higher = deeper in pipeline)
 */
export function getStageIndex(stageName: string): number {
  return PIPELINE_STAGES_ORDERED.indexOf(stageName as any)
}





