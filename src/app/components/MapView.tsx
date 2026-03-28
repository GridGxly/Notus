'use client';

import { useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { MapPin } from '../lib/types';

interface MapViewProps {
  agentsActive?: boolean;
  pins?: MapPin[];
  stormTrack?: { lat: number; lng: number }[];
}

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#14141f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#14141f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a0f' }] },
];

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
      icons: [
        {
          icon: lineSymbol,
          offset: '0',
          repeat: '12px',
        },
      ],
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);

  return null;
}

export default function MapView({ agentsActive = false, pins = [], stormTrack = [] }: MapViewProps) {
  const center = { lat: 27.9506, lng: -82.4572 };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyFakePlaceholderForUI';

  return (
    <div className="flex-1 min-h-0 relative bg-[var(--bg-card)] overflow-hidden">
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
          styles={mapStyles}
          style={{ width: '100%', height: '100%' }}
        >
          {pins.map((pin, index) => {
            if (pin.type === 'supply') {
              return (
                <AdvancedMarker key={index} position={{ lat: pin.lat, lng: pin.lng }}>
                  <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] border-[1.5px] border-[#0d1117] shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                </AdvancedMarker>
              );
            }
            if (pin.type === 'shelter') {
              return (
                <AdvancedMarker key={index} position={{ lat: pin.lat, lng: pin.lng }}>
                  <div className="w-3.5 h-3.5 bg-[#8b5cf6] border-[1.5px] border-[#0d1117] shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                </AdvancedMarker>
              );
            }
            if (pin.type === 'user') {
              return (
                <AdvancedMarker key={index} position={{ lat: pin.lat, lng: pin.lng }} zIndex={50}>
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <div className="absolute w-full h-full bg-[#22c55e] rounded-full animate-ping opacity-60" />
                    <div className="relative w-2 h-2 bg-[#22c55e] border border-[#0d1117] rounded-full" />
                  </div>
                </AdvancedMarker>
              );
            }
            return null;
          })}

          <StormTrackPolyline path={stormTrack} />
        </Map>
      </APIProvider>
    </div>
  );
}
