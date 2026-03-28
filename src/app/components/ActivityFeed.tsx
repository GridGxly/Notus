'use client';

import { useRef, useEffect } from 'react';
import type { FeedItem } from '../lib/types';

interface ActivityFeedProps {
  items: FeedItem[];
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length]);

  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((item, i) => (
        <div
          key={i}
          className="mb-2 pl-2.5 py-1.5 rounded-r-md animate-slide-in"
          style={{
            borderLeft: `2px solid ${item.color}`,
            background: i === items.length - 1 ? `${item.color}08` : 'transparent',
          }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="font-semibold text-[10px] capitalize"
              style={{ color: item.color }}
            >
              {item.agent}
            </span>
            <span className="text-[9px] text-[#334155]">{item.time}</span>
          </div>
          <div className="text-[11px] text-[#94a3b8] font-mono leading-snug">
            {item.message}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
