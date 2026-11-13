import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-polylinedecorator';
import { GeoLocationData, SavedPin, MapTileStyle, GigPost } from '../types';
import { MAP_TILES, calculateDistance, formatDistance } from '../utils/geo';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
import realisticDollImg from '../assets/images/realistic_3d_doll_1794546790352.jpg';

// Extend Leaflet types for polylinedecorator
declare module 'leaflet' {
  export function polylineDecorator(
    paths: L.Polyline | L.Polygon | L.Polyline[] | L.Polygon[],
    options?: any
  ): L.LayerGroup;
}

interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
  bounds?: Array<[number, number]>;
  timestamp: number;
}

interface MapViewProps {
  userLocation: GeoLocationData;
  savedPins: SavedPin[];
  selectedTile: MapTileStyle;
  onMapClick: (lat: number, lng: number) => void;
  onOpenAddPinAt: (lat: number, lng: number, address?: string) => void;
  trackingTrail: Array<[number, number]>;
  flyToTarget?: FlyToTarget | null;
  mapRef: React.MutableRefObject<L.Map | null>;
  is3D?: boolean;
  routePath?: [number, number][] | null;
  destination?: { lat: number; lng: number; name: string } | null;
  onUserInteract?: () => void;
  gigPosts?: GigPost[];
  onSelectGigPost?: (gig: GigPost) => void;
  isPickingGigLocation?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  userLocation,
  savedPins,
  selectedTile,
  onMapClick,
  onOpenAddPinAt,
  trackingTrail,
  flyToTarget,
  mapRef,
  is3D,
  routePath,
  destination,
  onUserInteract,
  gigPosts = [],
  onSelectGigPost,
  isPickingGigLocation = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const trailPolylineRef = useRef<L.Polyline | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const isProgrammaticMoveRef = useRef(false);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onSelectGigPostRef = useRef(onSelectGigPost);
  onSelectGigPostRef.current = onSelectGigPost;
  const onUserInteractRef = useRef(onUserInteract);
  onUserInteractRef.current = onUserInteract;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 13,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      wheelPxPerZoomLevel: 60,
      doubleClickZoom: true,
      boxZoom: true,
    });

    const config = MAP_TILES[selectedTile];
    const tileLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      maxNativeZoom: config.maxNativeZoom ?? config.maxZoom,
      keepBuffer: 4,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    markersGroupRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => onMapClickRef.current(e.latlng.lat, e.latlng.lng));
    map.on('dragstart', () => onUserInteractRef.current?.());
    map.on('zoomstart', () => {
      if (!isProgrammaticMoveRef.current) {
        onUserInteractRef.current?.();
      }
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prevLayer = tileLayerRef.current;
    const config = MAP_TILES[selectedTile];
    const nextLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      maxNativeZoom: config.maxNativeZoom ?? config.maxZoom,
      keepBuffer: 4,
    });

    // Skip if already showing the exact same tile URL
    if (prevLayer && (prevLayer as any)._url === config.url) {
      return;
    }

    nextLayer.addTo(map);
    tileLayerRef.current = nextLayer;

    let removed = false;
    const cleanupPrev = () => {
      if (removed) return;
      removed = true;
      if (prevLayer && map.hasLayer(prevLayer)) {
        map.removeLayer(prevLayer);
      }
    };

    nextLayer.once('load', cleanupPrev);
    const fallbackTimer = window.setTimeout(cleanupPrev, 2500);

    return () => {
      window.clearTimeout(fallbackTimer);
      nextLayer.off('load', cleanupPrev);
      cleanupPrev();
    };
  }, [selectedTile]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    isProgrammaticMoveRef.current = true;
    if (flyToTarget.bounds && flyToTarget.bounds.length > 1) {
      map.fitBounds(L.latLngBounds(flyToTarget.bounds), {
        paddingTopLeft: [40, 180],
        paddingBottomRight: [60, 100],
        maxZoom: 16,
        animate: true,
      });
    } else if (typeof flyToTarget.zoom === 'number') {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom, { duration: 1.2 });
    } else {
      map.panTo([flyToTarget.lat, flyToTarget.lng], { animate: true });
    }
    const timer = window.setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 50);
    return () => window.clearTimeout(timer);
  }, [flyToTarget]);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersGroupRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !group || !routeLayer) return;

    group.clearLayers();
    routeLayer.clearLayers();

    // 1. Trail
    if (trackingTrail.length > 1) {
      if (trailPolylineRef.current) map.removeLayer(trailPolylineRef.current);
      trailPolylineRef.current = L.polyline(trackingTrail, { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '6, 6' }).addTo(map);
    }

    // 2. Arrow Route
    if (routePath && routePath.length > 1) {
      const polyline = L.polyline(routePath, { color: '#2563eb', weight: 4, opacity: 0.3 });
      routeLayer.addLayer(polyline);

      const decorator = L.polylineDecorator(polyline, {
        patterns: [
          {
            offset: 25,
            repeat: 50,
            symbol: L.Symbol.arrowHead({
              pixelSize: 15,
              polygon: false,
              pathOptions: { stroke: true, color: '#2563eb', weight: 3, opacity: 1 }
            })
          }
        ]
      });
      routeLayer.addLayer(decorator);
    }

    // 3. User Marker (3D Realistic Doll Figurine Standing at Location - House Scale)
    const userAvatarIcon = L.divIcon({
      className: 'custom-user-doll-marker',
      html: `
        <div style="
          position: relative;
          width: 24px;
          height: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          pointer-events: auto;
        ">
          <div style="
            position: relative;
            width: 20px;
            height: 26px;
            border-radius: 10px;
            background: radial-gradient(circle at 35% 20%, #ffffff 0%, #f1f5f9 100%);
            border: 1.5px solid #2563eb;
            box-shadow: 0 5px 10px rgba(15, 23, 42, 0.4), 0 1px 4px rgba(37, 99, 235, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.9);
            overflow: hidden;
            transform: perspective(400px) rotateX(6deg);
            z-index: 2;
          ">
            <img
              src="${realisticDollImg}"
              alt="3D User Doll"
              referrerpolicy="no-referrer"
              style="
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center 12%;
                transform: scale(1.18);
                display: block;
              "
            />
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 9px;
              box-shadow: inset 0 -4px 6px rgba(15, 23, 42, 0.14);
              pointer-events: none;
            "></div>
          </div>
          <div style="
            position: absolute;
            bottom: 3px;
            right: 1px;
            width: 6px;
            height: 6px;
            background: #10b981;
            border: 1px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(16, 185, 129, 0.7);
            z-index: 3;
          "></div>
          <div style="
            width: 14px;
            height: 5px;
            background: radial-gradient(ellipse at center, rgba(37, 99, 235, 0.45) 0%, rgba(15, 23, 42, 0.25) 60%, transparent 100%);
            border-radius: 50%;
            margin-top: -2px;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
            z-index: 1;
          "></div>
        </div>
      `,
      iconSize: [24, 32],
      iconAnchor: [12, 30],
    });
    group.addLayer(L.marker([userLocation.lat, userLocation.lng], { icon: userAvatarIcon }).bindPopup('<b>Your Current Location</b><br/>3D Active Navigator'));

    // 4. Saved Pins (Deep 3D Pin/Bubble)
    savedPins.forEach((pin) => {
      const pinBubbleIcon = L.divIcon({
        className: 'custom-pin-bubble',
        html: `
          <div style="position: relative; width: 40px; height: 40px;">
            <div style="
              background: radial-gradient(circle at 30% 30%, #ef4444, #991b1b); 
              width: 40px; 
              height: 40px; 
              border-radius: 50% 50% 50% 0; 
              border: 3px solid #ffffff; 
              box-shadow: 0 12px 24px rgba(0,0,0,0.5);
              display: flex; 
              align-items: center; 
              justify-content: center;
              transform: rotate(-45deg) perspective(500px) rotateX(10deg);
              transition: transform 0.3s ease;
            ">
              <div style="width: 12px; height: 12px; background: #ffffff; border-radius: 50%; transform: rotate(45deg); box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);"></div>
            </div>
            <div style="
              width: 16px;
              height: 4px;
              background: rgba(0,0,0,0.2);
              border-radius: 50%;
              position: absolute;
              bottom: -6px;
              left: 12px;
              filter: blur(2px);
            "></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });
      const dist = calculateDistance(userLocation.lat, userLocation.lng, pin.lat, pin.lng);
      group.addLayer(L.marker([pin.lat, pin.lng], { icon: pinBubbleIcon }).bindPopup(`<b>${pin.title}</b><br/>${formatDistance(dist)} away`));
    });

    // 5. Active Navigation Destination Marker
    if (destination) {
      const destIcon = L.divIcon({
        className: 'custom-destination-marker',
        html: `
          <div style="position: relative; width: 44px; height: 44px;">
            <div style="
              background: linear-gradient(135deg, #10b981, #059669);
              width: 40px;
              height: 40px;
              border-radius: 50% 50% 50% 0;
              border: 3px solid #ffffff;
              box-shadow: 0 10px 25px rgba(16,185,129,0.55);
              display: flex;
              align-items: center;
              justify-content: center;
              transform: rotate(-45deg);
            ">
              <div style="width: 14px; height: 14px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [20, 40],
      });
      const dist = calculateDistance(userLocation.lat, userLocation.lng, destination.lat, destination.lng);
      group.addLayer(
        L.marker([destination.lat, destination.lng], { icon: destIcon })
          .bindPopup(`<b>Destination: ${escapeHtml(destination.name)}</b><br/>${formatDistance(dist)} away`)
      );
    }

    // 6. Live Gig Post Markers
    gigPosts.forEach((gig) => {
      if (gig.status !== 'active') return;
      const safeTitle = escapeHtml(gig.title);
      const safeBudget = escapeHtml(gig.budget);
      const safeCategory = escapeHtml(gig.category);
      const ownerSelfieImg = gig.creatorSelfieUrl
        ? `<div style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            overflow: hidden;
            border: 1.5px solid #ffffff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            flex-shrink: 0;
            background: #334155;
          ">
            <img src="${escapeHtml(gig.creatorSelfieUrl)}" alt="Owner Selfie" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>`
        : `<div style="
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #cbd5e1;
            font-weight: 900;
            flex-shrink: 0;
            border: 1px solid #64748b;
          ">👤</div>`;

      const gigIcon = L.divIcon({
        className: 'custom-gig-post-marker',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transform: translateY(-4px);
          ">
            <div style="
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              color: #ffffff;
              border: 2px solid #f59e0b;
              border-radius: 16px;
              padding: 3px 8px 3px 5px;
              box-shadow: 0 10px 22px rgba(15, 23, 42, 0.45), 0 0 0 3px rgba(245, 158, 11, 0.25);
              display: flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;
              max-width: 195px;
            ">
              ${ownerSelfieImg}
              <span style="
                background: #f59e0b;
                color: #0f172a;
                font-size: 9px;
                font-weight: 900;
                padding: 1px 5px;
                border-radius: 6px;
                letter-spacing: 0.02em;
              ">${safeBudget}</span>
              <span style="
                font-size: 10px;
                font-weight: 800;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100px;
              ">${safeTitle}</span>
            </div>
            <div style="
              width: 10px;
              height: 10px;
              background: #f59e0b;
              border: 2px solid #ffffff;
              border-radius: 50%;
              margin-top: 2px;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
            "></div>
          </div>
        `,
        iconSize: [180, 44],
        iconAnchor: [90, 42],
      });
      const dist = calculateDistance(userLocation.lat, userLocation.lng, gig.lat, gig.lng);
      const marker = L.marker([gig.lat, gig.lng], { icon: gigIcon });
      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (onSelectGigPostRef.current) {
          onSelectGigPostRef.current(gig);
        }
      });
      if (!onSelectGigPostRef.current) {
        marker.bindPopup(
          `<b>${safeTitle}</b><br/>${safeCategory} • ${safeBudget}<br/>${formatDistance(dist)} away`
        );
      }
      group.addLayer(marker);
    });
  }, [userLocation, savedPins, trackingTrail, routePath, destination, gigPosts]);

  return (
    <div className={`flex-1 h-full w-full relative z-0 map-perspective-container ${is3D ? 'map-3d-active' : ''} ${isPickingGigLocation ? 'cursor-crosshair' : ''}`}>
      <div ref={mapContainerRef} className={`h-full w-full ${isPickingGigLocation ? '!cursor-crosshair' : ''}`} />
    </div>
  );
};
