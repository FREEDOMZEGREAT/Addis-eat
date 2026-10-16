"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

function dotIcon(color, size) {
  return L.divIcon({
    className: "",
    html:
      `<span style="display:block;width:${size}px;height:${size}px;` +
      `border-radius:9999px;background:${color};border:3px solid #fff;` +
      `box-shadow:0 1px 6px rgba(0,0,0,.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const ORIGIN_ICON = dotIcon("#8d293c", 18);
const DESTINATION_ICON = dotIcon("#1f6b58", 18);

const COURIER_ICON = L.divIcon({
  className: "",
  html:
    '<span style="display:flex;width:34px;height:34px;border-radius:9999px;' +
    "background:#fff;border:2px solid #8d293c;align-items:center;" +
    'justify-content:center;font-size:16px;box-shadow:0 1px 8px rgba(0,0,0,.35)">🛵</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FitBounds({ points, fitKey }) {
  const map = useMap();
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
  });

  useEffect(() => {
    const current = pointsRef.current;
    if (!current || current.length === 0) return;
    map.fitBounds(L.latLngBounds(current), { padding: [40, 40] });
  }, [map, fitKey]);

  return null;
}

export default function TrackingMap({
  origin,
  destination,
  route,
  courier,
  fitKey,
}) {
  const center = [origin.lat, origin.lng];

  const routePoints = useMemo(
    () => (route?.coordinates ?? []).map(([lng, lat]) => [lat, lng]),
    [route],
  );

  const fitPoints = routePoints.length
    ? routePoints
    : [center, destination && [destination.lat, destination.lng]].filter(
        Boolean,
      );

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-[26rem] w-full rounded-card"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {routePoints.length > 0 && (
        <Polyline
          positions={routePoints}
          pathOptions={{ color: "#8d293c", weight: 5, opacity: 0.85 }}
        />
      )}

      <Marker position={[origin.lat, origin.lng]} icon={ORIGIN_ICON} />
      {destination && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={DESTINATION_ICON}
        />
      )}
      {courier && (
        <Marker position={[courier.lat, courier.lng]} icon={COURIER_ICON} />
      )}

      <FitBounds points={fitPoints} fitKey={fitKey} />
    </MapContainer>
  );
}
