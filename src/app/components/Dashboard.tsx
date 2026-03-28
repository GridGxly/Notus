'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import MapView from './MapView';
import ActionBar from './ActionBar';
import type { NotusState, AgentName, AgentStatus, MapPin } from '../lib/types';

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

export default function Dashboard() {
  const [state, setState] = useState<NotusState>(INITIAL_STATE);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);
  const fullResultRef = useRef<NotusState | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  const handleDeploy = useCallback(async (zip: string) => {
    if (!zip) return;

    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    const wait = (ms: number) => new Promise<void>(r => {
      const id = setTimeout(r, ms);
      timeoutRefs.current.push(id);
    });

    const addFeed = (agent: string, color: string, message: string) => {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        feedItems: [...prev.feedItems, {
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }),
          agent,
          color,
          message,
        }],
      }));
    };

    const addPin = (pin: MapPin) => {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, mapPins: [...prev.mapPins, pin] }));
    };

    const setAgentStatus = (name: AgentName, status: AgentStatus, thinkingMessage?: string) => {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        agents: {
          ...prev.agents,
          [name]: {
            ...prev.agents[name],
            status,
            thinkingMessage: status === 'done' ? undefined : thinkingMessage,
          },
        },
      }));
    };

    setState({
      ...INITIAL_STATE,
      agents: {
        ...INITIAL_STATE.agents,
        dispatch: { status: 'active', data: null, thinkingMessage: 'Deploying agents' },
      },
      feedItems: [{
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }),
        agent: 'dispatch',
        color: AGENT_COLORS.dispatch,
        message: `Deploying agents for ZIP: ${zip}`,
      }],
    });

    await wait(200);
    if (!mountedRef.current) return;
    setAgentStatus('recon', 'active', 'Checking weather alerts');
    addFeed('recon', AGENT_COLORS.recon, 'Querying NWS weather data...');

    const reconThinking = ['Checking weather alerts', 'Reading storm warnings', 'Analyzing wind + rain', 'Rating the threat'];
    let thinkingIdx = 0;
    const thinkingInterval = setInterval(() => {
      if (!mountedRef.current) return;
      thinkingIdx = (thinkingIdx + 1) % reconThinking.length;
      setAgentStatus('recon', 'active', reconThinking[thinkingIdx]);
    }, 2000);

    setAgentStatus('dispatch', 'active', 'Waiting on recon');

    let data: NotusState;
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip }),
      });
      data = await res.json();
    } catch {
      clearInterval(thinkingInterval);
      if (!mountedRef.current) return;
      addFeed('dispatch', AGENT_COLORS.dispatch, 'Error contacting agents. Please try again.');
      setAgentStatus('dispatch', 'done');
      return;
    }

    clearInterval(thinkingInterval);
    fullResultRef.current = data;

    await wait(500);
    if (!mountedRef.current) return;
    setAgentStatus('recon', 'done');

    const reconFeedItems = data.feedItems.filter(f => f.agent === 'recon');
    for (const item of reconFeedItems) {
      addFeed(item.agent, item.color, item.message);
    }

    const userPin = data.mapPins.find(p => p.type === 'user');
    if (userPin) addPin(userPin);

    if (data.stormTrack && data.stormTrack.length > 0) {
      for (const point of data.stormTrack) {
        await wait(150);
        if (!mountedRef.current) return;
        setState(prev => ({ ...prev, stormTrack: [...prev.stormTrack, point] }));
      }
    }

    await wait(800);
    if (!mountedRef.current) return;
    setAgentStatus('dispatch', 'active', 'Sending out supply + shelter');
    setAgentStatus('supply', 'active', 'Finding gas stations');
    setAgentStatus('shelter', 'active', 'Finding shelters');
    addFeed('supply', AGENT_COLORS.supply, 'Searching gas stations...');
    addFeed('shelter', AGENT_COLORS.shelter, 'Locating shelters...');

    const supplyPins = data.mapPins.filter(p => p.type === 'supply');
    const supplyFeedItems = data.feedItems.filter(f => f.agent === 'supply');
    for (let i = 0; i < supplyPins.length; i++) {
      await wait(300);
      if (!mountedRef.current) return;
      setAgentStatus('supply', 'active', 'Checking availability');
      addPin(supplyPins[i]);
      if (supplyFeedItems[i]) {
        addFeed(supplyFeedItems[i].agent, supplyFeedItems[i].color, supplyFeedItems[i].message);
      }
    }
    setAgentStatus('supply', 'done');

    const shelterPins = data.mapPins.filter(p => p.type === 'shelter');
    const shelterFeedItems = data.feedItems.filter(f => f.agent === 'shelter');
    for (let i = 0; i < shelterPins.length; i++) {
      await wait(300);
      if (!mountedRef.current) return;
      setAgentStatus('shelter', 'active', 'Checking capacity');
      addPin(shelterPins[i]);
      if (shelterFeedItems[i]) {
        addFeed(shelterFeedItems[i].agent, shelterFeedItems[i].color, shelterFeedItems[i].message);
      }
    }
    setAgentStatus('shelter', 'done');

    await wait(500);
    if (!mountedRef.current) return;
    setAgentStatus('dispatch', 'active', 'Putting it all together');
    await wait(400);
    if (!mountedRef.current) return;
    setAgentStatus('dispatch', 'done');
    setState(prev => ({ ...prev, actionPlan: data.actionPlan }));

    const dispatchFeedItems = data.feedItems.filter(f => f.agent === 'dispatch');
    const finalItem = dispatchFeedItems[dispatchFeedItems.length - 1];
    if (finalItem) {
      addFeed(finalItem.agent, finalItem.color, finalItem.message);
    }
  }, []);

  const agentsActive = Object.values(state.agents).some(
    a => a.status === 'active' || a.status === 'done'
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
