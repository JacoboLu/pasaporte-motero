import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const reminders = read('../src/components/RiderReminders.tsx');
const account = read('../src/components/AccountDataTools.tsx');
const catalog = read('../src/components/DestinationCatalogAdmin.tsx');
const app = read('../src/App.tsx');

const migration = read('../supabase/migrations/20261125184054_rider_reminders_and_admin_audit.sql');
const deleteFn = read('../supabase/functions/delete-account/index.ts');
const catalogFn = read('../supabase/functions/manage-destination-catalog/index.ts');
const qualityMigration = read('../supabase/migrations/20261126100000_destination_quality_audit.sql');

test('reminders are owner-scoped, date/km based, and support completion', () => {
  assert.match(reminders, /from\('rider_reminders'\)/);
  assert.match(reminders, /due_odometer_km/);
  assert.match(reminders, /is_completed/);
  assert.match(reminders, /currentOdometer/);
  assert.match(migration, /alter table public\.rider_reminders enable row level security/i);
  assert.match(migration, /user_id=\(select auth\.uid\(\)\)/i);
});

test('account export is explicit and deletion requires recent authentication plus typed confirmation', () => {
  assert.match(account, /ELIMINAR MI CUENTA/);
  assert.match(account, /delete-account/);
  assert.match(account, /exportData/);
  assert.match(deleteFn, /auth_time/);
  assert.match(deleteFn, /Date\.now\(\)\/1000-Number\(claims\.auth_time\)>900/);
  assert.match(deleteFn, /admin\.auth\.admin\.deleteUser/);
  assert.match(deleteFn, /visit_qr_challenges/);
});

test('destination catalog changes are admin-only and audited', () => {
  assert.match(catalog, /manage-destination-catalog/);
  assert.match(catalog, /admin_audit_log/);
  assert.match(catalogFn, /profile\?\.role!=="admin"/);
  assert.match(catalogFn, /admin_audit_log/);
  assert.match(catalogFn, /destination\.archive/);
});

test('regional managers receive a scoped review panel, not global admin controls', () => {
  assert.match(app, /\['admin','manager'\]\.includes\(profileRole\)/);
  assert.match(app, /GESTIÓN REGIONAL/);
  assert.match(app, /profileRole === 'admin' && <><button type="button" onClick/);
  assert.match(app, /achievementXp/);
  assert.match(app, /ridingStreak/);
});


test('destination quality audit is read-only and available only through the admin edge function', () => {
  assert.match(qualityMigration, /admin_destination_quality_report/);
  assert.match(qualityMigration, /duplicate_coordinate_groups/);
  assert.match(qualityMigration, /duplicate_coordinate_destinations/);
  assert.match(qualityMigration, /revoke all on function public\.admin_destination_quality_report\(\) from public, anon, authenticated/i);
  assert.match(catalogFn, /body\.action==="quality"/);
  assert.match(catalog, /Calidad de destinos/);
  assert.match(catalog, /Ubicaciones compartidas que requieren verificación/);
});
