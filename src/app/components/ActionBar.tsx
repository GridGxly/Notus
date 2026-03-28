import type { ActionPlan } from '../lib/types';

interface ActionBarProps {
  visible?: boolean;
  actionPlan?: ActionPlan | null;
}

export default function ActionBar({ visible = false, actionPlan = null }: ActionBarProps) {
  if (!visible) return null;

  return (
    <div className="shrink-0 bg-[#0f0f17] border-t border-[#1a1a2e] px-5 py-3.5 w-full">
      <div className="text-[9px] text-[#ff6b35] tracking-[1.2px] font-semibold mb-2">
        YOUR PLAN
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
