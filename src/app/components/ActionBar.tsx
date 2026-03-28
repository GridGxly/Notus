'use client';

import { useState, useRef } from 'react';
import type { ActionPlan } from '../lib/types';

interface ActionBarProps {
  visible?: boolean;
  actionPlan?: ActionPlan | null;
  zip?: string;
}

export default function ActionBar({ visible = false, actionPlan = null, zip = '' }: ActionBarProps) {
  const [voiceState, setVoiceState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!visible) return null;

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
      className="shrink-0 bg-[#0f0f17] border-t border-[#1a1a2e] px-5 py-3.5 w-full"
      style={{ animation: 'slideUp 0.4s ease-out forwards' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] text-[#ff6b35] tracking-[1.2px] font-semibold">
          YOUR PLAN
        </div>
        <button
          onClick={handleVoice}
          disabled={voiceState === 'loading'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${
            voiceState === 'playing'
              ? 'bg-[#ff6b35]/20 text-[#ff6b35]'
              : voiceState === 'loading'
                ? 'bg-[#ff6b35]/10 text-[#ff6b35]/50'
                : 'bg-[#ff6b35]/10 text-[#ff6b35] hover:bg-[#ff6b35]/20'
          }`}
        >
          {voiceState === 'playing' ? (
            <>
              <div className="flex items-end gap-[2px] h-3">
                <div className="w-[2px] bg-[#ff6b35] rounded-full animate-voice-bar1" />
                <div className="w-[2px] bg-[#ff6b35] rounded-full animate-voice-bar2" />
                <div className="w-[2px] bg-[#ff6b35] rounded-full animate-voice-bar3" />
                <div className="w-[2px] bg-[#ff6b35] rounded-full animate-voice-bar4" />
              </div>
              Playing...
            </>
          ) : voiceState === 'loading' ? (
            <>
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Loading...
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8h-1a2 2 0 00-2 2v4a2 2 0 002 2h1l4.5 3.5V4.5L6.5 8z" />
              </svg>
              Listen to briefing
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 font-mono text-[11px]">
        <div className="flex flex-col">
          <div className="text-[9px] font-semibold tracking-[0.5px] mb-0.5 text-[#ef4444]">
            THREAT
          </div>
          <div className="text-[#cbd5e1] mb-0.5">{actionPlan?.threat?.level || 'Checking...'}</div>
          <div className="text-[10px] text-[#475569]">{actionPlan?.threat?.detail || '--'}</div>
        </div>

        <div className="flex flex-col">
          <div className="text-[9px] font-semibold tracking-[0.5px] mb-0.5 text-[#f59e0b]">
            NEAREST FUEL
          </div>
          <div className="text-[#cbd5e1] mb-0.5">{actionPlan?.fuel?.name || 'Searching...'}</div>
          <div className="text-[10px] text-[#22c55e]">{actionPlan?.fuel?.status || '--'}</div>
        </div>

        <div className="flex flex-col">
          <div className="text-[9px] font-semibold tracking-[0.5px] mb-0.5 text-[#8b5cf6]">
            SHELTER
          </div>
          <div className="text-[#cbd5e1] mb-0.5">{actionPlan?.shelter?.name || 'Searching...'}</div>
          <div className="text-[10px] text-[#22c55e]">{actionPlan?.shelter?.status || '--'}</div>
        </div>

        <div className="flex flex-col">
          <div className="text-[9px] font-semibold tracking-[0.5px] mb-0.5 text-[#22c55e]">
            NEXT STEP
          </div>
          <div className="text-[#cbd5e1] mb-0.5">{actionPlan?.directive?.primary || 'Working on it...'}</div>
          <div className="text-[10px] text-[#475569]">{actionPlan?.directive?.secondary || '--'}</div>
        </div>
      </div>
    </div>
  );
}
