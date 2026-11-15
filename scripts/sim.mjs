// npm run sim: plays 200 degrees per strategy and course length with the
// headless simulator (src/game/sim) and writes the table to BALANCE.md.
// Usage: npm run sim [-- seeds]   e.g. npm run sim -- 50
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const seeds = process.argv[2] ?? '200';
const out = 'sim-table.md';
const run = spawnSync('npx', ['vitest', 'run', 'src/game/sim'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, SIM_SEEDS: seeds, SIM_OUT: out },
});
if (run.status !== 0) process.exit(run.status ?? 1);
const table = readFileSync(out, 'utf8');
rmSync(out);
rmSync(`${out}.json`, { force: true });
const doc = readFileSync('BALANCE.md', 'utf8');
const marker = '<!-- sim-table -->';
const [before, , after = ''] = doc.split(marker);
writeFileSync('BALANCE.md', `${before}${marker}\n\n_${seeds} seeds per row, generated ${new Date().toISOString().slice(0, 10)}._\n\n${table}\n\n${marker}${after}`);
console.log(table);
