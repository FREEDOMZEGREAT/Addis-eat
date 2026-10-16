export const RESTAURANT_ORIGIN = {
  lat: 8.9936,
  lng: 38.787,
  label: "Addis Eats · Bole Road",
};

export const AREA_COORDS = {
  Bole: { lat: 8.9944, lng: 38.7874 },
  Kazanchis: { lat: 9.013, lng: 38.766 },
  Piassa: { lat: 9.0352, lng: 38.75 },
  Megenagna: { lat: 9.0205, lng: 38.802 },
  CMC: { lat: 9.019, lng: 38.828 },
  AyerTena: { lat: 8.985, lng: 38.708 },
  Mexico: { lat: 9.008, lng: 38.742 },
  SarBet: { lat: 9.045, lng: 38.762 },
  Saris: { lat: 8.96, lng: 38.76 },
};

export function destinationForArea(area) {
  const coords = AREA_COORDS[area];
  if (!coords) return null;
  return { ...coords, label: area };
}
