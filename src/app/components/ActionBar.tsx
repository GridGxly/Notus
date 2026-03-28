'use client';

import { useState, useRef, useEffect } from 'react';
import type { ActionPlan } from '../lib/types';

interface ActionBarProps {
  visible?: boolean;
  actionPlan?: ActionPlan | null;
  zip?: string;
}

const AlertTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
const Fuel = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>
);
const Home = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const MapRoute = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 4.34-4.34a6 6 0 0 1 8.32 0L20 9"/><path d="m3 20 4.34-4.34a6 6 0 0 1 8.32 0L20 20"/><path d="m9 5 1.76 1.76a3 3 0 0 1 0 4.24l-3.52 3.52a3 3 0 0 0 0 4.24L9 20"/></svg>
);

function buildBriefingText(actionPlan: ActionPlan, zip: string): string {
  return (
    `Hey, this is your Notus briefing for the area around zip code ${zip}. ` +
    `Here's what the team just put together for you. ` +
    `We're looking at a threat level of ${actionPlan.threat.level} right now. ` +
    `${actionPlan.threat.detail} ` +
    `For fuel, your best option is ${actionPlan.fuel.name}${actionPlan.fuel.distance !== '--' ? `, about ${actionPlan.fuel.distance} away` : ''}. ` +
    `If you need shelter, head to ${actionPlan.shelter.name}${actionPlan.shelter.distance !== '--' ? `, roughly ${actionPlan.shelter.distance} from your location` : ''}. ` +
    `The team's recommendation? ${actionPlan.directive.primary}. ` +
    `And as a backup plan, ${actionPlan.directive.secondary}. ` +
    `Stay safe out there. Notus is watching.`
  );
}

function ClosedCaptions({ text, isPlaying }: { text: string; isPlaying: boolean }) {
  const [visibleText, setVisibleText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!isPlaying) {
      indexRef.current = 0;
      return;
    }

    indexRef.current = 0;
    const words = text.split(' ');
    const msPerWord = Math.max(200, (text.length / words.length) * 25);

    intervalRef.current = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= words.length) {
        setVisibleText(text);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      const start = Math.max(0, indexRef.current - 11);
      setVisibleText(words.slice(start, indexRef.current + 1).join(' '));
    }, msPerWord);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, text]);

  if (!isPlaying || !visibleText) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex justify-center pb-4 px-8">
        <div className="bg-black/85 backdrop-blur-sm rounded-lg px-5 py-2.5 max-w-[700px]">
          <p className="text-white text-[13px] leading-relaxed text-center font-medium">
            {visibleText}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ActionBar({ visible = false, actionPlan = null, zip = '' }: ActionBarProps) {
  const [voiceState, setVoiceState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!visible) return null;

  const briefingText = actionPlan ? buildBriefingText(actionPlan, zip) : '';

  const handleVoice = async () => {
    if (voiceState === 'playing') {
      audioRef.current?.pause();
      audioRef.current = null;
      setVoiceState('idle');
      return;
    }

    if (!actionPlan) return;
    setVoiceState('loading');

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionPlan, zip }),
      });

      if (!res.ok) {
        setVoiceState('idle');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setVoiceState('idle');
        audioRef.current = null;
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setVoiceState('idle');
        audioRef.current = null;
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setVoiceState('playing');
    } catch {
      setVoiceState('idle');
    }
  };

  return (
    <div
      className="shrink-0 bg-black/60 backdrop-blur-3xl border-t border-white/5 py-4 px-4 md:py-6 md:px-8 relative overflow-hidden"
      style={{ animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#ff6b35]/5 to-transparent pointer-events-none" />

      <ClosedCaptions text={briefingText} isPlaying={voiceState === 'playing'} />

      <div className="max-w-[1400px] mx-auto relative z-10">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-[2px] text-white/50 mb-0.5">Notus Protocol</div>
              <h2 className="text-sm font-semibold text-white/90">Action Plan Prepared</h2>
            </div>
          </div>
          <button
            onClick={handleVoice}
            disabled={voiceState === 'loading'}
            className={`
              flex items-center gap-2 px-5 py-2 md:px-6 md:py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all shadow-lg border w-full sm:w-auto justify-center
              ${voiceState === 'playing'
                ? 'bg-[#ff6b35]/10 border-[#ff6b35]/30 text-[#ff6b35] shadow-[0_0_20px_rgba(255,107,53,0.2)]'
                : voiceState === 'loading'
                  ? 'bg-white/5 border-white/5 text-white/40'
                  : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 hover:text-white'
              }
            `}
          >
            {voiceState === 'playing' ? (
              <>
                <div className="flex items-end gap-[3px] h-3.5 mr-1">
                  <div className="w-[3px] bg-[#ff6b35] rounded-full animate-voice-bar1" />
                  <div className="w-[3px] bg-[#ff6b35] rounded-full animate-voice-bar2" />
                  <div className="w-[3px] bg-[#ff6b35] rounded-full animate-voice-bar3" />
                  <div className="w-[3px] bg-[#ff6b35] rounded-full animate-voice-bar4" />
                </div>
                PLAYING BRIEFING
              </>
            ) : voiceState === 'loading' ? (
              <>
                <svg className="w-4 h-4 animate-spin -ml-1 mr-1" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                LOADING VOICE...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                LISTEN TO BRIEFING
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-[#11131a] border border-[#ef4444]/20 rounded-xl p-4 flex flex-col shadow-[inset_0_2px_15px_rgba(239,68,68,0.03)] hover:border-[#ef4444]/40 transition-colors">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-1.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444]">
                <AlertTriangle />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase">Threat Level</span>
            </div>
            <div className="text-lg font-bold text-white mb-1.5">
              {actionPlan?.threat?.level || 'Assessing...'}
            </div>
            <div className="text-[11px] leading-relaxed text-white/60">
              {actionPlan?.threat?.detail || 'No immediate data available for this location.'}
            </div>
          </div>

          <div className="bg-[#11131a] border border-[#f59e0b]/20 rounded-xl p-4 flex flex-col shadow-[inset_0_2px_15px_rgba(245,158,11,0.03)] hover:border-[#f59e0b]/40 transition-colors">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-1.5 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b]">
                <Fuel />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase">Nearest Fuel</span>
            </div>
            <div className="text-sm font-semibold text-white mb-2 leading-tight">
              {actionPlan?.fuel?.name || 'Searching...'}
            </div>
            <div className="mt-auto flex items-center gap-2">
              <span className={`px-2 py-[2px] rounded text-[9px] font-bold tracking-wider ${actionPlan?.fuel?.status?.includes('OPEN') || actionPlan?.fuel?.status?.includes('LOCATED') ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-white/5 text-white/40'}`}>
                {actionPlan?.fuel?.status?.toUpperCase() || '--'}
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                {actionPlan?.fuel?.distance === '--' ? '' : actionPlan?.fuel?.distance}
              </span>
            </div>
          </div>

          <div className="bg-[#11131a] border border-[#8b5cf6]/20 rounded-xl p-4 flex flex-col shadow-[inset_0_2px_15px_rgba(139,92,246,0.03)] hover:border-[#8b5cf6]/40 transition-colors">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-1.5 rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6]">
                <Home />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase">Secure Shelter</span>
            </div>
            <div className="text-sm font-semibold text-white mb-2 leading-tight">
              {actionPlan?.shelter?.name || 'Searching...'}
            </div>
            <div className="mt-auto flex items-center gap-2">
              <span className={`px-2 py-[2px] rounded text-[9px] font-bold tracking-wider ${actionPlan?.shelter?.status?.includes('LOCATED') || actionPlan?.shelter?.status?.includes('OK') ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-white/5 text-white/40'}`}>
                {actionPlan?.shelter?.status?.toUpperCase() || '--'}
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                {actionPlan?.shelter?.distance === '--' ? '' : actionPlan?.shelter?.distance}
              </span>
            </div>
          </div>

          <div className="bg-[#11131a] border border-[#3b82f6]/20 rounded-xl p-4 flex flex-col shadow-[inset_0_2px_15px_rgba(59,130,246,0.03)] hover:border-[#3b82f6]/40 transition-colors">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-1.5 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6]">
                <MapRoute />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase">Directive</span>
            </div>
            <div className="text-sm font-semibold text-white mb-1.5 leading-tight">
              {actionPlan?.directive?.primary || 'Awaiting orders...'}
            </div>
            <div className="text-[11px] text-white/50 leading-relaxed mt-auto border-t border-white/5 pt-2">
              {actionPlan?.directive?.secondary || '--'}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
