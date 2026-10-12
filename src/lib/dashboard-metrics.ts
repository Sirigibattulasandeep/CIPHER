import type { Finding, Severity } from './contracts';

export const severityOrder: Severity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

/**
 * The exposure index is a prioritization heuristic, not a probability.
 * Start with the highest open finding and add five points for each additional
 * independent source family represented, capped at three corroborating families.
 * Repeated findings from one source family cannot inflate the index.
 */
export function aggregateExposure(findings: Finding[]): number {
  const active = findings.filter(item => item.status !== 'RESOLVED' && item.status !== 'FALSE_POSITIVE');
  if (!active.length) return 0;
  const highest = Math.max(...active.map(item => item.riskScore));
  const channels = new Set(active.filter(item => item.riskScore >= 35).map(item => item.source));
  const corroborationPoints = Math.min(15, Math.max(0, channels.size - 1) * 5);
  return Math.min(100, highest + corroborationPoints);
}

export function severityCounts(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

