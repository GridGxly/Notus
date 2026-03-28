import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';

export const findShelters = new FunctionTool({
  name: 'findShelters',
  description:
    'Searches for potential emergency shelters near coordinates using the Google Places API. Looks for community centers, schools, churches, and convention centers within 10 km.',
  parameters: z.object({
    lat: z.number().describe('Latitude of the search center'),
    lon: z.number().describe('Longitude of the search center'),
  }),
  execute: async ({ lat, lon }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return { status: 'error', error: 'GOOGLE_API_KEY not set' };

    try {
      const res = await fetch(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'places.displayName,places.formattedAddress,places.location,places.types',
          },
          body: JSON.stringify({
            includedTypes: [
              'community_center',
              'school',
              'church',
              'convention_center',
            ],
            maxResultCount: 5,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lon },
                radius: 10000,
              },
            },
          }),
        }
      );
      if (!res.ok) return { status: 'error', error: `Places API returned ${res.status}` };
      const data = await res.json();
      const shelters = (data.places || []).map(
        (p: {
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude?: number; longitude?: number };
          types?: string[];
        }) => ({
          name: p.displayName?.text || 'Unknown',
          address: p.formattedAddress || '',
          lat: p.location?.latitude || 0,
          lng: p.location?.longitude || 0,
          type: (p.types || [])[0] || 'building',
        })
      );
      return { status: 'ok', shelters };
    } catch (err) {
      return { status: 'error', error: String(err) };
    }
  },
});
