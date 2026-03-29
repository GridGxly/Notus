'use client';

import Image from 'next/image';
import { useState } from 'react';
import AgentRow from './AgentRow';
import ActivityFeed from './ActivityFeed';
import type { AgentName, NotusState } from '../lib/types';

interface SidebarProps {
  agents: NotusState['agents'];
  feedItems: NotusState['feedItems'];
  onDeploy: (zip: string) => void;
  onLocate?: () => void;
  onFollowUp?: (message: string) => void;
  showFollowUp?: boolean;
}

export default function Sidebar({
  agents,
  feedItems,
  onDeploy,
  onLocate,
  onFollowUp,
  showFollowUp,
}: SidebarProps) {
  const [zipCode, setZipCode] = useState('');
  const [followUpText, setFollowUpText] = useState('');

  const handleGo = () => {
    const zip = zipCode.trim();
    if (/^\d{5}$/.test(zip)) onDeploy(zip);
  };

  const handleFollowUp = () => {
    if (followUpText.trim() && onFollowUp) {
      onFollowUp(followUpText.trim());
      setFollowUpText('');
    }
  };

  const anyActive = (Object.keys(agents) as AgentName[]).some(
    (name) => agents[name].status === 'active',
  );
  const isValidZip = /^\d{5}$/.test(zipCode.trim());

  return (
    <aside
      className="w-full h-full flex flex-col overflow-hidden md:rounded-2xl"
      style={{
        background: 'rgba(10, 10, 18, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="shrink-0 p-5 pb-4">
        <div className="flex items-center">
          <Image
            src="/notus-logo-512px.png"
            alt="NOTUS Logo"
            width={28}
            height={28}
            className="rounded-md mr-2.5 min-w-[28px]"
          />
          <div>
            <div className="font-bold text-[15px] leading-none text-white/90">
              NOTUS
            </div>
            <div className="text-[9px] text-white/25 tracking-[1.5px] mt-0.5">
              HURRICANE INTEL
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 mt-4">
          <input
            type="text"
            placeholder="Enter ZIP..."
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            className="flex-1 px-2.5 py-2 rounded-lg text-[13px] font-mono outline-none text-white/90 placeholder:text-white/20"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          />
          <button
            onClick={handleGo}
            disabled={anyActive || !isValidZip}
            className={`px-3.5 py-2 rounded-lg font-bold text-[12px] whitespace-nowrap transition-all active:scale-95 ${
              anyActive || !isValidZip
                ? 'bg-[#ff6b35]/30 text-white/30 cursor-not-allowed'
                : 'bg-[#ff6b35] text-[#0a0a12]'
            }`}
          >
            {anyActive ? 'SCANNING...' : 'GO'}
          </button>
        </div>

        {onLocate && (
          <>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] text-white/20 font-medium">or</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <button
              onClick={onLocate}
              disabled={anyActive}
              className={`w-full mt-2 py-2 rounded-lg font-bold text-[12px] transition-all active:scale-95 flex items-center justify-center gap-2 ${
                anyActive
                  ? 'text-white/30 cursor-not-allowed'
                  : 'text-[#ff6b35] hover:brightness-125'
              }`}
              style={{
                background: anyActive
                  ? 'rgba(255, 107, 53, 0.05)'
                  : 'rgba(255, 107, 53, 0.08)',
                border: '1px solid rgba(255, 107, 53, 0.15)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
              </svg>
              LOCATE ME
            </button>
          </>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div
        className="px-4 py-3"
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div className="text-[9px] text-white/25 tracking-[1.2px] font-semibold mb-2">
          AGENTS
        </div>
        <AgentRow
          name="recon"
          status={agents.recon.status}
          thinkingMessage={agents.recon.thinkingMessage}
        />
        <AgentRow
          name="supply"
          status={agents.supply.status}
          thinkingMessage={agents.supply.thinkingMessage}
        />
        <AgentRow
          name="shelter"
          status={agents.shelter.status}
          thinkingMessage={agents.shelter.thinkingMessage}
        />
        <AgentRow
          name="dispatch"
          status={agents.dispatch.status}
          thinkingMessage={agents.dispatch.thinkingMessage}
        />
      </div>

      <div className="px-4 pt-3 pb-4">
        <ActivityFeed items={feedItems} />
      </div>
      </div>

      {showFollowUp && !anyActive && (
        <div
          className="px-4 py-3"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Ask a follow-up..."
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] outline-none text-white/90 placeholder:text-white/20"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            />
            <button
              onClick={handleFollowUp}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors hover:brightness-125"
              style={{
                background: 'rgba(255, 107, 53, 0.1)',
                color: '#ff6b35',
              }}
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
