'use client';

import type { AgentName, AgentStatus } from '../lib/types';

interface AgentRowProps {
  name: AgentName;
  status: AgentStatus;
  thinkingMessage?: string;
}

const colors: Record<AgentName, string> = {
  recon: '#3b82f6',
  supply: '#f59e0b',
  shelter: '#8b5cf6',
  dispatch: '#ff6b35',
};

export default function AgentRow({ name, status, thinkingMessage }: AgentRowProps) {
  const color = colors[name];
  const isActive = status === 'active';
  const isDone = status === 'done';

  return (
    <div
      className={`flex items-center gap-2 py-1.5 px-1.5 -mx-1.5 rounded-md transition-[background-color] duration-300 ${isDone ? 'animate-flash-done' : ''}`}
      style={{ '--flash-color': `${color}15` } as React.CSSProperties}
    >
      {isActive ? (
        <div className="relative w-[6px] h-[6px]">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: color, opacity: 0.4 }}
          />
          <div
            className="relative w-full h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      ) : (
        <div
          className="w-[6px] h-[6px] rounded-full transition-all duration-300"
          style={{
            backgroundColor: isDone ? '#22c55e' : '#1e293b',
          }}
        />
      )}

      <div
        className="text-[11px] font-semibold w-[58px] capitalize"
        style={{ color: isDone ? '#22c55e' : color }}
      >
        {name}
      </div>

      <div className="ml-auto text-right max-w-[130px] truncate">
        {isActive ? (
          <span className="text-[10px]" style={{ color }}>
            {thinkingMessage || 'thinking'}
            <span className="animate-dots" />
          </span>
        ) : (
          <span
            className="text-[10px]"
            style={{ color: isDone ? '#22c55e' : '#334155' }}
          >
            {isDone ? '✓ complete' : 'ready'}
          </span>
        )}
      </div>
    </div>
  );
}
