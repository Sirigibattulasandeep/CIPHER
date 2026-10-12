import type { Severity } from './contracts';

export type RiskSignal = {
  category: string;
  indicator: string;
  score: number;
  summary: string;
  detail: string;
};

export type RiskScoreBreakdown = {
  category: string;
  indicator: string;
  contribution: number;
  reason: string;
};

export type RiskAssessment = {
  score: number;
  severity: Severity;
  breakdown: RiskScoreBreakdown[];
  scoringVersion: 'sentrix-risk-v1';
};

/**
 * Keep the strongest signal per independent category, then add those
 * contributions and cap at 100. Repeated wording in one category cannot
 * inflate risk; source quality affects confidence separately.
 */
export function assessRisk(signals: RiskSignal[]): RiskAssessment {
  const strongestByCategory = new Map<string, RiskSignal>();
  for (const signal of signals) {
    const score = Number.isFinite(signal.score) ? Math.max(0, Math.min(100, signal.score)) : 0;
    const normalized = { ...signal, score };
    const previous = strongestByCategory.get(signal.category);
    if (!previous || score > previous.score) strongestByCategory.set(signal.category, normalized);
  }

  const breakdown = [...strongestByCategory.values()].map(signal => ({
    category: signal.category,
    indicator: signal.indicator,
    contribution: signal.score,
    reason: signal.summary,
  }));
  const score = Math.min(100, breakdown.reduce((total, item) => total + item.contribution, 0));
  const severity: Severity = score >= 85 ? 'CRITICAL' : score >= 65 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW';
  return { score, severity, breakdown, scoringVersion: 'sentrix-risk-v1' };
}
