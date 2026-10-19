import type { Tx } from '@prayertools/shared/db/scope'
import { goalProgress, prayingNow, statTotals } from '@prayertools/shared/stats'
import type { CampaignRow } from '@prayertools/shared/subscriptions'
import type { GoalProgressView, StatsView } from '../../shared/view'

export async function progressFor(tx: Tx, c: CampaignRow, defaultMinutes: number): Promise<GoalProgressView> {
  return await goalProgress(tx, c, defaultMinutes)
}

export async function statsFor(tx: Tx, c: CampaignRow, defaultMinutes: number): Promise<StatsView> {
  const [progress, totals, now, commitments] = [
    await progressFor(tx, c, defaultMinutes),
    await statTotals(tx, c.id),
    await prayingNow(tx),
    await tx
      .selectFrom('pt_commitment as cm')
      .innerJoin('pt_subscription as s', 's.id', 'cm.subscription_id')
      .select(eb => eb.fn.countAll<string>().as('n'))
      .where('cm.campaign_id', '=', c.id)
      .where('cm.paused', '=', false)
      .where('s.status', 'in', ['active', 'completed'])
      .where(eb => eb.or([eb('s.verified_at', 'is not', null), eb('s.delivery', '=', 'app')]))
      .executeTakeFirst()
  ]
  return {
    progress,
    commitments: Number(commitments?.n ?? 0),
    prayers: totals.prayers ?? 0,
    prayerMinutes: Math.round((totals.prayer_seconds ?? 0) / 60),
    groupPrayers: totals.group_prayers ?? 0,
    shareSignups: totals.share_signups ?? 0,
    prayingNow: now
  }
}
