// The headless simulator. In normal test runs it plays a handful of degrees to
// prove a game can always be finished (no dead ends). `npm run sim` sets
// SIM_SEEDS=200 and writes the full table to BALANCE.md.
import { describe, expect, it } from 'vitest';
import { getProgramme } from '../../content/courses';
import { classOfDegree } from '../academics';
import { playDegree, type DegreeResult, type Strategy } from './bot';

// No @types/node in this project: read the environment through globalThis.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const SEEDS = Number(env.SIM_SEEDS ?? 3);
const PROGRAMMES = ['computer_science', 'mechanical_eng', 'medicine'];
const STRATEGIES: Strategy[] = ['study', 'hustle', 'balanced', 'random'];

function pct(n: number, of: number): string {
  return of ? `${Math.round((n / of) * 100)}%` : '–';
}
function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
}

function table(results: DegreeResult[]): string {
  const rows: string[] = [];
  rows.push('| Course | Strategy | Graduated | Withdrawn | CGPA p10 / median / p90 | First / 2:1 / 2:2 / 3rd / Pass | Ever broke | Times broke (avg) | Clearance days (avg) | Sessions (avg) |');
  rows.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const p of PROGRAMMES) {
    for (const s of STRATEGIES) {
      const rs = results.filter((r) => r.programmeId === p && r.strategy === s);
      const grads = rs.filter((r) => r.graduated);
      const cg = grads.map((r) => r.cgpa);
      const cls = (name: string) => grads.filter((r) => classOfDegree(r.cgpa) === name).length;
      const clear = rs.map((r) => r.clearanceDays).filter((x): x is number => x !== null);
      rows.push(
        `| ${getProgramme(p).name} (${getProgramme(p).years}y) | ${s} | ${pct(grads.length, rs.length)} | ${pct(rs.filter((r) => r.withdrawn).length, rs.length)} | ` +
          `${quantile(cg, 0.1).toFixed(2)} / ${quantile(cg, 0.5).toFixed(2)} / ${quantile(cg, 0.9).toFixed(2)} | ` +
          `${cls('First Class')} / ${cls('Second Class Upper')} / ${cls('Second Class Lower')} / ${cls('Third Class')} / ${cls('Pass')} | ` +
          `${pct(rs.filter((r) => r.brokeTimes > 0).length, rs.length)} | ${(rs.reduce((a, r) => a + r.brokeTimes, 0) / Math.max(rs.length, 1)).toFixed(1)} | ` +
          `${clear.length ? (clear.reduce((a, x) => a + x, 0) / clear.length).toFixed(1) : '–'} | ${(rs.reduce((a, r) => a + r.sessions, 0) / Math.max(rs.length, 1)).toFixed(1)} |`,
      );
    }
  }
  return rows.join('\n');
}

describe('headless simulator', () => {
  it(
    'plays whole degrees with every strategy without getting stuck',
    async () => {
      const results: DegreeResult[] = [];
      for (const p of PROGRAMMES) for (const s of STRATEGIES) for (let seed = 1; seed <= SEEDS; seed++) results.push(playDegree(p, s, seed));
      const out = table(results);
      if (env.SIM_OUT) {
        const fsName = 'node:fs';
        const fs = (await import(/* @vite-ignore */ fsName)) as { writeFileSync: (path: string, text: string) => void };
        fs.writeFileSync(env.SIM_OUT, out);
        fs.writeFileSync(`${env.SIM_OUT}.json`, JSON.stringify(results));
      }
      // No dead end: every run ended (graduated, withdrawn, or ran out of sessions) without hitting the step cap.
      for (const r of results) expect(r.decisions, `${r.programmeId} ${r.strategy} ${r.seed}`).toBeLessThan(40000);
      expect(results.some((r) => r.graduated)).toBe(true);

    },
    60 * 60 * 1000,
  );
});
