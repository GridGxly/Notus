import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';

export const findNearbyPlaces = new FunctionTool({
  name: 'findNearbyPlaces',
  description:
    'Searches for nearby places of a given type using the Google Places API. Returns up to 5 results with name, address, location, and whether the place is currently open.',
  parameters: z.object({
    lat: z.number().describe('Latitude of the search center'),
    lon: z.number().describe('Longitude of the search center'),
    type: z
      .string()
      .describe(
        'Place type to search for: gas_station, grocery_store, or pharmacy'
      ),
    radius: z.number().describe('Search radius in meters'),
  }),
  execute: async ({ lat, lon, type, radius }) => {
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
              'places.displayName,places.formattedAddress,places.location,places.currentOpeningHours',
          },
          body: JSON.stringify({
            includedTypes: [type],
            maxResultCount: 5,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lon },
                radius,
              },
            },
          }),
        }
      );
      if (!res.ok) return { status: 'error', error: `Places API returned ${res.status}` };
      const data = await res.json();
      const places = (data.places || []).map(
        (p: {
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude?: number; longitude?: number };
          currentOpeningHours?: { openNow?: boolean };
        }) => ({
          name: p.displayName?.text || 'Unknown',
          address: p.formattedAddress || '',
          lat: p.location?.latitude || 0,
          lng: p.location?.longitude || 0,
          isOpen: p.currentOpeningHours?.openNow ?? null,
        })
      );
      return { status: 'ok', places };
    } catch (err) {
      return { status: 'error', error: String(err) };
    }
  },
});
