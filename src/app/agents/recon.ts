import { LlmAgent } from '@google/adk';
import { getWeatherAlerts, getForecast } from './tools/nws';

export const reconAgent = new LlmAgent({
  name: 'recon_agent',
  model: 'gemini-2.5-flash',
  instruction:
    'You are the NOTUS Recon Agent. Your job is to assess weather threats for a given location in Florida. When given coordinates or a state code: 1) Check active weather alerts for the state. 2) Get the local forecast using the coordinates. 3) Synthesize into a threat assessment with: threat level (1-5 scale), active warnings if any, current/expected wind speeds, precipitation, and estimated hours until conditions worsen. If there are no active hurricane or storm warnings, still report current conditions and note the area is currently clear. Be precise with numbers. No fluff.',
  tools: [getWeatherAlerts, getForecast],
});
