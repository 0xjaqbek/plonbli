"use client";

import "leaflet/dist/leaflet.css";
import { useMemo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import { useTranslations } from "next-intl";
import { VOIVODESHIP_CENTERS } from "@/domains/geo";

// Fix default marker icons not loading in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
import type { FarmerForMap } from "../queries/get-farmers-for-map";
import { useAnalytics, EVENTS } from "@/domains/analytics";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false }
);

// Default: center of Poland
const POLAND_CENTER: [number, number] = [51.92, 19.15];
const POLAND_ZOOM = 6;
const USER_ZOOM = 10;

type FarmerMapEntry = FarmerForMap & { isProxy?: boolean };

interface FarmerMapProps {
  farmers: FarmerMapEntry[];
}

type ResolvedFarmer = {
  id: string;
  name: string;
  position: [number, number];
  isApproximate: boolean;
  isProxy: boolean;
  location: string;
};

function resolveFarmers(farmers: FarmerMapEntry[]): ResolvedFarmer[] {
  const resolved: ResolvedFarmer[] = [];

  for (const f of farmers) {
    let position: [number, number] | null = null;
    let isApproximate = false;
    const locationParts: string[] = [];

    if (f.commune) locationParts.push(f.commune);
    if (f.voivodeship) locationParts.push(f.voivodeship);

    if (f.latitude && f.longitude) {
      position = [parseFloat(f.latitude), parseFloat(f.longitude)];
      // If farmer originally had no coords but was geocoded, it's approximate
      // We can't distinguish here, so we mark as exact (geocoded coords are saved to DB)
    } else if (f.voivodeship) {
      const voiv = f.voivodeship as keyof typeof VOIVODESHIP_CENTERS;
      if (VOIVODESHIP_CENTERS[voiv]) {
        position = VOIVODESHIP_CENTERS[voiv];
        isApproximate = true;
      }
    }

    if (position) {
      resolved.push({
        id: f.id,
        name: f.name,
        position,
        isApproximate,
        isProxy: !!(f as FarmerMapEntry).isProxy,
        location: locationParts.join(", ") || "",
      });
    }
  }

  return resolved;
}

export function FarmerMap({ farmers }: FarmerMapProps) {
  const t = useTranslations("farmer");
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
    trackEvent(EVENTS.MAP_VIEWED, { farmerCount: resolved.length });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {} // silently fallback to Poland center
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resolved = useMemo(() => resolveFarmers(farmers), [farmers]);
  const { trackEvent } = useAnalytics();

  if (!mapReady) {
    return (
      <div className="flex items-center justify-center h-[500px] border rounded-md">
        <p className="text-sm text-muted-foreground">{t("loadingMap")}</p>
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] border rounded-md">
        <p className="text-sm text-muted-foreground">{t("noFarmers")}</p>
      </div>
    );
  }

  const center = userPos ?? POLAND_CENTER;
  const zoom = userPos ? USER_ZOOM : POLAND_ZOOM;

  return (
    <div className="h-[500px] rounded-md overflow-hidden border">
      <MapContainer center={center} zoom={zoom} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location */}
        {userPos && (
          <Circle
            center={userPos}
            radius={500}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.4,
            }}
          />
        )}

        {/* Farmer markers */}
        {resolved.map((farmer) => (
          <Marker
            key={farmer.id}
            position={farmer.position}
            opacity={farmer.isApproximate ? 0.6 : 1}
          >
            <Popup>
              <div className="space-y-1">
                <a
                  href={farmer.isProxy ? `/farmers/proxy/${farmer.id}` : `/farmers/${farmer.id}`}
                  className="font-medium text-sm hover:underline"
                >
                  {farmer.name}
                  {farmer.isProxy && " (ambasador)"}
                </a>
                {farmer.location && (
                  <p className="text-xs text-muted-foreground">
                    {farmer.location}
                  </p>
                )}
                {farmer.isApproximate && (
                  <p className="text-[10px] text-muted-foreground italic">
                    {t("approximateLocation")}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
