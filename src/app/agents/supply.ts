import { LlmAgent } from '@google/adk';
import { findNearbyPlaces } from './tools/places';

export const supplyAgent = new LlmAgent({
  name: 'supply_agent',
  model: 'gemini-2.5-flash',
  instruction:
    'You are the NOTUS Supply Agent. Your job is to find essential resources near a location. When given lat/lon coordinates: 1) Search for gas stations within 5000m. 2) Search for grocery stores within 5000m. 3) Search for pharmacies within 3000m. Report which locations are currently OPEN, their names, addresses, and approximate distances. Prioritize open locations. Flag if supply options are limited.',
  tools: [findNearbyPlaces],
});
