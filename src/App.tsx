/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Compass, Moon, Sun, Layers, Plus, MapPin, Eye, EyeOff, Info, Search, X, Star, MessageSquare, User, Languages, Sparkles, Trash2, Navigation, LocateFixed, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Place, UserSettings } from './types';
import { KNOWN_PLACES } from './constants';
import { translations, Language } from './translations';
import { GoogleGenAI } from "@google/genai";
import LeafletEsoterica from './components/LeafletEsoterica';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  const [lang, setLang] = useState<Language>('ru');
  const [theme, setTheme] = useState<'abyssal' | 'ethereal'>('abyssal');
  const t = translations[lang];
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const moonPhase = useMemo(() => {
    const date = new Date();
    const lp = 2551443; 
    const now = new Date();
    const new_moon = new Date(1970, 0, 7, 20, 35, 0);
    const phase = ((now.getTime() - new_moon.getTime()) / 1000) % lp;
    const age = Math.floor(phase / (24 * 3600)) + 1;
    
    let info = { name: t.moon_new, icon: '🌑', age };
    if (age < 2) info = { name: t.moon_new, icon: '🌑', age };
    else if (age < 8) info = { name: t.moon_waxing_crescent, icon: '🌒', age };
    else if (age < 10) info = { name: t.moon_first_quarter, icon: '🌓', age };
    else if (age < 14) info = { name: t.moon_waxing_gibbous, icon: '🌔', age };
    else if (age < 17) info = { name: t.moon_full, icon: '🌕', age };
    else if (age < 21) info = { name: t.moon_waning_gibbous, icon: '🌖', age };
    else if (age < 24) info = { name: t.moon_last_quarter, icon: '🌗', age };
    else if (age < 27) info = { name: t.moon_waning_crescent, icon: '🌘', age };
    
    return info;
  }, [lang, t]);
  const [settings, setSettings] = useState<UserSettings>({
    showPublic: true,
    showPrivate: true,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlacePos, setNewPlacePos] = useState<{lat: number, lng: number} | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [isAlmanacOpen, setIsAlmanacOpen] = useState(false);
  const [isRitualsOpen, setIsRitualsOpen] = useState(false);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Seeker');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const auraStatus = useMemo(() => {
    const age = moonPhase.age;
    if (age >= 14 && age <= 16) return t.aura_radiant;
    if (age >= 28 || age <= 1) return t.aura_void;
    return t.aura_dim;
  }, [moonPhase, t]);

  // Load from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('esoterica_theme');
    if (savedTheme) setTheme(savedTheme as any);

    const savedName = localStorage.getItem('esoterica_username');
    if (savedName) setUserName(savedName);

    const hasSeenOnboarding = localStorage.getItem('esoterica_onboarding_v1');
    if (!hasSeenOnboarding) setShowOnboarding(true);

    const savedPlaces = localStorage.getItem('esoterica_places');
    if (savedPlaces) {
      try {
        const parsed = JSON.parse(savedPlaces);
        setPlaces([...KNOWN_PLACES, ...parsed]);
      } catch (e) {
        setPlaces(KNOWN_PLACES);
      }
    } else {
      setPlaces(KNOWN_PLACES);
    }
  }, []);

  const savePlaces = (updatedPlaces: Place[]) => {
    const personalOnly = updatedPlaces.filter(p => p.creator !== 'System');
    localStorage.setItem('esoterica_places', JSON.stringify(personalOnly));
  };


  const createPlace = (name: string, description: string, type: 'public' | 'private', energyLevel: number, tags: string[]) => {
    if (!newPlacePos) return;
    const newPlace: Place = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || 'Unnamed Node',
      description,
      type,
      energyLevel,
      lat: newPlacePos.lat,
      lng: newPlacePos.lng,
      createdAt: Date.now(),
      creator: 'User',
      tags,
      comments: [],
    };
    const updated = [...places, newPlace];
    setPlaces(updated);
    savePlaces(updated);
    setIsAddingPlace(false);
    setNewPlacePos(null);
    setSelectedPlace(newPlace);
  };

  const deletePlace = (id: string) => {
    if (!window.confirm(t.confirm_delete)) return;
    const updated = places.filter(p => p.id !== id);
    setPlaces(updated);
    savePlaces(updated);
    setSelectedPlace(null);
  };

  const filteredPlaces = places.filter(p => {
    if (p.type === 'public' && !settings.showPublic) return false;
    if (p.type === 'private' && !settings.showPrivate) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedTag && (!p.tags || !p.tags.includes(selectedTag))) return false;
    return true;
  });

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    places.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [places]);

  const handleShare = () => {
    if (!selectedPlace) return;
    const shareText = `Esoterica Node: ${selectedPlace.name} [${selectedPlace.lat.toFixed(4)}, ${selectedPlace.lng.toFixed(4)}] - ${selectedPlace.description}`;
    navigator.clipboard.writeText(shareText).then(() => {
      showToast(t.insight_shared);
    });
  };

  return (
    <div className={`h-screen w-screen bg-sacred-dark text-sacred-text font-serif relative overflow-hidden flex flex-col transition-colors duration-700 ${theme === 'ethereal' ? 'ethereal' : ''}`}>
      {/* Background Atmosphere */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sacred-purple rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sacred-gold rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 sacred-grid pointer-events-none"></div>

      {/* Top Header Navigation */}
      <header className="h-20 flex items-center justify-between px-4 sm:px-8 z-50 backdrop-blur-md border-b border-white/10 shrink-0 w-full overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-sacred-gold rotate-45 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 border border-sacred-gold rotate-45"></div>
          </div>
          <h1 className="text-lg sm:text-2xl font-light tracking-[0.2em] uppercase truncate">
            Esoterica <span className="text-sacred-gold">OS</span>
          </h1>
        </div>
        <nav className="hidden lg:flex gap-8 text-[10px] uppercase tracking-[0.3em]">
          <span className="text-white/40 cursor-not-allowed">{t.vault}</span>
          <span className="text-sacred-gold border-b border-sacred-gold pb-1 cursor-default">{t.map_of_power}</span>
          <button 
            onClick={() => setIsRitualsOpen(true)}
            className="text-white/40 hover:text-sacred-gold transition-colors"
          >
            {t.rituals}
          </button>
          <button 
            onClick={() => setIsAlmanacOpen(true)}
            className="text-white/40 hover:text-sacred-gold transition-colors"
          >
            {t.almanac}
          </button>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <button 
            onClick={() => {
              const newTheme = theme === 'abyssal' ? 'ethereal' : 'abyssal';
              setTheme(newTheme);
              localStorage.setItem('esoterica_theme', newTheme);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-sacred-gold group shrink-0"
          >
            {theme === 'abyssal' ? <Sun size={10} className="group-hover:rotate-90 transition-transform" /> : <Moon size={10} className="group-hover:-rotate-12 transition-transform" />}
            <span className="hidden sm:inline">{theme === 'abyssal' ? t.ethereal_mode : t.abyssal_mode}</span>
          </button>
          <button 
            onClick={() => setLang(l => l === 'ru' ? 'en' : 'ru')}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-sacred-gold shrink-0"
          >
            <Languages size={10} />
            {lang.toUpperCase()}
          </button>
          <div className="text-right hidden md:block font-sans">
            <p className="text-[10px] text-white/40 uppercase tracking-tighter">{t.current_phase}</p>
            <p className="text-xs">{moonPhase.name}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-sacred-gold/5 text-lg sm:text-xl">
            <span>{moonPhase.icon}</span>
          </div>
          <button 
            onClick={() => setIsIdentityOpen(true)}
            className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 border border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group shrink-0"
          >
            <div className="flex flex-col items-end hidden xs:flex">
              <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-white/40">{t.seeker_name}</span>
              <span className="text-[10px] sm:text-xs font-mono text-sacred-gold">{userName}</span>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-sacred-gold/10 border border-sacred-gold/30 flex items-center justify-center text-sacred-gold group-hover:scale-110 transition-transform shrink-0">
               <User size={12} className="sm:size-4" />
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6 relative z-10 w-full">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              className="absolute md:relative left-4 md:left-0 top-4 md:top-0 bottom-4 md:bottom-0 w-[calc(100%-2rem)] sm:w-80 h-[calc(100%-2rem)] md:h-full glass-panel rounded-3xl z-[2000] md:z-[1000] flex flex-col shrink-0 shadow-2xl"
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-sacred-gold">{t.system_navigation}</p>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-white/40 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                  <input 
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-sacred-gold transition-all font-sans placeholder:text-white/20"
                    placeholder={t.search_nodes}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{t.channel_resonance}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettings(s => ({ ...s, showPublic: !s.showPublic }))}
                      className={`flex-1 py-3 px-3 rounded-xl border transition-all text-[10px] uppercase tracking-widest ${
                        settings.showPublic ? 'bg-sacred-gold/20 border-sacred-gold text-sacred-gold' : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      {t.public}
                    </button>
                    <button
                      onClick={() => setSettings(s => ({ ...s, showPrivate: !s.showPrivate }))}
                      className={`flex-1 py-3 px-3 rounded-xl border transition-all text-[10px] uppercase tracking-widest ${
                        settings.showPrivate ? 'bg-sacred-purple/40 border-sacred-energy text-sacred-energy' : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      {t.private}
                    </button>
                  </div>
                </div>

                {availableTags.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">{t.tag_cloud}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button 
                        onClick={() => setSelectedTag(null)}
                        className={`text-[8px] uppercase px-2 py-1 rounded-md border transition-all ${!selectedTag ? 'bg-sacred-gold/20 border-sacred-gold text-sacred-gold' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                      >
                        {t.all_tags}
                      </button>
                      {availableTags.map(tag => (
                        <button 
                          key={tag}
                          onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                          className={`text-[8px] uppercase px-2 py-1 rounded-md border transition-all ${selectedTag === tag ? 'bg-sacred-gold/20 border-sacred-gold text-sacred-gold' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">{t.power_nodes}</p>
                <div className="space-y-2">
                  {filteredPlaces.map(place => (
                    <button
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                        selectedPlace?.id === place.id ? 'bg-white/10 border-sacred-gold shadow-[0_0_30px_rgba(217,119,6,0.15)] scale-[1.02]' : 'bg-white/5 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${place.type === 'public' ? 'bg-sacred-gold energy-glow animate-pulse' : 'bg-sacred-energy'}`} />
                      <div className="font-sans flex-1">
                        <div className="flex justify-between items-start gap-2">
                           <p className="text-sm font-medium text-white/90 leading-tight line-clamp-1">{place.name}</p>
                           {place.comments.length > 0 && (
                             <div className="flex items-center gap-1 shrink-0">
                               <Star size={10} className="fill-sacred-gold text-sacred-gold" />
                               <span className="text-[10px] text-sacred-gold font-bold">
                                 {(place.comments.reduce((acc, c) => acc + c.rating, 0) / place.comments.length).toFixed(1)}
                               </span>
                             </div>
                           )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[9px] font-mono text-white/30 uppercase tracking-tighter">
                            Ref: {place.lat.toFixed(3)} / {place.lng.toFixed(3)}
                          </p>
                          {place.tags && place.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {place.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-[7px] uppercase px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/40 rounded-sm">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {place.comments.length > 0 && (
                            <div className="flex items-center gap-1 text-white/20">
                              <MessageSquare size={10} />
                              <span className="text-[9px]">{place.comments.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <button
                  onClick={() => setIsAddingPlace(true)}
                  className="w-full py-4 bg-sacred-gold hover:bg-sacred-gold/90 text-sacred-dark rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-sacred-gold/20 active:scale-95"
                >
                  <Plus size={18} />
                  <span>{t.add_node}</span>
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Map Container */}
        <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 bg-[#0a0510]">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute top-6 left-6 z-[1000] glass-panel-dark p-3 rounded-2xl text-sacred-gold hover:text-white transition-all"
            >
              <Compass size={24} className="animate-energy" />
            </button>
          )}

          <LeafletEsoterica
            places={filteredPlaces}
            selectedPlace={selectedPlace}
            setSelectedPlace={setSelectedPlace}
            isAddingPlace={isAddingPlace}
            newPlacePos={newPlacePos}
            setNewPlacePos={setNewPlacePos}
            theme={theme}
            lang={lang}
            mapCenter={mapCenter}
            setMapCenter={setMapCenter}
          />

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-4 z-[1000] max-w-[95%] w-max">
            <div className="h-11 sm:h-12 flex glass-panel-dark rounded-full px-1.5 sm:px-2 items-center text-center">
              <button 
                onClick={() => setSettings(s => ({ ...s, showPublic: !s.showPublic }))}
                className={`px-3 sm:px-6 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold transition-all ${settings.showPublic ? 'text-sacred-gold' : 'text-white/40'}`}
              >
                {t.ancient_points}
              </button>
              <div className="w-[1px] h-4 bg-white/10"></div>
              <button className="px-3 sm:px-6 text-[8px] sm:text-[10px] uppercase tracking-widest text-white/40 cursor-not-allowed truncate hidden xs:block">{t.ley_resonance}</button>
              <div className="w-[1px] h-4 bg-white/10 hidden xs:block"></div>
              <button 
                onClick={() => setSettings(s => ({ ...s, showPrivate: !s.showPrivate }))}
                className={`px-3 sm:px-6 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold transition-all ${settings.showPrivate ? 'text-sacred-energy' : 'text-white/40'}`}
              >
                {t.personal_nodes}
              </button>
            </div>
          </div>
        </div>

          {/* Overlays */}
          <AnimatePresence>
            {isAddingPlace && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 100 }}
                className="absolute inset-x-0 bottom-12 flex justify-center z-50 pointer-events-none"
              >
                <div className="bg-[#0f0a1f]/95 backdrop-blur-3xl p-8 rounded-3xl border-2 border-sacred-gold w-full max-w-xl shadow-[0_0_100px_rgba(217,119,6,0.2)] pointer-events-auto mx-6">
                  {!newPlacePos ? (
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl border border-sacred-gold/30 flex items-center justify-center shrink-0 bg-sacred-gold/10">
                        <MapPin className="text-sacred-gold animate-bounce" size={28} />
                      </div>
                      <div>
                        <p className="font-serif italic text-2xl text-sacred-gold">{t.where_is_power}</p>
                        <p className="text-xs uppercase tracking-widest text-white/40 mt-1">{t.click_map}</p>
                      </div>
                      <button onClick={() => setIsAddingPlace(false)} className="ml-auto p-2 rounded-full hover:bg-white/10 transition-colors text-white/20 hover:text-white">
                        <X size={24} />
                      </button>
                    </div>
                  ) : (
                    <PlaceForm 
                      lang={lang}
                      position={newPlacePos} 
                      onCancel={() => { setNewPlacePos(null); setIsAddingPlace(false); }} 
                      onSubmit={createPlace} 
                    />
                  )}
                </div>
              </motion.div>
            )}

            {selectedPlace && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="absolute right-4 md:right-6 top-4 md:top-6 bottom-4 md:bottom-6 w-[calc(100%-2rem)] sm:w-80 glass-panel p-0 rounded-3xl overflow-hidden z-[3000] flex flex-col"
              >
                <div className="h-44 bg-gradient-to-b from-white/10 to-transparent relative p-8 shrink-0">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-sacred-gold">{t.node_discovery}</p>
                    <button onClick={() => setSelectedPlace(null)} className="text-white/40 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>
                  <h2 className="text-3xl font-light mt-3 truncate leading-tight">{selectedPlace.name}</h2>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 italic">
                      {selectedPlace.type === 'public' ? t.public_domain : t.private_sanctuary}
                    </p>
                    {selectedPlace.comments.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-sacred-gold/10 px-2 py-0.5 rounded-full border border-sacred-gold/20">
                        <Star size={12} className="fill-sacred-gold text-sacred-gold" />
                        <span className="text-xs text-sacred-gold font-bold">
                          {(selectedPlace.comments.reduce((acc, c) => acc + c.rating, 0) / selectedPlace.comments.length).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                      <User size={10} className="text-sacred-gold" />
                      {t.created_by}: <span className="text-white/60">{selectedPlace.creator}</span>
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                      <Star size={10} className="text-sacred-gold" />
                      {t.aligned_at}: <span className="text-white/60">{new Date(selectedPlace.createdAt).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar space-y-6">
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{t.insights}</p>
                    <p className="text-sm font-sans font-light leading-relaxed text-white/80 whitespace-pre-wrap">
                      {selectedPlace.description || t.unknown_place}
                    </p>
                    {selectedPlace.tags && selectedPlace.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        {selectedPlace.tags.map((tag, i) => (
                          <span key={i} className="text-[8px] uppercase px-2 py-0.5 bg-sacred-gold/5 border border-sacred-gold/20 text-sacred-gold/60 rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-white/40">{t.energy_level}</p>
                      <p className="text-xl font-serif text-sacred-gold italic mt-1">{selectedPlace.energyLevel}%</p>
                    </div>
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5 flex flex-col justify-center">
                      <p className="text-[9px] uppercase tracking-widest text-white/40">{t.resonance}</p>
                      <div className="flex gap-1 mt-1">
                        <div className={`h-1 flex-1 rounded-full ${selectedPlace.energyLevel > 30 ? 'bg-sacred-gold/40' : 'bg-white/10'}`}></div>
                        <div className={`h-1 flex-1 rounded-full ${selectedPlace.energyLevel > 60 ? 'bg-sacred-gold/40' : 'bg-white/10'}`}></div>
                        <div className={`h-1 flex-1 rounded-full ${selectedPlace.energyLevel > 85 ? 'bg-sacred-gold/40' : 'bg-white/10'}`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest flex items-center justify-between">
                      {t.communal_resonance}
                      <span className="text-xs">{selectedPlace.comments.length}</span>
                    </p>
                    
                    <CommentForm 
                      lang={lang}
                      onAdd={(text, rating) => {
                        const newComment = {
                          id: Math.random().toString(36).substr(2, 9),
                          userId: 'current-user',
                          userName: userName,
                          text,
                          rating,
                          createdAt: Date.now()
                        };
                        const updatedPlaces = places.map(p => 
                          p.id === selectedPlace.id 
                            ? { ...p, comments: [newComment, ...p.comments] } 
                            : p
                        );
                        setPlaces(updatedPlaces);
                        savePlaces(updatedPlaces);
                        setSelectedPlace(updatedPlaces.find(p => p.id === selectedPlace.id) || null);
                      }}
                    />

                    <div className="space-y-4 pt-4">
                      {selectedPlace.comments.length === 0 && (
                        <p className="text-xs italic text-white/30 text-center py-4">{t.no_resonance}</p>
                      )}
                      {selectedPlace.comments.map(comment => (
                        <div key={comment.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-sacred-gold/20 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-sacred-gold/10 flex items-center justify-center border border-sacred-gold/20">
                                <User size={12} className="text-sacred-gold" />
                              </div>
                              <span className="text-xs font-medium text-white/80">{comment.userName}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={10} 
                                  className={i < comment.rating ? "fill-sacred-gold text-sacred-gold" : "text-white/10"} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed italic border-l border-sacred-gold/20 pl-3">"{comment.text}"</p>
                          <div className="flex justify-end mt-2">
                            <p className="text-[8px] uppercase tracking-tighter text-white/20">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-4 shrink-0 bg-gradient-to-t from-sacred-dark to-transparent">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setMapCenter({ lat: selectedPlace.lat, lng: selectedPlace.lng })}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] uppercase tracking-[0.3em] font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Navigation size={14} className="text-sacred-gold" />
                      Locate
                    </button>
                    {selectedPlace.creator !== 'System' && (
                      <button 
                        onClick={() => deletePlace(selectedPlace.id)}
                        className="w-12 h-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-500 transition-all font-bold"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={handleShare}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] uppercase tracking-[0.3em] font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={14} className="text-white/40" />
                    {t.share_insight}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Data Strip */}
        <footer className="h-12 bg-black/60 backdrop-blur-2xl flex items-center px-8 border-t border-white/10 text-[10px] uppercase tracking-[0.4em] text-white/30 shrink-0 font-mono">
          <div className="flex-1">
            <span className="text-sacred-gold">{t.gps_ref}:</span> {selectedPlace ? `${selectedPlace.lat.toFixed(4)} / ${selectedPlace.lng.toFixed(4)}` : t.standby}
          </div>
          <div className="flex-1 text-center hidden md:block">
            <span className="text-sacred-gold">{lang === 'ru' ? 'Аура' : 'Aura'}:</span> {auraStatus}
          </div>
          <div className="flex-1 text-right">
            <span className="text-sacred-gold">{t.system_integrity}:</span> {t.nominal}
          </div>
        </footer>

        <AnimatePresence>
          <div className="fixed top-24 right-8 z-[3000] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={`px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 pointer-events-auto ${
                  toast.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span className="text-[10px] uppercase tracking-widest font-bold font-sans">{toast.message}</span>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        <AlmanacOverlay isOpen={isAlmanacOpen} onClose={() => setIsAlmanacOpen(false)} lang={lang} places={places} setMapCenter={setMapCenter} setSelectedPlace={setSelectedPlace} />
        <RitualsOverlay isOpen={isRitualsOpen} onClose={() => setIsRitualsOpen(false)} lang={lang} />
        <IdentityOverlay 
          isOpen={isIdentityOpen} 
          onClose={() => setIsIdentityOpen(false)} 
          lang={lang} 
          currentName={userName}
          onSave={(name) => {
            setUserName(name);
            localStorage.setItem('esoterica_username', name);
            setIsIdentityOpen(false);
          }}
        />

        <OnboardingOverlay 
          isOpen={showOnboarding} 
          onClose={() => {
            setShowOnboarding(false);
            localStorage.setItem('esoterica_onboarding_v1', 'true');
          }} 
          lang={lang} 
        />
      </div>
  );
}

function OnboardingOverlay({ isOpen, onClose, lang }: { isOpen: boolean, onClose: () => void, lang: Language }) {
  const t = translations[lang];
  const [step, setStep] = useState(0);

  const steps = [
    { title: t.onboarding_welcome, desc: t.onboarding_desc, icon: <Sparkles size={48} className="text-sacred-gold" /> },
    { title: t.onboarding_step1_title, desc: t.onboarding_step1_desc, icon: <MapPin size={48} className="text-sacred-gold" /> },
    { title: t.onboarding_step2_title, desc: t.onboarding_step2_desc, icon: <Layers size={48} className="text-sacred-gold" /> },
    { title: t.onboarding_step3_title, desc: t.onboarding_step3_desc, icon: <Moon size={48} className="text-sacred-gold" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[4000] flex items-center justify-center p-6"
        >
          <motion.div 
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -30 }}
            className="w-full max-w-lg bg-[#0f0a1f] border border-white/10 rounded-[3rem] p-12 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
              <motion.div 
                className="h-full bg-sacred-gold"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>

            <div className="mb-8 flex justify-center">{steps[step].icon}</div>
            <h2 className="text-3xl font-light tracking-[0.2em] uppercase mb-4 text-white">{steps[step].title}</h2>
            <p className="text-sm font-sans font-light leading-relaxed text-white/60 mb-10 max-w-md mx-auto italic">
              {steps[step].desc}
            </p>

            <button 
              onClick={() => {
                if (step < steps.length - 1) setStep(step + 1);
                else onClose();
              }}
              className="px-10 py-4 bg-sacred-gold hover:bg-sacred-gold/90 text-sacred-dark rounded-full font-bold text-[10px] uppercase tracking-widest transition-all shadow-2xl shadow-sacred-gold/20"
            >
              {step < steps.length - 1 ? (lang === 'ru' ? 'Продолжить' : 'Continue') : t.onboarding_begin}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IdentityOverlay({ isOpen, onClose, lang, currentName, onSave }: { 
  isOpen: boolean, 
  onClose: () => void, 
  lang: Language,
  currentName: string,
  onSave: (name: string) => void
}) {
  const t = translations[lang];
  const [name, setName] = useState(currentName);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-[#0a0a1a] border border-sacred-gold/30 rounded-3xl p-10 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
             <div className="absolute top-0 right-0 p-6">
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
             </div>

             <div className="space-y-6">
                <div className="text-center">
                   <div className="w-16 h-16 rounded-full bg-sacred-gold/10 border border-sacred-gold/20 flex items-center justify-center text-sacred-gold mx-auto mb-4">
                      <User size={32} />
                   </div>
                   <h2 className="text-2xl font-light tracking-widest uppercase mb-2">{t.enter_name}</h2>
                </div>

                <div className="space-y-4">
                   <input 
                      type="text"
                      className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sacred-gold transition-all text-white text-center font-mono"
                      placeholder={t.placeholder_name}
                      value={name}
                      onChange={e => setName(e.target.value)}
                   />
                   <button 
                      onClick={() => onSave(name)}
                      className="w-full py-4 bg-sacred-gold hover:bg-sacred-gold/90 text-sacred-dark rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-sacred-gold/20"
                   >
                      {t.save_identity}
                   </button>
                </div>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RitualsOverlay({ isOpen, onClose, lang }: { isOpen: boolean, onClose: () => void, lang: Language }) {
  const t = translations[lang];
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-[#0a0a1a] border border-sacred-energy/30 rounded-3xl p-10 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
             <div className="absolute top-0 right-0 p-6">
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
             </div>

             <div className="space-y-6">
                <div className="text-center">
                   <Moon className="mx-auto text-sacred-energy mb-4" size={48} />
                   <h2 className="text-3xl font-light tracking-widest uppercase mb-2">{t.ritual_title}</h2>
                   <p className="text-xs text-white/40 uppercase tracking-[0.2em]">{t.ritual_desc}</p>
                </div>

                <div className="space-y-3">
                   {[t.ritual_meditation, t.ritual_grounding, t.ritual_attunement].map((ritual, idx) => (
                      <button 
                        key={idx}
                        onClick={() => alert(t.performed)}
                        className="w-full p-4 bg-white/5 border border-white/5 hover:border-sacred-energy/50 rounded-2xl flex items-center justify-between group transition-all"
                      >
                         <span className="text-sm font-medium group-hover:text-sacred-energy">{ritual}</span>
                         <Plus size={16} className="text-white/20 group-hover:text-sacred-energy" />
                      </button>
                   ))}
                </div>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AlmanacOverlay({ 
  isOpen, 
  onClose, 
  lang, 
  places, 
  setMapCenter, 
  setSelectedPlace 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  lang: Language,
  places: Place[],
  setMapCenter: (pos: {lat: number, lng: number}) => void,
  setSelectedPlace: (place: Place) => void
}) {
  const t = translations[lang];
  
  const currentInsight = useMemo(() => {
    const insightsRu = [
      "Текущая астральная конфигурация благоприятствует открытию скрытых источников и тихих лесов. Поток энергии сосредоточен в северных квадрантах.",
      "Меркурий в зените очищает ментальные каналы. Время для обновления защитных барьеров ваших личных узлов.",
      "Великое выравнивание близко. Подземные реки эфира сегодня особенно шумны в горных районах.",
      "Лунный резонанс достигает пика. Старые камни помнят больше, чем обычно. Ищите ответы в тишине."
    ];
    const insightsEn = [
      "The current astral configuration favors the discovery of hidden springs and silent forests. Energy flow is concentrated in the northern quadrants.",
      "Mercury at its zenith purifies mental channels. Time to refresh the protective barriers of your personal nodes.",
      "A great alignment is near. Underground rivers of ether are particularly restless in mountainous regions today.",
      "Lunar resonance is peaking. Ancient stones remember more than usual. Seek answers in the silence."
    ];
    const pool = lang === 'ru' ? insightsRu : insightsEn;
    const day = new Date().getDate();
    return pool[day % pool.length];
  }, [lang]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-2xl bg-[#0f0a1f] border border-sacred-gold/30 rounded-3xl p-10 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
             <div className="absolute top-0 right-0 p-6">
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">
                  <X size={24} />
                </button>
             </div>
             
             <div className="space-y-8">
                <div>
                   <h2 className="text-4xl font-light tracking-widest uppercase mb-2">{t.almanac_title}</h2>
                   <p className="text-sacred-gold/60 italic font-serif">{t.almanac_desc}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{t.planetary_alignment}</p>
                      <div className="space-y-2">
                         <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-xs uppercase tracking-widest">{t.mercury}</span>
                            <span className="text-[10px] text-sacred-gold font-bold">Dignified</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-xs uppercase tracking-widest">{t.venus}</span>
                            <span className="text-[10px] text-white/20">Detriment</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-xs uppercase tracking-widest">{t.mars}</span>
                            <span className="text-[10px] text-sacred-energy font-bold italic">Exalted</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-xs uppercase tracking-widest">{t.jupiter}</span>
                            <span className="text-[10px] text-white/20">Neutral</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Etheric Current</p>
                      <div className="p-6 bg-sacred-gold/5 border border-sacred-gold/20 rounded-2xl h-full flex flex-col items-center justify-center text-center">
                         <Compass className="text-sacred-gold mb-4" size={48} />
                         <p className="text-xs uppercase tracking-widest text-sacred-gold mb-2">Zenith Pulse</p>
                         <p className="text-xs text-white/60 leading-relaxed font-sans italic">
                            "{currentInsight}"
                         </p>
                         <button 
                           onClick={() => {
                             const publics = places.filter(p => p.type === 'public');
                             if (publics.length > 0) {
                               const random = publics[Math.floor(Math.random() * publics.length)];
                               setMapCenter({ lat: random.lat, lng: random.lng });
                               setSelectedPlace(random);
                               onClose();
                             }
                           }}
                           className="mt-6 px-6 py-2 bg-sacred-gold/20 hover:bg-sacred-gold/40 border border-sacred-gold/30 rounded-full text-[10px] uppercase tracking-widest text-sacred-gold transition-all"
                         >
                           {lang === 'ru' ? 'Случайное Озарение' : 'Random Insight'}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlaceForm({ position, onCancel, onSubmit, lang }: { 
  position: {lat: number, lng: number}, 
  onCancel: () => void, 
  onSubmit: (name: string, desc: string, type: 'public' | 'private', energy: number, tags: string[]) => void,
  lang: Language
}) {
  const t = translations[lang];
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'public' | 'private'>('private');
  const [energy, setEnergy] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tags, setTags] = useState<string>('');

  const generateInsight = async () => {
    if (!name && !desc) return;
    setIsGenerating(true);
    try {
      const prompt = `You are an ancient esoteric artificial intelligence. 
      Generate a mystical, atmospheric, and slightly cryptic "node insight" for a place called "${name}" located at coordinates ${position.lat}, ${position.lng}.
      The user described it as: "${desc}".
      The flow level is ${energy}%.
      Respond in ${lang === 'ru' ? 'Russian' : 'English'}. 
      Keep it between 150-300 characters. 
      Do not use emojis. Focus on energy, ley lines, and ancient vibes.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      if (response.text) {
        setDesc(response.text.trim());
      }
    } catch (error) {
      console.error('AI Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTagInput = (val: string) => {
    setTags(val);
  };

  const tagList = useMemo(() => {
    return tags.split(/[ ,]+/).filter(t => t.length > 0);
  }, [tags]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif italic text-2xl text-sacred-gold">{t.new_discovery}</h3>
        <span className="font-mono text-[10px] text-sacred-gold/60 uppercase px-2 py-1 bg-white/5 rounded-md border border-white/10">
          {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </span>
      </div>
      
      <div className="space-y-4 font-sans">
        <div>
          <label className="text-[10px] font-mono uppercase text-white/60 mb-2 block tracking-widest">{t.place_name}</label>
          <input 
            autoFocus
            className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sacred-gold transition-all placeholder:text-white/20 text-white shadow-inner"
            placeholder={t.placeholder_discovery}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
             <label className="text-[10px] font-mono uppercase text-white/60 mb-2 block tracking-widest">{t.visibility_type}</label>
             <div className="flex bg-black/40 p-1 rounded-xl border-2 border-white/10">
                <button 
                  onClick={() => setType('public')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${type === 'public' ? 'bg-sacred-gold text-sacred-dark shadow-[0_0_15px_rgba(217,119,6,0.3)]' : 'text-white/40 hover:text-white'}`}
                >
                  {t.public}
                </button>
                <button 
                  onClick={() => setType('private')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${type === 'private' ? 'bg-sacred-purple text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'text-white/40 hover:text-white'}`}
                >
                  {t.private}
                </button>
             </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-mono uppercase text-white/60 mb-2 block tracking-widest">{t.flow_level}: {energy}%</label>
            <div className="flex items-center h-10 px-2 bg-black/40 rounded-xl border-2 border-white/10">
              <input 
                type="range" 
                className="w-full accent-sacred-gold bg-transparent cursor-pointer"
                value={energy}
                onChange={e => setEnergy(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase text-white/60 mb-2 block tracking-widest">{t.tags_hint}</label>
          <input 
            className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sacred-gold transition-all placeholder:text-white/20 text-white shadow-inner"
            placeholder="forest, water, ancient..."
            value={tags}
            onChange={e => handleTagInput(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-mono uppercase text-white/60 block tracking-widest">{t.notes_meditation}</label>
            <button 
              onClick={generateInsight}
              disabled={isGenerating || (!name && !desc)}
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-tighter text-sacred-gold hover:text-white transition-colors disabled:opacity-30"
            >
              <Sparkles size={12} className={isGenerating ? "animate-spin" : ""} />
              {isGenerating ? t.generating_insight : t.get_ai_insight}
            </button>
          </div>
          <textarea 
            rows={3}
            className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sacred-gold transition-all placeholder:text-white/20 resize-none font-sans text-white shadow-inner"
            placeholder={t.placeholder_desc}
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          {desc && (
            <p className="mt-2 text-[8px] uppercase tracking-widest text-sacred-gold/40 flex items-center gap-1">
               <Info size={10} /> {t.ai_insight_label}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-2">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 border-2 border-white/10 hover:bg-white/5 text-white/40 rounded-2xl text-[10px] uppercase tracking-widest font-bold transition-all"
        >
          {t.cancel}
        </button>
        <button 
          disabled={!name}
          onClick={() => onSubmit(name, desc, type, energy, tagList)}
          className="flex-[2] py-3 bg-sacred-gold hover:bg-sacred-gold/80 disabled:opacity-50 disabled:grayscale text-sacred-dark rounded-2xl text-[10px] uppercase tracking-widest font-extrabold transition-all shadow-2xl shadow-sacred-gold/40 border-2 border-sacred-gold/10"
        >
          {t.confirm_open}
        </button>
      </div>
    </div>
  );
}

function CommentForm({ onAdd, lang }: { onAdd: (text: string, rating: number) => void, lang: Language }) {
  const t = translations[lang];
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd(text, rating);
    setText('');
    setRating(5);
    setIsExpanded(false);
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 transition-all">
      {!isExpanded ? (
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-full text-left text-xs text-white/30 flex items-center gap-2 hover:text-white/50 transition-colors"
        >
          <Plus size={14} />
          {t.leave_impression}
        </button>
      ) : (
        <div className="space-y-4 font-sans">
          <div className="flex items-center gap-2 justify-center">
            {[1, 2, 3, 4, 5].map(star => (
              <button 
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-125"
              >
                <Star 
                  size={18} 
                  className={star <= rating ? "fill-sacred-gold text-sacred-gold" : "text-white/10 hover:text-white/20"} 
                />
              </button>
            ))}
          </div>
          <textarea 
            autoFocus
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sacred-gold transition-colors placeholder:text-white/20 resize-none font-sans"
            placeholder={t.placeholder_comment}
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex gap-2">
            <button 
              onClick={() => setIsExpanded(false)}
              className="flex-1 py-2 text-[8px] uppercase tracking-widest text-white/20 hover:text-white transition-colors"
            >
              {t.cancel}
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex-[2] py-2 bg-sacred-gold text-sacred-dark rounded-lg text-[8px] uppercase tracking-widest font-bold disabled:opacity-50"
            >
              {t.pin_comment}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
