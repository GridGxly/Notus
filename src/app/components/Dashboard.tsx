'use client';

import { useState, useCallback, useRef } from 'react';
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

function buildSimulatedChunks(zip: string): { chunk: StreamChunk; delay: number }[] {
  return [
    { delay: 0, chunk: { agent: 'dispatch', status: 'active', feed: `Got it — looking into conditions near ${zip} now.` } },
    { delay: 600, chunk: { agent: 'recon', status: 'active', thinkingMessage: 'Checking weather alerts', feed: 'Pulling the latest weather alerts for your area from the National Weather Service.' } },
    { delay: 1400, chunk: { agent: 'recon', thinkingMessage: 'Reading storm warnings', feed: 'Found a Tropical Storm Warning active for Hillsborough County.' } },
    { delay: 800, chunk: { agent: 'recon', thinkingMessage: 'Analyzing wind + rain', feed: 'Winds are expected at 45 mph with gusts up to 60. Rainfall around 4–6 inches.' } },
    { delay: 1000, chunk: { agent: 'recon', thinkingMessage: 'Rating the threat', feed: 'Evaluating how severe this is based on the storm data.' } },
    { delay: 900, chunk: {
      agent: 'recon',
      status: 'done',
      feed: 'Threat level: 3 out of 5. Significant but manageable if you prepare now.',
      stormTrack: [
        { lat: 26.5, lng: -84.0 },
        { lat: 27.0, lng: -83.5 },
        { lat: 27.5, lng: -83.0 },
        { lat: 27.9, lng: -82.5 },
        { lat: 28.3, lng: -82.0 },
      ],
    }},
    { delay: 300, chunk: { agent: 'dispatch', thinkingMessage: 'Sending out supply + shelter', feed: 'Weather analysis done. Now searching for fuel and shelter options nearby.' } },
    { delay: 200, chunk: { agent: 'supply', status: 'active', thinkingMessage: 'Finding gas stations', feed: 'Looking for open gas stations within a few miles of you.' } },
    { delay: 200, chunk: { agent: 'shelter', status: 'active', thinkingMessage: 'Finding shelters', feed: 'Searching for emergency shelters accepting people near ' + zip + '.' } },
    { delay: 1200, chunk: {
      agent: 'supply',
      thinkingMessage: 'Checking if they\'re open',
      feed: 'Found a Shell station 0.8 miles east and a Chevron 1.2 miles north.',
      pin: { lat: 27.9506, lng: -82.4372, type: 'supply', label: 'Shell, 0.8mi E' },
    }},
    { delay: 600, chunk: {
      agent: 'shelter',
      thinkingMessage: 'Checking capacity',
      feed: 'Marshall Student Center is 0.3 miles away and accepting evacuees.',
      pin: { lat: 27.9476, lng: -82.4582, type: 'shelter', label: 'Marshall Ctr, 0.3mi' },
    }},
    { delay: 800, chunk: {
      agent: 'supply',
      status: 'done',
      feed: 'Shell is confirmed open with fuel available. You should fill up soon.',
      pin: { lat: 27.9606, lng: -82.4472, type: 'supply', label: 'Chevron, 1.2mi N' },
    }},
    { delay: 600, chunk: { agent: 'shelter', status: 'done', feed: 'Marshall Center is open and has room. It\'s your closest option.' } },
    { delay: 400, chunk: { agent: 'dispatch', thinkingMessage: 'Putting it all together', feed: 'All agents checked in. Building your personalized action plan.' } },
    { delay: 1000, chunk: {
      agent: 'dispatch',
      status: 'done',
      feed: 'Your action plan is ready. Stay safe out there. 🌀',
      pin: { lat: 27.9506, lng: -82.4572, type: 'user', label: 'You' },
    }},
  ];
}

export default function Dashboard() {
  const [state, setState] = useState<NotusState>(INITIAL_STATE);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const applyChunk = useCallback((chunk: StreamChunk) => {
    setState(prev => {
      const next = { ...prev };
      const agentKey = chunk.agent;

      if (chunk.status || chunk.thinkingMessage) {
        next.agents = {
          ...prev.agents,
          [agentKey]: {
            ...prev.agents[agentKey],
            ...(chunk.status ? { status: chunk.status } : {}),
            ...(chunk.thinkingMessage !== undefined ? { thinkingMessage: chunk.thinkingMessage } : {}),
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

      if (chunk.status === 'done' && agentKey === 'dispatch') {
        next.actionPlan = {
          threat: { level: 'Level 3 of 5', detail: 'Winds 45 mph, gusts to 60' },
          fuel: { name: 'Shell — 0.8 mi east', distance: '0.8mi', status: 'Open now' },
          shelter: { name: 'Marshall Ctr — 0.3 mi', distance: '0.3mi', status: 'Has room' },
          directive: { primary: 'Fill up before 4 PM', secondary: 'Evacuation watch active' },
        };
      }

      return next;
    });
  }, []);

  const handleDeploy = useCallback(async (zip: string) => {
    if (!zip) return;

    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    setState(INITIAL_STATE);

    const sequence = buildSimulatedChunks(zip);
    let cumulativeDelay = 0;

    for (const { chunk, delay } of sequence) {
      cumulativeDelay += delay;
      const id = setTimeout(() => applyChunk(chunk), cumulativeDelay);
      timeoutRefs.current.push(id);
    }
  }, [applyChunk]);

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
