import type { AgentName, AgentStatus } from '../lib/types';

interface AgentRowProps {
  name: AgentName;
  status: AgentStatus;
}

const colors: Record<AgentName, string> = {
  recon: '#3b82f6',
  supply: '#f59e0b',
  shelter: '#8b5cf6',
  dispatch: '#ff6b35',
};

export default function AgentRow({ name, status }: AgentRowProps) {
  const color = colors[name];
  const isActive = status === 'active';
  const isDone = status === 'done';

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div
        className="w-[6px] h-[6px] rounded-full transition-all duration-300"
        style={{
          backgroundColor: isDone ? '#22c55e' : isActive ? color : '#1e293b',
          boxShadow: isActive ? `0 0 6px ${color}` : 'none',
        }}
      />
      <div
        className="text-[11px] font-semibold w-[58px] capitalize"
        style={{ color }}
      >
        {name}
      </div>
      <div
        className="ml-auto text-[10px]"
        style={{ color: isDone ? '#22c55e' : '#334155' }}
      >
        {status}
      </div>
    </div>
  );
}
