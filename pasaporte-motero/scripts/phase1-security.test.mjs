import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/0016_phase1_security_hardening.sql', import.meta.url), 'utf8');
const gps = readFileSync(new URL('../supabase/functions/validate-gps-visit/index.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.match(migration, /revoke update on public\.app_visits from authenticated/i);
assert.match(migration, /grant update \(evidence_path\) on public\.app_visits to authenticated/i);
assert.match(migration, /validation_status = 'pending'/i);
assert.match(migration, /app_visits_one_pending_per_destination/i);
assert.match(migration, /add column if not exists accuracy_m/i);
assert.match(gps, /accuracy_m:accuracy/i);
assert.match(migration, /notify_destination_stamp_earned/i);
assert.match(migration, /notify_department_stamp_earned/i);
assert.match(gps, /accuracy_m/i);
assert.match(gps, /distance \+ accuracy/i);
assert.match(gps, /validation_status.*pending/i);
assert.match(app, /accuracy_m:\s*accuracy/i);
console.log('Phase 1 security regression checks passed.');
