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
assert.match(gps, /geofence_radius_m/i);
assert.doesNotMatch(gps, /GPS_RADIUS_METERS\s*=\s*300/);
assert.match(gps, /validation_status.*pending/i);
assert.match(app, /accuracy_m:\s*accuracy/i);

const feedStart = app.indexOf('async function loadCommunityPosts()');
const feedEnd = app.indexOf('async function loadMyActivity(', feedStart);
const feed = app.slice(feedStart, feedEnd);
assert.match(feed, /\.in\('visibility',\s*\['public','followers'\]\)/);
assert.doesNotMatch(feed, /\.eq\('visibility','public'\)/);
assert.match(feed, /from\('public_profiles'\)\.select\('id,username,full_name,avatar_url'\)/);
const activityStart = app.indexOf('async function loadMyActivity(');
const activityEnd = app.indexOf('async function openOwnComments', activityStart);
const activity = app.slice(activityStart, activityEnd);
assert.match(activity, /\.in\('post_id',postIds\)/);
assert.doesNotMatch(activity, /\.eq\('post_id',row\.id\)/);

const profileMigration = readFileSync(new URL('../supabase/migrations/20261124180000_lock_down_profiles_public_access.sql', import.meta.url), 'utf8');
const offlineQueue = readFileSync(new URL('../src/lib/offline-photo-visits.ts', import.meta.url), 'utf8');
const secureStorage = readFileSync(new URL('../src/lib/secure-storage.ts', import.meta.url), 'utf8');
const imageFunction = readFileSync(new URL('../supabase/functions/populate-destination-images/index.ts', import.meta.url), 'utf8');
assert.match(profileMigration, /revoke select on table public\.profiles from anon/i);
assert.match(profileMigration, /using \(id = \(select auth\.uid\(\)\)\)/i);
assert.match(profileMigration, /security_barrier/i);
assert.match(secureStorage, /encryptOfflineBlob/);
assert.match(secureStorage, /decryptOfflineBlob/);
assert.match(secureStorage, /OFFLINE_KEY_ID/);
assert.match(secureStorage, /delete\(KEY_ID\)/);
assert.match(offlineQueue, /encryptOfflineBlob/);
assert.match(offlineQueue, /decryptOfflineBlob/);
assert.match(offlineQueue, /if \(!userId\) return \[\]/);
assert.match(imageFunction, /body\.offset/);
assert.match(imageFunction, /body\.limit/);

console.log('Phase 1 and integral hardening regression checks passed.');
