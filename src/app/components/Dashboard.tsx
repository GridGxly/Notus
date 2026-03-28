'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import MapView from './MapView';
import ActionBar from './ActionBar';
import type { NotusState, StreamChunk, AgentName } from '../lib/types';

const AGENT_COLORS: Record<AgentName, string> = {
  recon: '#3b82f6',
  supply: '#f59e0b',
  shelter: '#8b5cf6',
  dispatch: '#ff6b35',
};

const INITIAL_STATE: NotusState = {
  agents: {
    recon: { status: 'standby', data: null },
    supply: { status: 'standby', data: null },
    shelter: { status: 'standby', data: null },
    dispatch: { status: 'standby', data: null },
  },
  feedItems: [],
  actionPlan: null,
  mapPins: [],
  stormTrack: [],
};

function timestamp() {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
}

export default function Dashboard() {
  const [state, setState] = useState<NotusState>(INITIAL_STATE);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const applyChunk = useCallback((chunk: StreamChunk) => {
    if (!mountedRef.current) return;
    setState(prev => {
      const next = { ...prev };
      const agentKey = chunk.agent;

      if (chunk.status || chunk.thinkingMessage !== undefined) {
        next.agents = {
          ...prev.agents,
          [agentKey]: {
            ...prev.agents[agentKey],
            ...(chunk.status ? { status: chunk.status } : {}),
            ...(chunk.thinkingMessage !== undefined
              ? { thinkingMessage: chunk.thinkingMessage }
              : {}),
            ...(chunk.status === 'done' ? { thinkingMessage: undefined } : {}),
          },
        };
      }

      if (chunk.feed) {
        next.feedItems = [
          ...prev.feedItems,
          {
            time: timestamp(),
            agent: agentKey,
            color: AGENT_COLORS[agentKey],
            message: chunk.feed,
          },
        ];
      }

      if (chunk.pin) {
        next.mapPins = [...prev.mapPins, chunk.pin];
      }

      if (chunk.stormTrack) {
        next.stormTrack = chunk.stormTrack;
      }

      if (chunk.actionPlan) {
        next.actionPlan = chunk.actionPlan;
      }

      return next;
    });
  }, []);

  const handleDeploy = useCallback(async (zip: string) => {
    if (!zip) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(INITIAL_STATE);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        applyChunk({
          agent: 'dispatch',
          status: 'done',
          feed: 'Error contacting agents.',
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const chunk: StreamChunk = JSON.parse(data);
              applyChunk(chunk);
            } catch {}
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        if (!mountedRef.current) return;
        setState(prev => {
          const agents = { ...prev.agents };
          for (const key of Object.keys(agents) as AgentName[]) {
            if (agents[key].status !== 'done') {
              agents[key] = {
                ...agents[key],
                status: 'done',
                thinkingMessage: undefined,
              };
            }
          }
          return {
            ...prev,
            agents,
            feedItems: [
              ...prev.feedItems,
              {
                time: timestamp(),
                agent: 'dispatch',
                color: AGENT_COLORS.dispatch,
                message: 'Connection lost. Please try again.',
              },
            ],
          };
        });
      }
    }
  }, [applyChunk]);

  const agentsActive = Object.values(state.agents).some(
    a => a.status === 'active' || a.status === 'done',
  );

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar
        agents={state.agents}
        feedItems={state.feedItems}
        onDeploy={handleDeploy}
      />
      <main className="flex-1 flex flex-col relative min-h-screen">
        <MapView
          agentsActive={agentsActive}
          pins={state.mapPins}
          stormTrack={state.stormTrack}
        />
        <ActionBar
          actionPlan={state.actionPlan}
          visible={state.agents.dispatch.status === 'done'}
        />
      </main>
    </div>
  );
}
