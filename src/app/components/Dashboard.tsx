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
  const [currentZip, setCurrentZip] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'sidebar' | 'map'>('sidebar');
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

    if (chunk.sessionId) {
      setSessionId(chunk.sessionId);
    }

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

      if (chunk.mapView) {
        next.mapView = chunk.mapView;
      }

      return next;
    });
  }, []);

  const readStream = useCallback(async (res: Response, controller: AbortController) => {
    if (!res.body) return;
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
  }, [applyChunk]);

  const handleDeploy = useCallback(async (zip: string) => {
    if (!zip) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentZip(zip);
    setSessionId(null);
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

      await readStream(res, controller);
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
  }, [applyChunk, readStream]);

  const handleFollowUp = useCallback(async (message: string) => {
    if (!message || !sessionId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({
      ...prev,
      agents: {
        recon: { ...prev.agents.recon, status: prev.agents.recon.status === 'done' ? 'done' : prev.agents.recon.status, data: null },
        supply: { ...prev.agents.supply, status: prev.agents.supply.status === 'done' ? 'done' : prev.agents.supply.status, data: null },
        shelter: { ...prev.agents.shelter, status: prev.agents.shelter.status === 'done' ? 'done' : prev.agents.shelter.status, data: null },
        dispatch: { status: 'active', data: null, thinkingMessage: 'Reading your question' },
      },
    }));

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, followUp: message }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        applyChunk({
          agent: 'dispatch',
          status: 'done',
          feed: 'Couldn\'t process your question.',
        });
        return;
      }

      await readStream(res, controller);
    } catch (err) {
      if ((err as Error).name !== 'AbortError' && mountedRef.current) {
        applyChunk({
          agent: 'dispatch',
          status: 'done',
          feed: 'Connection lost. Try asking again.',
        });
      }
    }
  }, [sessionId, applyChunk, readStream]);

  const agentsActive = Object.values(state.agents).some(
    a => a.status === 'active' || a.status === 'done',
  );

  const planReady = state.agents.dispatch.status === 'done' && state.actionPlan !== null;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="md:hidden flex border-b border-white/5 bg-black">
        <button
          onClick={() => setMobileView('sidebar')}
          className={`flex-1 py-2.5 text-[11px] font-bold tracking-wider transition-colors ${
            mobileView === 'sidebar'
              ? 'text-[#ff6b35] border-b-2 border-[#ff6b35]'
              : 'text-[#475569]'
          }`}
        >
          AGENTS
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2.5 text-[11px] font-bold tracking-wider transition-colors ${
            mobileView === 'map'
              ? 'text-[#ff6b35] border-b-2 border-[#ff6b35]'
              : 'text-[#475569]'
          }`}
        >
          MAP
        </button>
      </div>

      <div className={`${mobileView === 'sidebar' ? 'flex' : 'hidden'} md:flex`}>
        <Sidebar
          agents={state.agents}
          feedItems={state.feedItems}
          onDeploy={handleDeploy}
          onFollowUp={handleFollowUp}
          showFollowUp={planReady && !!sessionId}
        />
      </div>

      <main className={`flex-1 flex flex-col relative min-h-0 ${mobileView === 'map' ? 'flex' : 'hidden'} md:flex`}>
        <MapView
          agentsActive={agentsActive}
          pins={state.mapPins}
          stormTrack={state.stormTrack}
          mapView={state.mapView}
        />
        <ActionBar
          actionPlan={state.actionPlan}
          visible={state.agents.dispatch.status === 'done'}
          zip={currentZip}
        />
      </main>
    </div>
  );
}
