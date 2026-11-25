import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const reminders = read('../src/components/RiderReminders.tsx');
const remindersComponent = reminders;
const account = read('../src/components/AccountDataTools.tsx');
const catalog = read('../src/components/DestinationCatalogAdmin.tsx');
const app = read('../src/App.tsx');

const migration = read('../supabase/migrations/20261125184054_rider_reminders_and_admin_audit.sql');
const deleteFn = read('../supabase/functions/delete-account/index.ts');
const catalogFn = read('../supabase/functions/manage-destination-catalog/index.ts');
const qualityMigration = read('../supabase/migrations/20261125193215_destination_quality_audit.sql');
const nameMigration = read('../supabase/migrations/20261125200143_destination_name_homologation.sql');
const aliasGuardMigration = read('../supabase/migrations/20261125200151_destination_name_alias_guard.sql');
const nationalNameMigration = read('../supabase/migrations/20261125200955_national_destination_name_homologation.sql');
const nameReviewMigration = read('../supabase/migrations/20261125201026_destination_name_review_report.sql');
const nationalBatch2Migration = read('../supabase/migrations/20261125201109_national_destination_name_consolidation_batch2.sql');

test('reminders are owner-scoped, date/km based, and support completion', () => {
  assert.match(reminders, /from\('rider_reminders'\)/);
  assert.match(reminders, /due_odometer_km/);
  assert.match(reminders, /is_completed/);
  assert.match(reminders, /currentOdometer/);
  assert.match(remindersComponent, /now\.getFullYear\(\)/);
  assert.doesNotMatch(remindersComponent, /new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
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
  assert.match(deleteFn, /No se pudo completar la eliminación de forma segura/);
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
  assert.doesNotMatch(catalog, /duplicate_clusters\\.slice/);
});

test('destination names resolve to a single canonical record and prevent future duplicate aliases', () => {
  assert.match(nameMigration, /create table if not exists public\.destination_name_aliases/i);
  assert.match(nameMigration, /Formaciones Geológicas de Torre Torre/);
  assert.match(nameMigration, /where id = 1996/);
  assert.match(nameMigration, /where id = 5/);
  assert.match(nameMigration, /set is_active = false/i);
  assert.match(aliasGuardMigration, /destination_catalog_alias_guard/);
  assert.match(aliasGuardMigration, /normalize_destination_name\(new\.name\)/);
  assert.match(aliasGuardMigration, /using errcode = '23505'/i);
});

test('national homologation archives the duplicate and preserves the official MINCETUR record', () => {
  assert.match(nationalNameMigration, /where id=1292/);
  assert.match(nationalNameMigration, /where id=4369/);
  assert.match(nationalNameMigration, /MINCETUR.*ficha 1814/);
  assert.match(nationalNameMigration, /set is_active=false/i);
  assert.match(nationalNameMigration, /6371000/);
  assert.match(nationalNameMigration, /<= 500/);
  assert.match(nationalNameMigration, /same physical area/i);
});

test('national name review report is restricted to service role', () => {
  assert.match(nameReviewMigration, /admin_destination_name_review_report/);
  assert.match(nameReviewMigration, /having count\\s*\\(\\s*\\*\\s*\\)\\s*>\\s*1/i);
  assert.match(nameReviewMigration, /revoke all on function public\.admin_destination_name_review_report\(\) from public,anon,authenticated/i);
  assert.match(nameReviewMigration, /grant execute on function public\.admin_destination_name_review_report\(\) to service_role/i);
});

test('national batch consolidates verified official/proposed pairs while retaining MINCETUR coordinates', () => {
  assert.match(nationalBatch2Migration, /where id=2907/);
  assert.match(nationalBatch2Migration, /where id=4331/);
  assert.match(nationalBatch2Migration, /where id=3836/);
  assert.match(nationalBatch2Migration, /where id=4339/);
  assert.match(nationalBatch2Migration, /where id=3884/);
  assert.match(nationalBatch2Migration, /where id=4283/);
  assert.match(nationalBatch2Migration, /MINCETUR ficha 1971/);
  assert.match(nationalBatch2Migration, /MINCETUR ficha 11665/);
  assert.match(nationalBatch2Migration, /MINCETUR ficha 494/);
});

test('destination aliases are unique per canonical record and guard is not publicly executable', () => {
  const aliasScopeMigration = read('../supabase/migrations/20261125201251_destination_alias_locality_scope.sql');
  assert.match(aliasScopeMigration, /on public\.destination_name_aliases\(normalized_alias,destination_id\)/i);
  assert.match(aliasScopeMigration, /revoke all on function public\.guard_destination_name_alias\(\) from public,anon,authenticated/i);
});
