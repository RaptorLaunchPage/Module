// Business logic for monthly team evaluation and incentives

export type Tier = 'godtier' | 'T1' | 'T2' | 'T3' | 'T4'

export type TrialPhase = 'none' | 'trial' | 'extended'

export interface MonthlyInput {
  teamId: string
  teamName?: string
  month: string // YYYY-MM
  currentTier: Tier
  slotsPlayed: number
  slotsWon: number
  slotPricePerSlot: number // prize per slot when won
  slotCostPerSlot: number // cost per slot when played
  tournamentWinnings?: number // optional gross for the month
  trialPhase: TrialPhase
  trialWeeksUsed?: number // 0-2 for initial, up to 3 if extended
}

export interface MonthlyOutcome {
  winPercentage: number
  updatedTier: Tier
  statusUpdate: 'promoted' | 'retained' | 'demoted' | 'exited'
  sponsorshipStatus: 'trial' | 'sponsored' | 'exited' | 'none'
  trial: {
    extensionGranted: boolean
    extensionWeeks: number
  }
  incentives: {
    monthlyPrizePool: number
    monthlyCost: number
    surplus: number
    orgShare: number
    teamShare: number
    splitRule: 'surplus_30_70' | 'tournament_override_50_50'
  }
}

const tierOrder: Tier[] = ['T4', 'T3', 'T2', 'T1', 'godtier']

function nextTier(tier: Tier): Tier {
  const idx = tierOrder.indexOf(tier)
  return tierOrder[Math.min(idx + 1, tierOrder.length - 1)]
}

function prevTier(tier: Tier): Tier {
  const idx = tierOrder.indexOf(tier)
  return tierOrder[Math.max(idx - 1, 0)]
}

export function computeMonthlyOutcome(input: MonthlyInput): MonthlyOutcome {
  const slotsPlayed = Math.max(0, input.slotsPlayed || 0)
  const slotsWon = Math.max(0, Math.min(slotsPlayed, input.slotsWon || 0))
  const winPercentage = slotsPlayed === 0 ? 0 : (slotsWon / slotsPlayed) * 100

  // Incentives baseline (surplus-based)
  const monthlyPrizePool = (input.slotPricePerSlot || 0) * slotsWon
  const monthlyCost = (input.slotCostPerSlot || 0) * slotsPlayed
  const surplus = monthlyPrizePool - monthlyCost

  // Tournament override if > 20000
  const tournament = input.tournamentWinnings || 0
  const tournamentOverride = tournament > 20000

  let splitRule: MonthlyOutcome['incentives']['splitRule'] = 'surplus_30_70'
  let orgShare = 0
  let teamShare = 0

  if (tournamentOverride) {
    splitRule = 'tournament_override_50_50'
    const org = Math.round(tournament * 0.5)
    const team = tournament - org
    orgShare = org
    teamShare = team
  } else if (surplus > 0) {
    const org = Math.round(surplus * 0.3)
    const team = surplus - org
    orgShare = org
    teamShare = team
  } else {
    orgShare = 0
    teamShare = 0
  }

  // Tier and status updates
  let updatedTier: Tier = input.currentTier
  let statusUpdate: MonthlyOutcome['statusUpdate'] = 'retained'
  let sponsorshipStatus: MonthlyOutcome['sponsorshipStatus'] = 'none'
  let extensionGranted = false
  let extensionWeeks = 0

  const atLowestTier = input.currentTier === 'T4'

  if (input.trialPhase === 'trial' || input.trialPhase === 'extended') {
    // Trial logic
    if (winPercentage >= 50) {
      sponsorshipStatus = 'sponsored'
      statusUpdate = 'retained'
      // keep tier for sponsored; could adjust based on org policy
    } else if (winPercentage >= 35 && winPercentage < 50) {
      if (input.trialPhase === 'trial') {
        extensionGranted = true
        extensionWeeks = 1
        sponsorshipStatus = 'trial'
        statusUpdate = 'retained'
      } else {
        // already extended, still < 50 -> exit
        sponsorshipStatus = 'exited'
        statusUpdate = 'exited'
      }
    } else {
      // < 35%
      if (input.trialPhase === 'trial') {
        // can still consider extension if org wants; spec says grant extension only for 35-50
        sponsorshipStatus = 'exited'
        statusUpdate = 'exited'
      } else {
        sponsorshipStatus = 'exited'
        statusUpdate = 'exited'
      }
    }
  } else {
    // Existing teams
    if (winPercentage > 50) {
      updatedTier = nextTier(input.currentTier)
      statusUpdate = updatedTier === input.currentTier ? 'retained' : 'promoted'
      sponsorshipStatus = 'none'
    } else if (winPercentage >= 35 && winPercentage <= 50) {
      statusUpdate = 'retained'
      sponsorshipStatus = 'none'
    } else {
      // < 35%
      if (atLowestTier) {
        statusUpdate = 'exited'
        sponsorshipStatus = 'exited'
      } else {
        updatedTier = prevTier(input.currentTier)
        statusUpdate = 'demoted'
        sponsorshipStatus = 'none'
      }
    }
  }

  return {
    winPercentage: Number(winPercentage.toFixed(2)),
    updatedTier,
    statusUpdate,
    sponsorshipStatus,
    trial: {
      extensionGranted,
      extensionWeeks,
    },
    incentives: {
      monthlyPrizePool,
      monthlyCost,
      surplus,
      orgShare,
      teamShare,
      splitRule,
    },
  }
}