import React, { useState, useMemo } from 'react';
import { Compass, Sparkles, MapPin, Eye, Info, HelpCircle } from 'lucide-react';
import { Place } from '../types';
import { Language, translations } from '../translations';

interface Props {
  places: Place[];
  selectedPlace: Place | null;
  setSelectedPlace: (p: Place | null) => void;
  isAddingPlace: boolean;
  newPlacePos: { lat: number; lng: number } | null;
  setNewPlacePos: (pos: { lat: number; lng: number } | null) => void;
  theme: 'abyssal' | 'ethereal';
  lang: Language;
  setMapCenter: (pos: { lat: number; lng: number }) => void;
}

export default function EsotericUniverseProjection({
  places,
  selectedPlace,
  setSelectedPlace,
  isAddingPlace,
  newPlacePos,
  setNewPlacePos,
  theme,
  lang,
  setMapCenter
}: Props) {
  const t = translations[lang];

  // SVG dimensions
  const width = 800;
  const height = 500;

  // Static stars background
  const backgroundStars = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      pulse: Math.random() > 0.5,
    }));
  }, []);

  // Map latitude/longitude to flat projection coords
  // Longitude: -180 to 180 -> 80 to 720 (X-axis)
  // Latitude: -90 to 90 -> 420 to 80 (inverted Y-axis)
  const toCanvas = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * (width - 160) + 80;
    const y = (height - 160) - ((lat + 90) / 180) * (height - 160) + 80;
    return { x, y };
  };

  const fromCanvas = (cx: number, cy: number) => {
    const lng = ((cx - 80) / (width - 160)) * 360 - 180;
    const lat = (((height - 160) - (cy - 80)) / (height - 160)) * 180 - 90;
    return {
      lat: Math.max(-90, Math.min(90, lat)),
      lng: Math.max(-180, Math.min(180, lng))
    };
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isAddingPlace) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * width;
    const clickY = ((e.clientY - rect.top) / rect.height) * height;

    const coords = fromCanvas(clickX, clickY);
    setNewPlacePos(coords);
    setMapCenter(coords);
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-[#0a0515] select-none rounded-3xl overflow-hidden">
      {/* Background Starry Ambiance */}
      <div className="absolute inset-0 bg-radial from-[#150d2c] to-[#04020a]"></div>
      <div className="absolute inset-0 sacred-grid pointer-events-none opacity-20"></div>

      {/* Interactive Galactic Area */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full z-10 max-h-[500px]"
        onClick={handleSvgClick}
      >
        {/* Starfields */}
        {backgroundStars.map(star => (
          <circle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="#e0d8f0"
            opacity={star.opacity}
            className={star.pulse ? "animate-pulse" : ""}
          />
        ))}

        {/* Concentric Astro Rings */}
        <circle cx={width / 2} cy={height / 2} r={180} fill="none" stroke="rgba(217, 119, 6, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx={width / 2} cy={height / 2} r={120} fill="none" stroke="rgba(139, 92, 246, 0.12)" strokeWidth="1" />
        <circle cx={width / 2} cy={height / 2} r={60} fill="none" stroke="rgba(217, 119, 6, 0.1)" strokeWidth="0.8" />
        
        {/* Crosshair Axes */}
        <line x1={80} y1={height / 2} x2={width - 80} y2={height / 2} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={0.8} />
        <line x1={width / 2} y1={80} x2={width / 2} y2={height - 80} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={0.8} />

        {/* Constellation connectors */}
        {places.length > 1 && places.map((p1, idx) => {
          const c1 = toCanvas(p1.lat, p1.lng);
          return places.slice(idx + 1, idx + 4).map((p2) => {
            const c2 = toCanvas(p2.lat, p2.lng);
            const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
            if (dist < 150) {
              return (
                <line
                  key={`${p1.id}-${p2.id}`}
                  x1={c1.x}
                  y1={c1.y}
                  x2={c2.x}
                  y2={c2.y}
                  stroke="rgba(217, 119, 6, 0.15)"
                  strokeWidth="0.5"
                  className="animate-pulse"
                />
              );
            }
            return null;
          });
        })}

        {/* Active Node Star Markers */}
        {places.map(place => {
          const { x, y } = toCanvas(place.lat, place.lng);
          const isSelected = selectedPlace?.id === place.id;
          return (
            <g
              key={place.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlace(place);
                setMapCenter({ lat: place.lat, lng: place.lng });
              }}
              className="cursor-pointer group"
            >
              {/* Pulsing selection aura */}
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill="none"
                  stroke={place.type === 'public' ? '#d97706' : '#8b5cf6'}
                  strokeWidth="1.5"
                  className="animate-ping"
                  opacity={0.5}
                />
              )}
              {/* Tiny pointer circle */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 6 : 4}
                fill={place.type === 'public' ? '#d97706' : '#8b5cf6'}
                className="transition-all duration-300 group-hover:scale-125"
                filter={`drop-shadow(0 0 6px ${place.type === 'public' ? '#d97706' : '#8b5cf6'})`}
              />
              {/* Outer hover ring */}
              <circle
                cx={x}
                cy={y}
                r={10}
                fill="transparent"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
              {/* Star Text name */}
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                fill="#e0d8f0"
                opacity={isSelected ? 0.9 : 0.4}
                fontSize="8px"
                className="font-mono tracking-widest uppercase pointer-events-none transition-opacity duration-300 select-none"
              >
                {place.name}
              </text>
            </g>
          );
        })}

        {/* Placing new custom star */}
        {isAddingPlace && newPlacePos && (() => {
          const { x, y } = toCanvas(newPlacePos.lat, newPlacePos.lng);
          return (
            <g className="animate-bounce">
              <circle cx={x} cy={y} r={8} fill="none" stroke="#d97706" strokeWidth={1} />
              <line x1={x - 12} y1={y} x2={x + 12} y2={y} stroke="#d97706" strokeWidth={1} />
              <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke="#d97706" strokeWidth={1} />
            </g>
          );
        })()}
      </svg>

      {/* Decorative Outer HUD Dial */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-1 items-start bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 font-mono text-[8px] uppercase tracking-widest text-sacred-gold">
        <span className="flex items-center gap-1">
          <Sparkles size={8} className="animate-spin [animation-duration:10s]" />
          Universe Projection Mode
        </span>
        <span className="text-white/40">HUD: SECURE OFFLINE DESKTOP</span>
      </div>

      <div className="absolute top-6 right-6 z-20 flex items-center justify-center bg-black/40 p-2 rounded-xl border border-white/5 font-mono text-[8px] uppercase tracking-widest text-white/40">
        LAT: {selectedPlace ? selectedPlace.lat.toFixed(4) : "0.0000"} | LNG: {selectedPlace ? selectedPlace.lng.toFixed(4) : "0.0000"}
      </div>
    </div>
  );
}
