import Image from 'next/image';
import { useState } from 'react';
import AgentRow from './AgentRow';
import ActivityFeed from './ActivityFeed';
import type { NotusState } from '../lib/types';

interface SidebarProps {
  agents: NotusState['agents'];
  feedItems: NotusState['feedItems'];
  onDeploy: (zip: string) => void;
}

export default function Sidebar({ agents, feedItems, onDeploy }: SidebarProps) {
  const [zipCode, setZipCode] = useState('');

  const handleGo = () => {
    if (zipCode.trim()) {
      onDeploy(zipCode.trim());
    }
  };

  return (
    <aside className="w-[280px] min-w-[280px] bg-[#0f0f17] border-r border-[#1a1a2e] flex flex-col h-full">
      <div className="p-4 pb-3 border-b border-[#1a1a2e]">
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
          <div className="ml-auto hidden uppercase px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500">
            SEVERE
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
            className="bg-[#ff6b35] text-[#0a0a0f] px-3.5 py-2 rounded-md font-bold text-[12px] whitespace-nowrap transition-transform active:scale-95"
          >
            GO
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-[#1a1a2e]">
        <div className="text-[9px] text-[#475569] tracking-[1.2px] font-semibold mb-2">
          AGENTS
        </div>
        <AgentRow name="recon" status={agents.recon.status} />
        <AgentRow name="supply" status={agents.supply.status} />
        <AgentRow name="shelter" status={agents.shelter.status} />
        <AgentRow name="dispatch" status={agents.dispatch.status} />
      </div>

      <div className="flex flex-col flex-1 px-4 py-3 overflow-hidden">
        <div className="text-[9px] text-[#475569] tracking-[1.2px] font-semibold mb-2">
          ACTIVITY
        </div>
        <ActivityFeed items={feedItems} />
      </div>
    </aside>
  );
}
