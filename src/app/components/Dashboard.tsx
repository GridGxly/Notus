'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import MapView from './MapView';
import ActionBar from './ActionBar';
import type { NotusState, StreamChunk, AgentName, AgentStatus } from '../lib/types';

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

function playBlip(frequency = 800, duration = 100) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, duration + 50);
  } catch {}
}

export default function Dashboard() {
  const [state, setState] = useState<NotusState>(INITIAL_STATE);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'sidebar' | 'map'>('sidebar');
  const [showFlash, setShowFlash] = useState(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const prevStatusRef = useRef<Record<AgentName, AgentStatus>>({
    recon: 'standby',
    supply: 'standby',
    shelter: 'standby',
    dispatch: 'standby',
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = state.agents;
    for (const name of Object.keys(curr) as AgentName[]) {
      if (prev[name] !== 'done' && curr[name].status === 'done' && name !== 'dispatch') {
        playBlip(800, 100);
      }
    }
    prevStatusRef.current = {
      recon: curr.recon.status,
      supply: curr.supply.status,
      shelter: curr.shelter.status,
      dispatch: curr.dispatch.status,
    };
  }, [state.agents]);

  useEffect(() => {
    if (state.actionPlan) {
      playBlip(400, 200);
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 300);
      return () => clearTimeout(t);
    }
  }, [state.actionPlan]);

  const applyChunk = useCallback((chunk: StreamChunk) => {
    if (!mountedRef.current) return;

    if (chunk.sessionId) {
      setSessionId(chunk.sessionId);
    }

    setState((prev) => {
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

  const readStream = useCallback(
    async (res: Response, controller: AbortController) => {
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
    },
    [applyChunk],
  );

  const deployWithParams = useCallback(
    async (params: Record<string, unknown>) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSessionId(null);
      setState({
        ...INITIAL_STATE,
        agents: {
          ...INITIAL_STATE.agents,
          dispatch: {
            status: 'active',
            data: null,
            thinkingMessage: 'Initializing',
          },
        },
      });

      try {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
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
          setState((prev) => {
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
    },
    [applyChunk, readStream],
  );

  const handleDeploy = useCallback(
    (zip: string) => {
      if (!zip) return;
      deployWithParams({ zip });
    },
    [deployWithParams],
  );

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;

    setState((prev) => ({
      ...prev,
      agents: {
        ...INITIAL_STATE.agents,
        dispatch: {
          status: 'active',
          data: null,
          thinkingMessage: 'Getting your location',
        },
      },
    }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        deployWithParams({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        if (!mountedRef.current) return;
        setState({
          ...INITIAL_STATE,
          feedItems: [
            {
              time: timestamp(),
              agent: 'dispatch',
              color: AGENT_COLORS.dispatch,
              message:
                'Could not access your location. Please enter a ZIP code instead.',
            },
          ],
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [deployWithParams]);

  const handleFollowUp = useCallback(
    async (message: string) => {
      if (!message || !sessionId) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({
        ...prev,
        agents: {
          recon: {
            ...prev.agents.recon,
            status:
              prev.agents.recon.status === 'done'
                ? 'done'
                : prev.agents.recon.status,
            data: null,
          },
          supply: {
            ...prev.agents.supply,
            status:
              prev.agents.supply.status === 'done'
                ? 'done'
                : prev.agents.supply.status,
            data: null,
          },
          shelter: {
            ...prev.agents.shelter,
            status:
              prev.agents.shelter.status === 'done'
                ? 'done'
                : prev.agents.shelter.status,
            data: null,
          },
          dispatch: {
            status: 'active',
            data: null,
            thinkingMessage: 'Reading your question',
          },
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
          const isExpired = res.status === 404;
          applyChunk({
            agent: 'dispatch',
            status: 'done',
            feed: isExpired
              ? 'Session expired. Enter your zip code and hit GO to start a fresh scan.'
              : 'Something went wrong processing your question. Try again.',
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
    },
    [sessionId, applyChunk, readStream],
  );

  const agentsActive = Object.values(state.agents).some(
    (a) => a.status === 'active' || a.status === 'done',
  );

  const planReady =
    state.agents.dispatch.status === 'done' && state.actionPlan !== null;

  const activeAgentNames = (Object.keys(state.agents) as AgentName[]).filter(
    (name) => state.agents[name].status === 'active',
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a12]">
      <div className="absolute inset-0 z-0">
        <MapView
          agentsActive={agentsActive}
          pins={state.mapPins}
          stormTrack={state.stormTrack}
          mapView={state.mapView}
        />
      </div>

      {activeAgentNames.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 h-[2px] pointer-events-none" style={{ overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              width: '40%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,107,53,0.35) 40%, rgba(255,107,53,0.5) 50%, rgba(255,107,53,0.35) 60%, transparent 100%)',
              animation: 'scan-line 3s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {showFlash && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'rgba(255, 107, 53, 0.05)',
            animation: 'map-flash 0.3s ease-out forwards',
          }}
        />
      )}

      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex"
        style={{
          background: 'rgba(10, 10, 18, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <button
          onClick={() => setMobileView('sidebar')}
          className={`flex-1 py-2.5 text-[11px] font-bold tracking-wider transition-colors ${
            mobileView === 'sidebar'
              ? 'text-[#ff6b35] border-b-2 border-[#ff6b35]'
              : 'text-white/30'
          }`}
        >
          AGENTS
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2.5 text-[11px] font-bold tracking-wider transition-colors ${
            mobileView === 'map'
              ? 'text-[#ff6b35] border-b-2 border-[#ff6b35]'
              : 'text-white/30'
          }`}
        >
          MAP
        </button>
      </div>

      <div
        className={`
          fixed z-40
          inset-0 top-[41px]
          md:inset-auto md:top-[5vh] md:left-4 md:w-[320px] md:h-[90vh]
          ${mobileView === 'sidebar' ? 'flex' : 'hidden'} md:flex
        `}
      >
        <Sidebar
          agents={state.agents}
          feedItems={state.feedItems}
          onDeploy={handleDeploy}
          onLocate={handleGeolocate}
          onFollowUp={handleFollowUp}
          showFollowUp={planReady && !!sessionId}
        />
      </div>

      {activeAgentNames.length > 0 && (
        <div
          className="fixed top-6 z-50 hidden md:flex items-center gap-3 rounded-full px-5 py-2.5"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10, 10, 18, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div className="flex items-center gap-1.5">
            {activeAgentNames.map((name) => (
              <div key={name} className="relative w-2.5 h-2.5">
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    backgroundColor: AGENT_COLORS[name],
                    opacity: 0.4,
                  }}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: AGENT_COLORS[name] }}
                />
              </div>
            ))}
          </div>
          <span className="text-[13px] text-white/60 whitespace-nowrap">
            Agents analyzing...
          </span>
        </div>
      )}

      <ActionBar
        actionPlan={state.actionPlan}
        visible={state.agents.dispatch.status === 'done'}
        mobileMapActive={mobileView === 'map'}
      />
    </div>
  );
}
