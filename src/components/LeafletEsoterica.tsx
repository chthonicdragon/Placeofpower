import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Layers, Sparkles, MapPin, Eye, Zap, Flame, Infinity, LocateFixed } from 'lucide-react';
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
  mapCenter: { lat: number; lng: number } | null;
  setMapCenter: (pos: { lat: number; lng: number }) => void;
}

export default function LeafletEsoterica({
  places,
  selectedPlace,
  setSelectedPlace,
  isAddingPlace,
  newPlacePos,
  setNewPlacePos,
  theme,
  lang,
  mapCenter,
  setMapCenter,
}: Props) {
  const t = translations[lang];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInst, setMapInst] = useState<L.Map | null>(null);

  // Visual toggles inside the Map HUD
  const [showLeyLines, setShowLeyLines] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [projection, setProjection] = useState<'cartodb' | 'cosmic' | 'real'>('real'); // Default to real OSM for detailed Russian labeling

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        alert(t.location_denied || 'Location access denied');
      }
    );
  };

  // Init leaflet instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center map
    const defaultLat = mapCenter ? mapCenter.lat : 55.751244;
    const defaultLng = mapCenter ? mapCenter.lng : 37.618423;
    const defaultZoom = mapCenter ? 7 : 4;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    setMapInst(map);

    // Zoom buttons position
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Map click handler for placing elements
    map.on('click', (e: L.LeafletMouseEvent) => {
      // Small timeout to prevent interference with marker clicks
      setTimeout(() => {
        setNewPlacePos({ lat: e.latlng.lat, lng: e.latlng.lng });
      }, 50);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update Tile Layer based on selected Projection / Theme
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  useEffect(() => {
    if (!mapInst) return;

    if (activeTileLayerRef.current) {
      mapInst.removeLayer(activeTileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // default real OSM
    let options: L.TileLayerOptions = {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    };

    if (projection === 'cartodb') {
      url = theme === 'abyssal' 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      options.attribution = '© CartoDB';
    } else if (projection === 'cosmic') {
      // Cosmic uses standard detailed OSM tiles with high-accuracy, but inverted via custom CSS class
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    const tileLayer = L.tileLayer(url, options).addTo(mapInst);
    activeTileLayerRef.current = tileLayer;

  }, [mapInst, projection, theme]);

  // Handle smooth centering when mapCenter coordinates change
  useEffect(() => {
    if (!mapInst || !mapCenter) return;
    mapInst.setView([mapCenter.lat, mapCenter.lng], mapInst.getZoom() > 6 ? mapInst.getZoom() : 7, {
      animate: true,
      duration: 1.5,
    });
  }, [mapCenter, mapInst]);

  // Synchronize Markers and Vector layers (Lines & Glowing Heatmaps)
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!mapInst) return;

    // Initialize or clear layer group
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(mapInst);
    } else {
      layerGroupRef.current.clearLayers();
    }

    const mainGroup = layerGroupRef.current;

    // 1. Draw glowing circles (Heatmap)
    if (showHeatmap) {
      places.forEach((p) => {
        const glowColor = projection === 'cosmic' ? '#ff1a53' : '#8b5cf6';
        const rawRadius = (p.energyLevel || 5) * 16000; // in meters

        L.circle([p.lat, p.lng], {
          radius: rawRadius,
          fillColor: glowColor,
          fillOpacity: 0.15,
          color: glowColor,
          weight: 1,
          opacity: 0.35,
          className: 'leaflet-energy-halo animate-pulse',
        }).addTo(mainGroup);
      });
    }

    // 2. Draw ley-lines relationships representing connections of power
    if (showLeyLines) {
      const drawnPairs = new Set<string>();

      for (let i = 0; i < places.length; i++) {
        const p1 = places[i];
        // Find nearest up to 2 nodes
        const distances = places
          .map((p2, idx) => {
            if (idx === i) return { place: p2, dist: Infinity };
            const d = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
            return { place: p2, dist: d };
          })
          .filter(d => d.dist < 50)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);

        distances.forEach(({ place: p2 }) => {
          const pairId = [p1.id, p2.id].sort().join('-');
          if (drawnPairs.has(pairId)) return;
          drawnPairs.add(pairId);

          const ambientColor = projection === 'cosmic' ? '#ff1a53' : (theme === 'abyssal' ? '#8b5cf6' : '#f59e0b');
          const dashColor = projection === 'cosmic' ? '#1aebd6' : (theme === 'abyssal' ? '#f59e0b' : '#3b82f6');

          // Ambient glow path line
          L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
            color: ambientColor,
            weight: 2,
            opacity: projection === 'cosmic' ? 0.45 : 0.25,
            className: 'ley-line-glow'
          }).addTo(mainGroup);

          // Pulsating moving dashes path line
          L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
            color: dashColor,
            weight: 1.5,
            opacity: 0.7,
            className: 'ley-line-animated' // will animate via custom CSS below
          }).addTo(mainGroup);
        });
      }
    }

    // 3. Draw Place Markers with Custom HTML representation
    places.forEach((place) => {
      const isSelected = selectedPlace?.id === place.id;
      
      const markerHtml = `
        <div class="relative flex items-center justify-center pointer-events-auto">
          ${isSelected ? `
            <div class="absolute -inset-4 rounded-full border border-dashed border-sacred-gold/50 animate-spin [animation-duration:15s]"></div>
            <div class="absolute -inset-2 bg-${place.type === 'public' ? '[#d97706]' : '[#8b5cf6]'}/20 rounded-full animate-ping [animation-duration:2s]"></div>
          ` : ''}
          <div class="w-8 h-8 rounded-full border ${isSelected ? 'border-sacred-gold bg-black' : 'border-white/10 bg-[#0f0a1c]'} flex items-center justify-center shadow-xl transition-all hover:scale-125 duration-300">
            ${place.type === 'public' 
              ? `<div class="w-3.5 h-3.5 bg-[#d97706] rounded-full shadow-[0_0_15px_#d97706]"></div>`
              : `<div class="w-3 h-3 bg-[#8b5cf6] rotate-45 shadow-[0_0_15px_#8b5cf6]"></div>`
            }
          </div>
          <div class="absolute top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/10 text-[9px] font-mono tracking-wider text-white capitalize whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-250 select-none">
            ${place.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker-wrapper',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(mainGroup);
      
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedPlace(place);
        setMapCenter({ lat: place.lat, lng: place.lng });
      });
    });

    // 4. Draw adding place state indicator
    if (isAddingPlace && newPlacePos) {
      const addIconHtml = `
        <div class="w-10 h-10 rounded-full bg-sacred-gold/25 border-2 border-sacred-gold flex items-center justify-center text-sacred-gold animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
      `;

      const addIcon = L.divIcon({
        html: addIconHtml,
        className: 'custom-leaflet-adding-pin',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      L.marker([newPlacePos.lat, newPlacePos.lng], { icon: addIcon }).addTo(mainGroup);
    }

  }, [mapInst, places, selectedPlace, isAddingPlace, newPlacePos, showLeyLines, showHeatmap, projection, theme]);

  // Build Filter Wrapper Style Code class name
  const filterClass = useMemo(() => {
    if (projection === 'cosmic') return 'esoterica-cosmic-filter';
    if (projection === 'cartodb' && theme === 'abyssal') return 'esoterica-cartodb-dark-filter';
    return '';
  }, [projection, theme]);

  return (
    <div className="w-full h-full relative" id="leaflet-universe-container">
      {/* CSS overrides for beautiful animation of polyline and custom filtered tiles */}
      <style>{`
        /* Smooth, hardware-accelerated animated moving ley-lines! */
        .ley-line-animated {
          stroke-dasharray: 8, 12;
          animation: leyLineDashOffsetMove 1.2s linear infinite;
        }
        @keyframes leyLineDashOffsetMove {
          to {
            stroke-dashoffset: -20;
          }
        }
        
        /* Dark Cosmic Inverted style mapping for standard OpenStreetMap */
        .esoterica-cosmic-filter .leaflet-tile-container {
          filter: invert(0.92) hue-rotate(210deg) saturate(1.6) contrast(1.2) brightness(0.95);
        }
        .esoterica-cosmic-filter .leaflet-container {
          background-color: #0c081a !important;
        }

        /* CartoDB Black enhancements */
        .esoterica-cartodb-dark-filter .leaflet-tile-container {
          filter: saturate(1.15) brightness(0.85) contrast(1.1);
        }
        .esoterica-cartodb-dark-filter .leaflet-container {
          background-color: #090310 !important;
        }

        /* Standard Leaflet pane cleanup inside nested flex boxes */
        .leaflet-container {
          font-family: inherit;
        }
        
        /* Make sure markers stand on top of tile layers without inversion */
        .leaflet-marker-pane, .leaflet-overlay-pane {
          filter: none !important;
        }
      `}</style>

      {/* Main Map Elements Canvas container */}
      <div 
        ref={mapContainerRef} 
        className={`w-full h-full absolute inset-0 select-none outline-none z-0 ${filterClass}`}
        style={{ background: theme === 'abyssal' ? '#090310' : '#fdfbf7' }}
      />

      {/* Futuristic Magical Space HUD Overlays */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2 p-4 bg-[#0f0a1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl pointer-events-auto shadow-2xl max-w-sm sm:w-[280px]">
        <div className="flex items-center gap-2">
          <Infinity size={14} className="text-sacred-gold animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-sacred-gold font-bold">
            Esoteric Projection Mode
          </span>
        </div>
        <p className="font-sans text-[10px] text-white/50 leading-relaxed font-light">
          {lang === 'ru' 
            ? 'Проекция пространства Эфира на основе детальных гео-данных.' 
            : 'Etheric space projection built on high precision geo-data.'
          }
        </p>

        {/* Projection Selector */}
        <div className="w-full h-[1px] bg-white/5 my-1"></div>
        <div className="flex flex-col gap-1">
          <label className="text-[7.5px] font-mono uppercase tracking-[0.2em] text-white/40">
            {t.projection_mode || 'Map Projection'}
          </label>
          <div className="flex flex-col gap-1 mt-1 font-sans text-[9px]">
            <button
              onClick={() => setProjection('real')}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                projection === 'real'
                  ? 'bg-amber-500/10 border-amber-500/30 text-sacred-gold font-bold shadow-[0_0_12px_rgba(217,119,6,0.1)]'
                  : 'bg-black/40 border-white/5 text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="truncate">{t.projection_real || 'Material Plane (Detailed Russian OSM)'}</span>
              {projection === 'real' && <div className="w-1.5 h-1.5 bg-sacred-gold rounded-full animate-pulse ml-2 flex-shrink-0"></div>}
            </button>

            <button
              onClick={() => setProjection('cosmic')}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                projection === 'cosmic'
                  ? 'bg-sacred-purple/30 border-sacred-purple/80 text-sacred-gold font-bold shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                  : 'bg-black/40 border-white/5 text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="truncate">{t.projection_cosmic || 'Astral Runes (Detailed Inverted)'}</span>
              {projection === 'cosmic' && <div className="w-1.5 h-1.5 bg-sacred-gold rounded-full animate-pulse ml-2 flex-shrink-0"></div>}
            </button>
            
            <button
              onClick={() => setProjection('cartodb')}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                projection === 'cartodb'
                  ? 'bg-white/5 border-white/25 text-white font-medium'
                  : 'bg-black/40 border-white/5 text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="truncate">{t.projection_cartodb || 'Cosmic Atlas (Minimalist)'}</span>
              {projection === 'cartodb' && <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse ml-2 flex-shrink-0"></div>}
            </button>
          </div>
        </div>

        {/* Real-time map layers HUD controls */}
        <div className="w-full h-[1px] bg-white/5 my-1"></div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLeyLines(!showLeyLines)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[8px] font-mono uppercase tracking-wider cursor-pointer transition-all duration-300 ${
              showLeyLines 
                ? 'bg-sacred-purple/20 border-sacred-purple text-sacred-gold font-bold' 
                : 'bg-black/40 border-white/5 text-white/40'
            }`}
          >
            <Zap size={10} className={showLeyLines ? "text-sacred-gold animate-bounce" : ""} />
            {lang === 'ru' ? 'Линии Эфира' : 'Ley Lines'}
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[8px] font-mono uppercase tracking-wider cursor-pointer transition-all duration-300 ${
              showHeatmap 
                ? 'bg-amber-500/10 border-amber-600 text-amber-500 font-bold' 
                : 'bg-black/40 border-white/5 text-white/40'
            }`}
          >
            <Flame size={10} className={showHeatmap ? "text-amber-500 fill-amber-500 animate-pulse" : ""} />
            {lang === 'ru' ? 'Энерго-Свечение' : 'Heatmap'}
          </button>
        </div>
      </div>

      {/* Coordinate Telemetry Indicator */}
      <div className="absolute top-6 right-20 z-[1000] hidden sm:flex items-center gap-2 bg-[#0f0a1c]/70 backdrop-blur-xl px-3 py-2 rounded-xl border border-white/5 font-mono text-[8px] tracking-[0.15em] uppercase text-white/50">
        <Sparkles size={10} className="text-sacred-gold animate-spin [animation-duration:8s]" />
        <span>LAT: {selectedPlace ? selectedPlace.lat.toFixed(4) : "0.00"}</span>
        <span className="text-white/20">|</span>
        <span>LNG: {selectedPlace ? selectedPlace.lng.toFixed(4) : "0.00"}</span>
      </div>

      {/* Geolocation Locator Float Button */}
      <div className="absolute bottom-6 right-6 z-[1000] block pointer-events-auto">
        <button 
          onClick={handleLocate}
          className="w-11 h-11 bg-[#0f0a1c]/90 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-sacred-gold hover:text-white transition-all shadow-2xl hover:border-sacred-gold/50 cursor-pointer pointer-events-auto"
          title={lang === 'ru' ? 'Мое местоположение' : 'My location'}
        >
          <LocateFixed size={18} />
        </button>
      </div>
    </div>
  );
}
