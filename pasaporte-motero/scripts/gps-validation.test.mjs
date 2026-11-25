import assert from 'node:assert/strict';
import test from 'node:test';
import {
  distanceMeters,
  isNonPhysicalCategory,
  normalizeDestinationCategory,
  parseGpsPayload,
} from '../supabase/functions/validate-gps-visit/validation.mjs';
import { readFileSync } from 'node:fs';

test('normalizes Spanish accents and whitespace consistently', () => {
  assert.equal(normalizeDestinationCategory('  GASTRONOMÍA  '), 'gastronomia');
  assert.equal(normalizeDestinationCategory('Músicas   y Danzas'), 'musicas y danzas');
  assert.equal(normalizeDestinationCategory('Artesanía y Artes'), 'artesania y artes');
});

test('routes non-physical categories away from GPS validation', () => {
  for (const category of ['Gastronomía', 'Artesanía y Artes', 'Músicas y Danzas', 'Fiestas']) {
    assert.equal(isNonPhysicalCategory(category), true, category);
  }
  assert.equal(isNonPhysicalCategory('Mirador'), false);
});

test('rejects malformed coordinates and inaccurate GPS readings', () => {
  assert.equal(parseGpsPayload({ destination_id: 0, latitude: 0, longitude: 0, accuracy_m: 5 }).status, 400);
  assert.equal(parseGpsPayload({ destination_id: 1, latitude: 91, longitude: 0, accuracy_m: 5 }).status, 400);
  assert.equal(parseGpsPayload({ destination_id: 1, latitude: 0, longitude: 181, accuracy_m: 5 }).status, 400);
  assert.equal(parseGpsPayload({ destination_id: 1, latitude: 0, longitude: 0, accuracy_m: 101 }).status, 422);
  assert.equal(parseGpsPayload({ destination_id: 1, latitude: 0, longitude: 0, accuracy_m: 0 }).status, 422);
});

test('accepts valid GPS payload and bounds notes', () => {
  const result = parseGpsPayload({
    destination_id: '25', latitude: -12.0464, longitude: -77.0428,
    accuracy_m: 8, notes: 'x'.repeat(600),
  });
  assert.equal(result.ok, true);
  assert.equal(result.destinationId, 25);
  assert.equal(result.notes.length, 500);
});

test('distance calculation returns zero for identical coordinates', () => {
  assert.equal(distanceMeters(-12.0464, -77.0428, -12.0464, -77.0428), 0);
  assert.ok(distanceMeters(-12.0464, -77.0428, -12.05, -77.0428) > 300);
});

test('GPS Edge Function performs shared-coordinate checks with admin client', () => {
  const source = readFileSync(new URL('../supabase/functions/validate-gps-visit/index.ts', import.meta.url), 'utf8');
  assert.match(source, /await admin\s*\.from\("destination_catalog"\)/);
  assert.doesNotMatch(source, /await supabase\s*\.from\(/);
  assert.match(source, /isNonPhysicalCategory\(destination\.category\)/);
  assert.match(source, /distance \+ accuracy > geofenceRadius/);
});
