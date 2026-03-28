export type AgentName = 'recon' | 'supply' | 'shelter' | 'dispatch';
export type AgentStatus = 'standby' | 'active' | 'done';

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
