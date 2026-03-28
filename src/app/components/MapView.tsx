'use client';

import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { MapPin } from '../lib/types';

interface MapViewProps {
  agentsActive?: boolean;
  pins?: MapPin[];
  stormTrack?: { lat: number; lng: number }[];
  mapView?: { lat: number; lng: number; zoom?: number };
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
      map,
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

    map.panTo({ lat: mapView.lat, lng: mapView.lng });
    if (mapView.zoom) {
      const currentZoom = map.getZoom() || 12;
      const targetZoom = mapView.zoom;
      if (Math.abs(currentZoom - targetZoom) > 0.5) {
        map.setZoom(targetZoom);
      }
    }
  }, [map, mapView]);

  useEffect(() => {
    if (!map) return;

    const userPin = pins.find(p => p.type === 'user');
    if (userPin && prevPinCount.current === 0 && pins.length > 0) {
      map.panTo({ lat: userPin.lat, lng: userPin.lng });
      map.setZoom(13);
    }

    if (pins.length > 3 && pins.length !== prevPinCount.current) {
      const bounds = new google.maps.LatLngBounds();
      pins.forEach(pin => bounds.extend({ lat: pin.lat, lng: pin.lng }));
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }

    prevPinCount.current = pins.length;
  }, [map, pins, agentsActive]);

  return null;
}

function PinTooltip({ pin, onClose }: { pin: MapPin; onClose: () => void }) {
  return (
    <AdvancedMarker position={{ lat: pin.lat, lng: pin.lng }} zIndex={100}>
      <div
        className="bg-[#14141f] border border-[#1a1a2e] rounded-lg p-2.5 shadow-2xl min-w-[160px] -translate-y-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-1 right-1.5 text-[#475569] hover:text-[#e2e8f0] text-[10px]"
        >
          x
        </button>
        <div
          className="text-[11px] font-semibold mb-0.5"
          style={{ color: pin.type === 'supply' ? '#f59e0b' : pin.type === 'shelter' ? '#8b5cf6' : '#22c55e' }}
        >
          {pin.label}
        </div>
        <div className="text-[9px] text-[#475569] mb-1.5">
          {pin.type === 'supply' ? 'Gas Station / Supply' : pin.type === 'shelter' ? 'Emergency Shelter' : 'Your Location'}
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-[#3b82f6] font-medium hover:underline"
        >
          Get Directions &rarr;
        </a>
      </div>
    </AdvancedMarker>
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
    <div className="flex-1 min-h-0 relative bg-[#06070a] overflow-hidden group">
      {agentsActive && (
        <div className="absolute inset-0 pointer-events-none z-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
          <div className="absolute bottom-5 right-5 text-[8px] font-mono text-white/30 tracking-widest text-right">
            <div>GEO: {mapView?.lat?.toFixed(5) || center.lat.toFixed(5)}</div>
            <div>LNG: {mapView?.lng?.toFixed(5) || center.lng.toFixed(5)}</div>
          </div>
        </div>
      )}

      {!agentsActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0f]/60 backdrop-blur-md transition-opacity duration-300">
          <svg className="w-8 h-8 mb-3 stroke-[#1e293b] fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <div className="text-[12px] text-[#e2e8f0] font-medium tracking-wide">Enter your zip code to get started</div>
        </div>
      )}

      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={12}
          disableDefaultUI={true}
          mapId="DEMO_MAP_ID"
          style={{ width: '100%', height: '100%' }}
          onClick={() => setSelectedPin(null)}
        >
          {pins.map((pin, index) => {
            if (pin.type === 'supply') {
              return (
                <AdvancedMarker
                  key={`supply-${index}`}
                  position={{ lat: pin.lat, lng: pin.lng }}
                  onClick={() => setSelectedPin(pin)}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] border-[1.5px] border-[#0d1117] shadow-[0_0_8px_rgba(245,158,11,0.6)] cursor-pointer hover:scale-125 transition-transform animate-pin-drop" />
                </AdvancedMarker>
              );
            }
            if (pin.type === 'shelter') {
              return (
                <AdvancedMarker
                  key={`shelter-${index}`}
                  position={{ lat: pin.lat, lng: pin.lng }}
                  onClick={() => setSelectedPin(pin)}
                >
                  <div className="w-3.5 h-3.5 bg-[#8b5cf6] border-[1.5px] border-[#0d1117] shadow-[0_0_8px_rgba(139,92,246,0.6)] cursor-pointer hover:scale-125 transition-transform animate-pin-drop" />
                </AdvancedMarker>
              );
            }
            if (pin.type === 'user') {
              return (
                <AdvancedMarker key={`user-${index}`} position={{ lat: pin.lat, lng: pin.lng }} zIndex={50}>
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <div className="absolute w-full h-full bg-[#22c55e] rounded-full animate-ping opacity-60" />
                    <div className="relative w-2 h-2 bg-[#22c55e] border border-[#0d1117] rounded-full" />
                  </div>
                </AdvancedMarker>
              );
            }
            return null;
          })}

          {selectedPin && selectedPin.type !== 'user' && (
            <PinTooltip pin={selectedPin} onClose={() => setSelectedPin(null)} />
          )}

          <StormTrackPolyline path={stormTrack} />
          <MapController pins={pins} agentsActive={agentsActive} mapView={mapView} />
        </Map>
      </APIProvider>
    </div>
  );
}
