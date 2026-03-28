'use client';

import Image from 'next/image';
import { useState } from 'react';
import AgentRow from './AgentRow';
import ActivityFeed from './ActivityFeed';
import type { AgentName, NotusState } from '../lib/types';

const AGENT_COLORS: Record<AgentName, string> = {
  recon: '#3b82f6',
  supply: '#f59e0b',
  shelter: '#8b5cf6',
  dispatch: '#ff6b35',
};

interface SidebarProps {
  agents: NotusState['agents'];
  feedItems: NotusState['feedItems'];
  onDeploy: (zip: string) => void;
  onFollowUp?: (message: string) => void;
  showFollowUp?: boolean;
}

export default function Sidebar({ agents, feedItems, onDeploy, onFollowUp, showFollowUp }: SidebarProps) {
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

  const activeAgents = (Object.keys(agents) as AgentName[]).filter(
    name => agents[name].status === 'active'
  );

  const anyActive = activeAgents.length > 0;
  const isValidZip = /^\d{5}$/.test(zipCode.trim());

  return (
    <aside className="w-full md:w-[340px] md:min-w-[340px] bg-black border-r border-white/5 flex flex-col h-full text-[#e5e5e5]">
      <div className="p-5 pb-4 border-b border-white/5">
        <div className="flex flex-row items-center">
          <Image
            src="/notus-logo-512px.png"
            alt="NOTUS Logo"
            width={28}
            height={28}
            className="rounded-md mr-2.5 min-w-[28px]"
          />
          <div className="flex flex-col">
            <div className="font-bold text-[15px] leading-none text-[#e2e8f0]">NOTUS</div>
            <div className="text-[9px] text-[#475569] tracking-[1.5px] mt-0.5">HURRICANE INTEL</div>
          </div>
        </div>

        <div className="flex flex-row gap-1.5 mt-4">
          <input
            type="text"
            placeholder="Enter ZIP..."
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            className="flex-1 bg-[#14141f] border border-[#1e293b] text-[#e2e8f0] px-2.5 py-2 rounded-md text-[13px] outline-none placeholder:text-[#334155]"
          />
          <button
            onClick={handleGo}
            disabled={anyActive || !isValidZip}
            className={`px-3.5 py-2 rounded-md font-bold text-[12px] whitespace-nowrap transition-all active:scale-95 ${
              anyActive || !isValidZip
                ? 'bg-[#ff6b35]/30 text-[#0a0a0f]/50 cursor-not-allowed'
                : 'bg-[#ff6b35] text-[#0a0a0f]'
            }`}
          >
            {anyActive ? 'SCANNING...' : 'GO'}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-[#1a1a2e]">
        <div className="text-[9px] text-[#475569] tracking-[1.2px] font-semibold mb-2">AGENTS</div>
        <AgentRow name="recon" status={agents.recon.status} thinkingMessage={agents.recon.thinkingMessage} />
        <AgentRow name="supply" status={agents.supply.status} thinkingMessage={agents.supply.thinkingMessage} />
        <AgentRow name="shelter" status={agents.shelter.status} thinkingMessage={agents.shelter.thinkingMessage} />
        <AgentRow name="dispatch" status={agents.dispatch.status} thinkingMessage={agents.dispatch.thinkingMessage} />
      </div>

      <div className="flex flex-col flex-1 px-5 py-4 overflow-hidden bg-black">
        {activeAgents.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex -space-x-1.5">
              {activeAgents.map(name => (
                <div
                  key={name}
                  className="w-5 h-5 rounded-full ring-2 ring-black relative overflow-hidden"
                  style={{
                    backgroundColor: AGENT_COLORS[name],
                    boxShadow: `0 0 8px ${AGENT_COLORS[name]}`,
                  }}
                >
                  <svg viewBox="0 0 8 8" className="w-full h-full opacity-80">
                    <rect width="8" height="8" fill={AGENT_COLORS[name]} />
                    <rect x="1" y="2" width="2" height="1" fill="#fff" />
                    <rect x="5" y="2" width="2" height="1" fill="#fff" />
                  </svg>
                </div>
              ))}
            </div>
            <div className="text-[15px] font-medium text-[#e5e5e5]">
              {activeAgents.length === 1
                ? `${activeAgents[0].charAt(0).toUpperCase() + activeAgents[0].slice(1)} thinking`
                : 'Agents thinking'}
            </div>
          </div>
        )}

        <ActivityFeed items={feedItems} />
      </div>

      {showFollowUp && !anyActive && (
        <div className="px-4 py-3 border-t border-[#1a1a2e]">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Ask a follow-up..."
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
              className="flex-1 bg-[#14141f] border border-[#1e293b] text-[#e2e8f0] px-2.5 py-1.5 rounded-md text-[12px] outline-none placeholder:text-[#334155]"
            />
            <button
              onClick={handleFollowUp}
              className="bg-[#ff6b35]/10 text-[#ff6b35] px-2.5 py-1.5 rounded-md text-[11px] font-bold hover:bg-[#ff6b35]/20 transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
