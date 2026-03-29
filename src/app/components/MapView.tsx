'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import type { MapPin } from '../lib/types';

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a12' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
];

interface MapViewProps {
  agentsActive?: boolean;
  pins?: MapPin[];
  stormTrack?: { lat: number; lng: number }[];
  mapView?: { lat: number; lng: number; zoom?: number };
}

function MapStyler() {
  const map = useMap();
  useEffect(() => {
    if (map) {
      (map as google.maps.Map).setOptions({ styles: mapStyles as google.maps.MapTypeStyle[] });
    }
  }, [map]);
  return null;
}

function HtmlMarker({
  position,
  children,
  zIndex = 1,
  onClick,
}: {
  position: { lat: number; lng: number };
  children: React.ReactNode;
  zIndex?: number;
  onClick?: () => void;
}) {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const div = document.createElement('div');
    div.style.position = 'absolute';

    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {
      overlay.getPanes()?.overlayMouseTarget.appendChild(div);
      setContainer(div);
    };
    overlay.draw = () => {
      const projection = overlay.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(position.lat, position.lng),
      );
      if (point) {
        div.style.left = `${point.x}px`;
        div.style.top = `${point.y}px`;
        div.style.zIndex = String(zIndex);
      }
    };
    overlay.onRemove = () => {
      div.remove();
      setContainer(null);
    };
    overlay.setMap(map as google.maps.Map);

    return () => {
      overlay.setMap(null);
    };
  }, [map, position.lat, position.lng, zIndex]);

  if (!container) return null;
  return createPortal(
    <div
      style={{
        transform: 'translate(-50%, -50%)',
        cursor: onClick ? 'pointer' : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {children}
    </div>,
    container,
  );
}

function StormTrackPolyline({ path }: { path: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !path || path.length === 0 || !window.google) return;

    const lineSymbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 2,
    };

    const polyline = new google.maps.Polyline({
      path,
      strokeColor: '#ef4444',
      strokeOpacity: 0.6,
      strokeWeight: 2,
      icons: [{ icon: lineSymbol, offset: '0', repeat: '12px' }],
      map: map as google.maps.Map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);

  return null;
}

function MapController({
  pins,
  agentsActive,
  mapView,
}: {
  pins: MapPin[];
  agentsActive: boolean;
  mapView?: { lat: number; lng: number; zoom?: number };
}) {
  const map = useMap();
  const prevPinCount = useRef(0);
  const lastViewKey = useRef('');

  useEffect(() => {
    if (!map || !mapView) return;
    const key = `${mapView.lat.toFixed(4)},${mapView.lng.toFixed(4)},${mapView.zoom}`;
    if (key === lastViewKey.current) return;
    lastViewKey.current = key;

    (map as google.maps.Map).panTo({ lat: mapView.lat, lng: mapView.lng });
    if (mapView.zoom) {
      const currentZoom = (map as google.maps.Map).getZoom() || 12;
      const targetZoom = mapView.zoom;
      if (Math.abs(currentZoom - targetZoom) > 0.5) {
        (map as google.maps.Map).setZoom(targetZoom);
      }
    }
  }, [map, mapView]);

  useEffect(() => {
    if (!map) return;

    const userPin = pins.find((p) => p.type === 'user');
    if (userPin && prevPinCount.current === 0 && pins.length > 0) {
      (map as google.maps.Map).panTo({ lat: userPin.lat, lng: userPin.lng });
      (map as google.maps.Map).setZoom(13);
    }

    if (pins.length > 3 && pins.length !== prevPinCount.current) {
      const bounds = new google.maps.LatLngBounds();
      pins.forEach((pin) => bounds.extend({ lat: pin.lat, lng: pin.lng }));
      (map as google.maps.Map).fitBounds(bounds, {
        top: 80,
        right: 60,
        bottom: 200,
        left: 380,
      });
    }

    prevPinCount.current = pins.length;
  }, [map, pins, agentsActive]);

  return null;
}

function PinTooltip({ pin, onClose }: { pin: MapPin; onClose: () => void }) {
  return (
    <HtmlMarker position={{ lat: pin.lat, lng: pin.lng }} zIndex={100}>
      <div
        className="rounded-xl p-3 min-w-[180px] -translate-y-14"
        style={{
          background: 'rgba(10, 10, 18, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-1.5 right-2 text-white/30 hover:text-white/70 text-[10px] transition-colors"
        >
          x
        </button>
        <div
          className="text-[12px] font-semibold mb-0.5"
          style={{
            color: pin.type === 'supply' ? '#f59e0b' : '#8b5cf6',
          }}
        >
          {pin.label}
        </div>
        <div className="text-[10px] text-white/30 mb-2">
          {pin.type === 'supply'
            ? 'Gas Station / Supply'
            : pin.type === 'shelter'
              ? 'Emergency Shelter'
              : 'Your Location'}
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#3b82f6] font-medium hover:underline"
        >
          Get Directions &rarr;
        </a>
      </div>
    </HtmlMarker>
  );
}

export default function MapView({
  agentsActive = false,
  pins = [],
  stormTrack = [],
  mapView,
}: MapViewProps) {
  const center = { lat: 27.9506, lng: -82.4572 };
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {!agentsActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="relative flex items-center justify-center"
            style={{ width: 220, height: 220 }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  border: '1.5px solid rgba(255, 107, 53, 0.1)',
                  animation: `radar 3s ease-out ${i}s infinite`,
                }}
              />
            ))}
            <div className="w-2 h-2 rounded-full bg-[#ff6b35]/30" />
          </div>
          <div className="text-[14px] text-white/25 mt-4 font-medium tracking-wide">
            Enter a Florida ZIP code to deploy agents
          </div>
        </div>
      )}

      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={12}
          disableDefaultUI={true}
          backgroundColor="#0d1117"
          style={{ width: '100%', height: '100%' }}
          onClick={() => setSelectedPin(null)}
        >
          <MapStyler />

          {pins.map((pin, index) => {
            if (pin.type === 'supply') {
              return (
                <HtmlMarker
                  key={`supply-${index}`}
                  position={{ lat: pin.lat, lng: pin.lng }}
                  onClick={() => setSelectedPin(pin)}
                >
                  <div className="animate-pin-spring">
                    <div
                      className="w-4 h-4 rounded-full animate-glow-ring cursor-pointer hover:scale-125 transition-transform"
                      style={
                        {
                          backgroundColor: '#f59e0b',
                          border: '2px solid #0d1117',
                          '--glow-color': 'rgba(245, 158, 11, 0.4)',
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </HtmlMarker>
              );
            }
            if (pin.type === 'shelter') {
              return (
                <HtmlMarker
                  key={`shelter-${index}`}
                  position={{ lat: pin.lat, lng: pin.lng }}
                  onClick={() => setSelectedPin(pin)}
                >
                  <div className="animate-pin-spring">
                    <div
                      className="w-4 h-4 rounded-sm animate-glow-ring cursor-pointer hover:scale-125 transition-transform"
                      style={
                        {
                          backgroundColor: '#8b5cf6',
                          border: '2px solid #0d1117',
                          '--glow-color': 'rgba(139, 92, 246, 0.4)',
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </HtmlMarker>
              );
            }
            if (pin.type === 'user') {
              return (
                <HtmlMarker
                  key={`user-${index}`}
                  position={{ lat: pin.lat, lng: pin.lng }}
                  zIndex={50}
                >
                  <div className="relative flex items-center justify-center w-6 h-6">
                    <div className="absolute w-full h-full bg-[#22c55e] rounded-full animate-ping opacity-60" />
                    <div className="relative w-3 h-3 bg-[#22c55e] border-2 border-[#0d1117] rounded-full" />
                  </div>
                </HtmlMarker>
              );
            }
            return null;
          })}

          {selectedPin && selectedPin.type !== 'user' && (
            <PinTooltip
              pin={selectedPin}
              onClose={() => setSelectedPin(null)}
            />
          )}

          <StormTrackPolyline path={stormTrack} />
          <MapController
            pins={pins}
            agentsActive={agentsActive}
            mapView={mapView}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
