'use client';

import type { ActionPlan } from '../lib/types';

interface ActionBarProps {
  visible?: boolean;
  actionPlan?: ActionPlan | null;
}

const AlertTriangle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
const Fuel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>
);
const Home = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const MapRoute = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 4.34-4.34a6 6 0 0 1 8.32 0L20 9"/><path d="m3 20 4.34-4.34a6 6 0 0 1 8.32 0L20 20"/><path d="m9 5 1.76 1.76a3 3 0 0 1 0 4.24l-3.52 3.52a3 3 0 0 0 0 4.24L9 20"/></svg>
);

function getThreatStyle(level: string) {
  const num = parseInt(level) || 1;
  if (num >= 5) return { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', label: 'CRITICAL' };
  if (num >= 4) return { color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)', label: 'HIGH' };
  if (num >= 3) return { color: '#f97316', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.25)', label: 'MODERATE' };
  if (num >= 2) return { color: '#eab308', bg: 'rgba(234,179,8,0.07)', border: 'rgba(234,179,8,0.25)', label: 'ADVISORY' };
  return { color: '#22c55e', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.20)', label: 'CLEAR' };
}

function StatusDot({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const isGood = /OPEN|LOCATED|AVAILABLE|OK/.test(s);
  const isBad = /CLOSED|UNAVAILABLE|ERROR/.test(s);
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-[5px] h-[5px] rounded-full shrink-0 ${
          isGood ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
          : isBad ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'
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

export default function ActionBar({ visible = false, actionPlan = null }: ActionBarProps) {
  if (!visible) return null;

  const threat = getThreatStyle(actionPlan?.threat?.level || '1/5');

  return (
    <div
      className="shrink-0 border-t border-white/[0.06] relative overflow-hidden"
      style={{
        animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(8,8,12,0.98) 100%)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff6b35]/20 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-4 py-4 md:px-8 md:py-5 relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex items-center justify-center w-9 h-9">
            <div className="absolute inset-0 rounded-full bg-[#ff6b35]/[0.07] border border-[#ff6b35]/20" />
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff6b35] relative z-10"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold tracking-[2.5px] text-white/30">Notus Protocol</div>
            <h2 className="text-[14px] font-semibold text-white/90 -mt-0.5">Action Plan Ready</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          <div
            className="rounded-xl p-4 flex flex-col relative overflow-hidden transition-colors duration-300"
            style={{
              background: threat.bg,
              border: `1px solid ${threat.border}`,
              boxShadow: `inset 0 1px 20px ${threat.bg}`,
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${threat.color}40, transparent)` }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg" style={{ background: `${threat.color}15` }}>
                <div style={{ color: threat.color }}><AlertTriangle /></div>
              </div>
              <span className="text-[9px] font-bold tracking-[1.5px] text-white/40 uppercase">Threat Level</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold tabular-nums" style={{ color: threat.color }}>
                {actionPlan?.threat?.level || '--'}
              </span>
              <span className="text-[9px] font-bold tracking-widest" style={{ color: `${threat.color}99` }}>
                {threat.label}
              </span>
            </div>
            <p className="text-[11px] leading-[1.55] text-white/50 line-clamp-3">
              {actionPlan?.threat?.detail || 'Awaiting threat assessment data.'}
            </p>
          </div>

          <div className="rounded-xl p-4 flex flex-col relative overflow-hidden bg-white/[0.02] border border-white/[0.06] transition-colors duration-300 hover:border-[#f59e0b]/20">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f59e0b]/20 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-[#f59e0b]/[0.08]">
                <div className="text-[#f59e0b]"><Fuel /></div>
              </div>
              <span className="text-[9px] font-bold tracking-[1.5px] text-white/40 uppercase">Nearest Fuel</span>
            </div>
            <div className="text-[13px] font-semibold text-white/85 mb-2 leading-snug">
              {actionPlan?.fuel?.name || 'Searching...'}
            </div>
            <div className="mt-auto flex items-center justify-between">
              <StatusDot status={actionPlan?.fuel?.status || ''} />
              {actionPlan?.fuel?.distance && actionPlan.fuel.distance !== '--' && (
                <span className="text-[10px] text-white/25 font-mono">{actionPlan.fuel.distance}</span>
              )}
            </div>
          </div>

          <div className="rounded-xl p-4 flex flex-col relative overflow-hidden bg-white/[0.02] border border-white/[0.06] transition-colors duration-300 hover:border-[#8b5cf6]/20">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b5cf6]/20 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-[#8b5cf6]/[0.08]">
                <div className="text-[#8b5cf6]"><Home /></div>
              </div>
              <span className="text-[9px] font-bold tracking-[1.5px] text-white/40 uppercase">Secure Shelter</span>
            </div>
            <div className="text-[13px] font-semibold text-white/85 mb-2 leading-snug">
              {actionPlan?.shelter?.name || 'Searching...'}
            </div>
            <div className="mt-auto flex items-center justify-between">
              <StatusDot status={actionPlan?.shelter?.status || ''} />
              {actionPlan?.shelter?.distance && actionPlan.shelter.distance !== '--' && (
                <span className="text-[10px] text-white/25 font-mono">{actionPlan.shelter.distance}</span>
              )}
            </div>
          </div>

          <div className="rounded-xl p-4 flex flex-col relative overflow-hidden border border-white/[0.06] transition-colors duration-300 hover:border-[#3b82f6]/20"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, rgba(59,130,246,0.01) 100%)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3b82f6]/20 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-[#3b82f6]/[0.08]">
                <div className="text-[#3b82f6]"><MapRoute /></div>
              </div>
              <span className="text-[9px] font-bold tracking-[1.5px] text-white/40 uppercase">Directive</span>
            </div>
            <div className="text-[13px] font-semibold text-white/85 mb-2 leading-snug">
              {actionPlan?.directive?.primary || 'Awaiting directive...'}
            </div>
            <div className="mt-auto pt-2 border-t border-white/[0.04]">
              <p className="text-[10px] text-white/35 leading-relaxed">
                {actionPlan?.directive?.secondary || '--'}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
