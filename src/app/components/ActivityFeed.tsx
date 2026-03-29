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
          className="mb-2 animate-feed-slide-in"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            borderLeft: `2px solid ${item.color}`,
            padding: '8px 12px',
          }}
        >
          <div
            className="text-[11px] font-bold capitalize tracking-wide mb-0.5"
            style={{ color: item.color }}
          >
            {item.agent}
          </div>
          <div className="text-[12px] text-white/60 leading-relaxed">
            {item.message}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
      <div className="h-[200px] shrink-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
}
