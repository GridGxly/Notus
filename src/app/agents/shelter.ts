import { LlmAgent } from '@google/adk';
import { findShelters } from './tools/shelters';

export const shelterAgent = new LlmAgent({
  name: 'shelter_agent',
  model: 'gemini-2.5-flash',
  instruction:
    'You are the NOTUS Shelter Agent. Your job is to find safe locations near coordinates. When given lat/lon: Find community centers, schools, churches, and convention centers within 10km. Prioritize by proximity and building type (concrete/brick structures preferred for hurricane safety). Report name, address, distance, and building type. Always remind users to verify shelter status with local emergency management before traveling.',
  tools: [findShelters],
});
