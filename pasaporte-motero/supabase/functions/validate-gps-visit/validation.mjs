export const MAX_GPS_ACCURACY_METERS = 100;

const NON_PHYSICAL_CATEGORIES = new Set([
  "artesania y artes",
  "artistico",
  "artisticos",
  "creencias populares",
  "etnias",
  "evento",
  "eventos",
  "feria y mercados",
  "ferias y mercados",
  "fiesta",
  "fiestas",
  "gastronomia",
  "gastronomico",
  "gastronomica",
  "musica y danzas",
  "musicas y danzas",
  "otros",
]);

export function normalizeDestinationCategory(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-PE");
}

export function isNonPhysicalCategory(value) {
  return NON_PHYSICAL_CATEGORIES.has(normalizeDestinationCategory(value));
}

export function distanceMeters(aLat, aLng, bLat, bLng) {
  const rad = value => value * Math.PI / 180;
  const radius = 6_371_000;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseGpsPayload(body) {
  const destinationId = Number(body?.destination_id);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const accuracy = Number(body?.accuracy_m);

  if (!Number.isInteger(destinationId) || destinationId <= 0
    || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, status: 400, error: "Invalid destination or coordinates" };
  }

  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > MAX_GPS_ACCURACY_METERS) {
    return {
      ok: false,
      status: 422,
      error: "GPS accuracy is insufficient. Maximum accepted accuracy is 100 meters.",
      accuracy_limit_m: MAX_GPS_ACCURACY_METERS,
    };
  }

  return {
    ok: true,
    destinationId,
    latitude,
    longitude,
    accuracy,
    notes: typeof body?.notes === "string" ? body.notes.slice(0, 500) : null,
  };
}
