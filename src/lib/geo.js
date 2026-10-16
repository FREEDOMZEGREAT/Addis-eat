const EARTH_RADIUS = 6371000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function haversineMeters([lng1, lat1], [lng2, lat2]) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function buildRouteMetrics(coordinates = []) {
  const cumulative = [0];
  let total = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    total += haversineMeters(coordinates[index - 1], coordinates[index]);
    cumulative.push(total);
  }

  return { cumulative, total };
}

export function pointAtDistance(coordinates, cumulative, distance) {
  if (!coordinates || coordinates.length === 0) return null;
  if (coordinates.length === 1) {
    return { lat: coordinates[0][1], lng: coordinates[0][0] };
  }

  const clamped = Math.max(0, Math.min(distance, cumulative[cumulative.length - 1]));

  let low = 0;
  let high = cumulative.length - 1;
  while (low < high - 1) {
    const mid = (low + high) >> 1;
    if (cumulative[mid] <= clamped) low = mid;
    else high = mid;
  }

  const segmentStart = cumulative[low];
  const segmentLength = cumulative[high] - segmentStart;
  const ratio = segmentLength > 0 ? (clamped - segmentStart) / segmentLength : 0;

  const [lng1, lat1] = coordinates[low];
  const [lng2, lat2] = coordinates[high];

  return {
    lat: lat1 + (lat2 - lat1) * ratio,
    lng: lng1 + (lng2 - lng1) * ratio,
  };
}

export function pointAtFraction(coordinates, fraction) {
  const metrics = buildRouteMetrics(coordinates);
  return pointAtDistance(coordinates, metrics.cumulative, metrics.total * fraction);
}

export function formatDistanceRemaining(meters) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatEta(seconds) {
  if (seconds == null) return null;
  if (seconds <= 30) return "Arriving now";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}
