'use client';

import { useState } from 'react';
import type { ActionPlan } from '../lib/types';

interface ActionBarProps {
  visible?: boolean;
  actionPlan?: ActionPlan | null;
  mobileMapActive?: boolean;
}

const Shield = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const FuelPump = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" x2="15" y1="22" y2="22" />
    <line x1="4" x2="14" y1="9" y2="9" />
    <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
    <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
  </svg>
);
const Building = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" />
    <path d="M12 10h.01" /><path d="M16 10h.01" /><path d="M8 10h.01" />
    <path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 14h.01" />
  </svg>
);
const Compass = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

function getThreatStyle(level: string) {
  const num = parseInt(level) || 1;
  if (num >= 5) return { color: '#ef4444', label: 'CRITICAL' };
  if (num >= 4) return { color: '#ef4444', label: 'HIGH' };
  if (num >= 3) return { color: '#f97316', label: 'MODERATE' };
  if (num >= 2) return { color: '#eab308', label: 'ADVISORY' };
  return { color: '#22c55e', label: 'CLEAR' };
}

function StatusDot({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const isGood = /OPEN|LOCATED|AVAILABLE|OK/.test(s);
  const isBad = /CLOSED|UNAVAILABLE|ERROR/.test(s);
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-[5px] h-[5px] rounded-full shrink-0 ${
          isGood
            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
            : isBad
              ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'
              : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)] animate-pulse'
        }`}
      />
      <span
        className={`text-[9px] font-semibold tracking-wider ${
          isGood ? 'text-emerald-400' : isBad ? 'text-red-400' : 'text-amber-400'
        }`}
      >
        {s || '--'}
      </span>
    </div>
  );
}

function Card({
  accentColor,
  pulse,
  id,
  expanded,
  onToggle,
  expandedContent,
  children,
}: {
  accentColor: string;
  pulse?: boolean;
  id: string;
  expanded: string | null;
  onToggle: (id: string) => void;
  expandedContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isOpen = expanded === id;
  return (
    <div
      className={`rounded-xl p-4 flex flex-col relative overflow-hidden cursor-pointer transition-all duration-200 ${pulse ? 'animate-red-pulse' : ''}`}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderTopColor: accentColor,
        borderTopWidth: '2px',
      }}
      onMouseEnter={() => onToggle(id)}
      onMouseLeave={() => onToggle(id)}
    >
      {children}
      {isOpen && expandedContent && (
        <div className="mt-2 pt-2 text-[12px] text-white/50 leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {expandedContent}
        </div>
      )}
    </div>
  );
}

export default function ActionBar({ visible = false, actionPlan = null, mobileMapActive = false }: ActionBarProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!visible) return null;

  const threatNum = parseInt(actionPlan?.threat?.level || '1') || 1;
  const threat = getThreatStyle(actionPlan?.threat?.level || '1/5');

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div
      className={`fixed bottom-8 right-0 z-30 justify-center pointer-events-none px-4 ${mobileMapActive ? 'flex' : 'hidden lg:flex'}`}
      style={{ left: mobileMapActive ? 0 : 348 }}
    >
      <div
        className="pointer-events-auto w-full max-w-[600px] rounded-2xl p-3"
        style={{
          animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          background: 'rgba(10, 10, 18, 0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card
            id="threat"
            accentColor="#ef4444"
            pulse={threatNum >= 3}
            expanded={expanded}
            onToggle={toggle}
            expandedContent={actionPlan?.threat?.detail}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield color="#ef4444" />
              <span className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">Threat</span>
            </div>
            <div className="text-[16px] font-semibold text-white/90 mb-1">
              {actionPlan?.threat?.level || '--'}{' '}
              <span className="text-[12px] font-semibold" style={{ color: threat.color }}>
                {threat.label}
              </span>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed line-clamp-2">
              {actionPlan?.threat?.detail || 'Awaiting assessment.'}
            </p>
          </Card>

          <Card
            id="fuel"
            accentColor="#f59e0b"
            expanded={expanded}
            onToggle={toggle}
            expandedContent={
              actionPlan?.fuel ? (
                <>
                  <div className="font-semibold text-white/70 mb-1">{actionPlan.fuel.name}</div>
                  {actionPlan.fuel.distance !== '--' && <div>Distance: {actionPlan.fuel.distance}</div>}
                  <div>Status: {actionPlan.fuel.status || 'Unknown'}</div>
                </>
              ) : undefined
            }
          >
            <div className="flex items-center gap-2 mb-3">
              <FuelPump color="#f59e0b" />
              <span className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">Fuel</span>
            </div>
            <div className="text-[16px] font-semibold text-white/90 mb-1 leading-snug">
              {actionPlan?.fuel?.name || 'Searching...'}
            </div>
            <div className="mt-auto flex items-center justify-between">
              <StatusDot status={actionPlan?.fuel?.status || ''} />
              {actionPlan?.fuel?.distance && actionPlan.fuel.distance !== '--' && (
                <span className="text-[11px] text-white/25 font-mono">
                  {actionPlan.fuel.distance}
                </span>
              )}
            </div>
          </Card>

          <Card
            id="shelter"
            accentColor="#8b5cf6"
            expanded={expanded}
            onToggle={toggle}
            expandedContent={
              actionPlan?.shelter ? (
                <>
                  <div className="font-semibold text-white/70 mb-1">{actionPlan.shelter.name}</div>
                  {actionPlan.shelter.distance !== '--' && <div>Distance: {actionPlan.shelter.distance}</div>}
                  <div>Status: {actionPlan.shelter.status || 'Unknown'}</div>
                </>
              ) : undefined
            }
          >
            <div className="flex items-center gap-2 mb-3">
              <Building color="#8b5cf6" />
              <span className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">Shelter</span>
            </div>
            <div className="text-[16px] font-semibold text-white/90 mb-1 leading-snug">
              {actionPlan?.shelter?.name || 'Searching...'}
            </div>
            <div className="mt-auto flex items-center justify-between">
              <StatusDot status={actionPlan?.shelter?.status || ''} />
              {actionPlan?.shelter?.distance && actionPlan.shelter.distance !== '--' && (
                <span className="text-[11px] text-white/25 font-mono">
                  {actionPlan.shelter.distance}
                </span>
              )}
            </div>
          </Card>

          <Card
            id="directive"
            accentColor="#22c55e"
            expanded={expanded}
            onToggle={toggle}
            expandedContent={actionPlan?.directive?.secondary}
          >
            <div className="flex items-center gap-2 mb-3">
              <Compass color="#22c55e" />
              <span className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">Directive</span>
            </div>
            <div className="text-[16px] font-semibold text-white/90 mb-1 leading-snug">
              {actionPlan?.directive?.primary || 'Awaiting directive...'}
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed">
              {actionPlan?.directive?.secondary || '--'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
