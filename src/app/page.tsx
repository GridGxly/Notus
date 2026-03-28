'use client';

import { useState } from 'react';
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import ActionBar from "./components/ActionBar";
import type { NotusState } from "./lib/types";

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

export default function Home() {
  const [state, setState] = useState<NotusState>(INITIAL_STATE);

  const handleDeploy = async (zip: string) => {
    if (!zip) return;

    setState({
      ...INITIAL_STATE,
      agents: { ...INITIAL_STATE.agents, recon: { status: 'active', data: null } },
      feedItems: [
        { 
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }), 
          agent: 'dispatch', 
          color: '#ff6b35', 
          message: `Deploying agents for ZIP: ${zip}` 
        }
      ]
    });

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip }),
      });

      if (!response.ok) throw new Error('Agent deployment failed');
      
      const data = await response.json();
      
      if (data && data.agents) {
        setState(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const agentsActive = Object.values(state.agents).some(a => a.status === 'active' || a.status === 'done');

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
