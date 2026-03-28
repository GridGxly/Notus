interface ActionBarProps {
  visible?: boolean;
}

export default function ActionBar({ visible = false }: ActionBarProps) {
  if (!visible) return null;

  return (
    <div className="shrink-0 bg-[#0f0f17] border-t border-[#1a1a2e] px-5 py-3.5 w-full">
      <div className="text-[9px] text-[#ff6b35] tracking-[1.2px] font-semibold mb-2">
        ACTION PLAN
      </div>
      <div className="grid grid-cols-4 gap-4 font-mono text-[11px]">
        <div className="flex flex-col">
          <div className="text-[9px] font-semibold tracking-[0.5px] mb-0.5 text-[#ef4444]">
            THREAT
          </div>
          <div className="text-[#cbd5e1] mb-0.5">Level 3/5</div>
          <div className="text-[10px] text-[#475569]">Winds 110mph</div>
        </div>

        <div className="flex flex-col">
          <div className="text-[9px] font-semibold tracking-[0.5px] mb-0.5 text-[#f59e0b]">
            NEAREST FUEL
          </div>
          <div className="text-[#cbd5e1] mb-0.5">Shell, 0.8mi E</div>
          <div className="text-[10px] text-[#22c55e]">OPEN</div>
        </div>

        <div className="flex flex-col">
          <div className="text-[9px] font-semibold tracking-[0.5px] mb-0.5 text-[#8b5cf6]">
            SHELTER
          </div>
          <div className="text-[#cbd5e1] mb-0.5">Marshall Ctr, 0.3mi</div>
          <div className="text-[10px] text-[#22c55e]">CAPACITY OK</div>
        </div>

        <div className="flex flex-col">
          <div className="text-[9px] font-semibold tracking-[0.5px] mb-0.5 text-[#22c55e]">
            DIRECTIVE
          </div>
          <div className="text-[#cbd5e1] mb-0.5">Fuel up by 4 PM</div>
          <div className="text-[10px] text-[#475569]">Evac warning</div>
        </div>
      </div>
    </div>
  );
}
