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
      className={`flex items-start gap-2.5 py-2 px-2 -mx-2 rounded-lg transition-[background-color] duration-300 ${isDone ? 'animate-flash-done' : ''}`}
      style={{ '--flash-color': `${color}15` } as React.CSSProperties}
    >
      <div className="mt-1">
        {isActive ? (
          <div className="relative w-[10px] h-[10px]">
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: color, opacity: 0.4 }}
            />
            <div
              className="w-[10px] h-[10px] rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        ) : (
          <div
            className="w-[10px] h-[10px] rounded-full transition-all duration-300"
            style={{
              backgroundColor: isDone ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
            }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-semibold capitalize"
          style={{ color: isDone ? '#22c55e' : color }}
        >
          {name}
        </div>
        {isActive && thinkingMessage && (
          <div className="text-[11px] italic text-white/40 truncate mt-0.5">
            {thinkingMessage}
            <span className="animate-dots" />
          </div>
        )}
      </div>

      <div className="ml-auto mt-1">
        {isActive ? (
          <div
            className="w-16 h-[6px] rounded-full animate-shimmer"
            style={
              {
                backgroundColor: `${color}15`,
                '--shimmer-color': `${color}30`,
              } as React.CSSProperties
            }
          />
        ) : isDone ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className="text-[10px] text-white/20">ready</span>
        )}
      </div>
    </div>
  );
}
