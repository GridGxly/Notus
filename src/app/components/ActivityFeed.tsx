import type { FeedItem } from '../lib/types';

interface ActivityFeedProps {
  items: FeedItem[];
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((item, i) => (
        <div key={i} className="mb-1 font-mono text-[10px] leading-relaxed">
          <span className="text-[#334155] mr-1.5">{item.time}</span>
          <span className="font-semibold mr-1.5 capitalize" style={{ color: item.color }}>
            {item.agent}
          </span>
          <span className="text-[#64748b]">{item.message}</span>
        </div>
      ))}
    </div>
  );
}
