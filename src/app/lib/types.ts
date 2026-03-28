export type AgentName = 'recon' | 'supply' | 'shelter' | 'dispatch';
export type AgentStatus = 'standby' | 'active' | 'done';

export interface AgentState {
  status: AgentStatus;
  data: unknown;
  thinkingMessage?: string;
}

export interface FeedItem {
  time: string;
  agent: string;
  color: string;
  message: string;
}

export interface MapPin {
  lat: number;
  lng: number;
  type: 'supply' | 'shelter' | 'user';
  label: string;
}

export interface ActionPlan {
  threat: { level: string; detail: string };
  fuel: { name: string; distance: string; status: string };
  shelter: { name: string; distance: string; status: string };
  directive: { primary: string; secondary: string };
}

export interface NotusState {
  agents: Record<AgentName, AgentState>;
  feedItems: FeedItem[];
  actionPlan: ActionPlan | null;
  mapPins: MapPin[];
  stormTrack: { lat: number; lng: number }[];
  mapView?: { lat: number; lng: number; zoom?: number };
}

export interface StreamChunk {
  agent: AgentName;
  status?: AgentStatus;
  thinkingMessage?: string;
  feed?: string;
  pin?: MapPin;
  actionPlan?: ActionPlan;
  stormTrack?: { lat: number; lng: number }[];
  mapView?: { lat: number; lng: number; zoom?: number };
  sessionId?: string;
}
