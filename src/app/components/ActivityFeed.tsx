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
      {items.map((item, i) => {
        const bgAvatar = item.color || '#00ff00';
        return (
          <div key={i} className="flex gap-3 mb-5 pl-1">
            <div className="mt-0.5 shrink-0">
              <div 
                className="w-6 h-6 rounded-full overflow-hidden shadow-lg"
                style={{ backgroundColor: bgAvatar, boxShadow: `0 0 8px ${bgAvatar}40` }}
              >
                <svg viewBox="0 0 8 8" className="w-full h-full opacity-80">
                  <rect width="8" height="8" fill={bgAvatar} />
                  <rect x="1" y="2" width="2" height="1" fill="#fff" />
                  <rect x="5" y="2" width="2" height="1" fill="#fff" />
                  <rect x="2" y="5" width="4" height="2" fill="#000" opacity="0.3" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col flex-1">
              <div className="font-bold text-[14px] text-white capitalize mb-1.5 tracking-wide">
                {item.agent}
              </div>
              <div className="bg-[#1f1f1f] text-[#e5e5e5] rounded-[14px] px-3.5 py-3 text-[13px] leading-[1.6] shadow-sm">
                {item.message}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
