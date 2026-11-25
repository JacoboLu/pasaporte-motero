export declare const MAX_GPS_ACCURACY_METERS: number;
export declare function normalizeDestinationCategory(value: unknown): string;
export declare function isNonPhysicalCategory(value: unknown): boolean;
export declare function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number;
export declare function parseGpsPayload(body: unknown):
  | { ok: true; destinationId: number; latitude: number; longitude: number; accuracy: number; notes: string | null }
  | { ok: false; status: number; error: string; accuracy_limit_m?: number };
