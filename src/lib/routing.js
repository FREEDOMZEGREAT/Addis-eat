import { RESTAURANT_ORIGIN } from "./locations";

const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL?.replace(/\/$/, "") ||
  "https://router.project-osrm.org";

export async function fetchDrivingRoute(origin, destination) {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Error("The routing service could not be reached.");
  }

  if (!response.ok) {
    throw new Error(`The routing service responded with status ${response.status}.`);
  }

  const payload = await response.json();
  const route = payload?.routes?.[0];

  if (!route?.geometry?.coordinates?.length) {
    throw new Error("No driving route was found for this delivery.");
  }

  return {
    geometry: {
      type: "LineString",
      coordinates: route.geometry.coordinates,
    },
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.max(1, Math.round(route.duration)),
  };
}

export { RESTAURANT_ORIGIN };
