import { LlmAgent } from '@google/adk';
import { reconAgent } from './recon';
import { supplyAgent } from './supply';
import { shelterAgent } from './shelter';

export const dispatchAgent = new LlmAgent({
  name: 'dispatch_agent',
  model: 'gemini-2.5-flash',
  instruction:
    'You are NOTUS Dispatch, the coordinator of a multi-agent hurricane intelligence system. When a user provides a Florida location (coordinates and state): 1) First, delegate to recon_agent to assess current weather threats using the state code and coordinates. 2) Then, delegate to supply_agent AND shelter_agent to find nearby resources and shelters using the coordinates. These two can run in parallel since they don\'t depend on each other. 3) After all agents report back, synthesize everything into a clear, actionable evacuation/preparation plan. Your final response MUST be a JSON object (and nothing else) with this exact structure: { "threat": { "level": "X/5", "detail": "description" }, "fuel": { "name": "Station Name, distance", "distance": "X.Xmi direction", "status": "OPEN or CLOSED" }, "shelter": { "name": "Shelter Name", "distance": "X.Xmi", "status": "CAPACITY OK or similar" }, "directive": { "primary": "Main action to take", "secondary": "Backup action or route" }, "supplyPins": [{ "lat": number, "lng": number, "label": "name" }], "shelterPins": [{ "lat": number, "lng": number, "label": "name" }] }. Be direct. Lives depend on clarity.',
  subAgents: [reconAgent, supplyAgent, shelterAgent],
});

export const rootAgent = dispatchAgent;
