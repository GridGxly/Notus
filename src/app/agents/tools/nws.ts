import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';

const NWS_HEADERS = {
  'User-Agent': '(notus-hackusf, ralph@rnoel.dev)',
  Accept: 'application/geo+json',
};

export const getWeatherAlerts = new FunctionTool({
  name: 'getWeatherAlerts',
  description:
    'Fetches active weather alerts for a US state from the National Weather Service API.',
  parameters: z.object({
    state: z.string().describe('Two-letter US state code, e.g. FL'),
  }),
  execute: async ({ state }) => {
    try {
      const res = await fetch(
        `https://api.weather.gov/alerts/active?area=${state}`,
        { headers: NWS_HEADERS }
      );
      if (!res.ok) return { status: 'error', error: `NWS returned ${res.status}` };
      const data = await res.json();
      const features = data.features || [];
      return {
        status: 'ok',
        alertCount: features.length,
        alerts: features.slice(0, 10).map((f: { properties: Record<string, string | string[]> }) => ({
          event: f.properties.event,
          severity: f.properties.severity,
          headline: f.properties.headline,
          areas: f.properties.areaDesc,
        })),
      };
    } catch (err) {
      return { status: 'error', error: String(err) };
    }
  },
});

export const getForecast = new FunctionTool({
  name: 'getForecast',
  description:
    'Fetches the weather forecast for a lat/lon coordinate from the National Weather Service API.',
  parameters: z.object({
    lat: z.number().describe('Latitude'),
    lon: z.number().describe('Longitude'),
  }),
  execute: async ({ lat, lon }) => {
    try {
      const pointsRes = await fetch(
        `https://api.weather.gov/points/${lat},${lon}`,
        { headers: NWS_HEADERS }
      );
      if (!pointsRes.ok)
        return { status: 'error', error: `NWS points returned ${pointsRes.status}` };
      const pointsData = await pointsRes.json();
      const forecastUrl = pointsData.properties?.forecast;
      if (!forecastUrl) return { status: 'error', error: 'No forecast URL returned' };

      const forecastRes = await fetch(forecastUrl, { headers: NWS_HEADERS });
      if (!forecastRes.ok)
        return { status: 'error', error: `NWS forecast returned ${forecastRes.status}` };
      const forecastData = await forecastRes.json();
      const periods = forecastData.properties?.periods || [];
      return {
        status: 'ok',
        periods: periods.slice(0, 6).map((p: Record<string, string>) => ({
          name: p.name,
          temperature: p.temperature,
          windSpeed: p.windSpeed,
          windDirection: p.windDirection,
          shortForecast: p.shortForecast,
        })),
      };
    } catch (err) {
      return { status: 'error', error: String(err) };
    }
  },
});
