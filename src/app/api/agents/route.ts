import { NextResponse } from 'next/server';
import { InMemoryRunner, isFinalResponse, stringifyContent } from '@google/adk';
import { rootAgent } from '../../agents/dispatch';
import type { NotusState, MapPin } from '../../lib/types';

const ZIP_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  '33620': { lat: 28.0587, lng: -82.4139, state: 'FL' },
  '33601': { lat: 27.9506, lng: -82.4572, state: 'FL' },
  '33602': { lat: 27.9478, lng: -82.4584, state: 'FL' },
  '33606': { lat: 27.9253, lng: -82.4906, state: 'FL' },
  '33609': { lat: 27.9345, lng: -82.5217, state: 'FL' },
  '33647': { lat: 28.1006, lng: -82.3538, state: 'FL' },
  '33701': { lat: 27.7731, lng: -82.6393, state: 'FL' },
  '33756': { lat: 27.9659, lng: -82.7874, state: 'FL' },
  '33401': { lat: 26.7153, lng: -80.0534, state: 'FL' },
  '33101': { lat: 25.7617, lng: -80.1918, state: 'FL' },
  '32801': { lat: 28.5383, lng: -81.3792, state: 'FL' },
  '32303': { lat: 30.4551, lng: -84.2534, state: 'FL' },
};

const DEFAULT_COORDS = { lat: 27.9506, lng: -82.4572, state: 'FL' };

function ts() {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
}

export async function POST(request: Request) {
  try {
    const { zip } = await request.json();
    const coords = ZIP_COORDS[zip] || DEFAULT_COORDS;
    const { lat, lng, state } = coords;

    const runner = new InMemoryRunner({ agent: rootAgent, appName: 'notus' });

    const sessionService = runner.sessionService;
    const session = await sessionService.createSession({
      appName: 'notus',
      userId: 'notus-user',
    });

    const userMessage = {
      role: 'user' as const,
      parts: [
        {
          text: `Analyze hurricane preparedness for coordinates ${lat}, ${lng} in state ${state}. The user is at zip code ${zip}.`,
        },
      ],
    };

    let finalText = '';
    const events: string[] = [];

    for await (const event of runner.runAsync({
      userId: 'notus-user',
      sessionId: session.id,
      newMessage: userMessage,
    })) {
      const content = stringifyContent(event);
      if (content) events.push(content);
      if (isFinalResponse(event) && content) {
        finalText = content;
      }
    }

    let parsed: Record<string, unknown> | null = null;
    try {
      const jsonMatch = finalText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = null;
    }

    const feedItems = [
      { time: ts(), agent: 'dispatch', color: '#ff6b35', message: `Analyzing ZIP ${zip} (${lat}, ${lng})` },
      { time: ts(), agent: 'recon', color: '#3b82f6', message: 'Weather threat assessment in progress.' },
    ];

    for (const ev of events.slice(0, 8)) {
      if (ev.length > 10) {
        feedItems.push({
          time: ts(),
          agent: ev.includes('weather') || ev.includes('alert') || ev.includes('wind') ? 'recon' : ev.includes('gas') || ev.includes('fuel') || ev.includes('station') ? 'supply' : ev.includes('shelter') || ev.includes('center') || ev.includes('school') ? 'shelter' : 'dispatch',
          color: ev.includes('weather') || ev.includes('alert') ? '#3b82f6' : ev.includes('gas') || ev.includes('fuel') ? '#f59e0b' : ev.includes('shelter') ? '#8b5cf6' : '#ff6b35',
          message: ev.slice(0, 200),
        });
      }
    }

    const mapPins: MapPin[] = [{ lat, lng, type: 'user', label: 'You' }];

    if (parsed) {
      const supplyPins = (parsed.supplyPins as Array<{ lat: number; lng: number; label: string }>) || [];
      const shelterPins = (parsed.shelterPins as Array<{ lat: number; lng: number; label: string }>) || [];
      for (const p of supplyPins) {
        mapPins.push({ lat: p.lat, lng: p.lng, type: 'supply', label: p.label });
      }
      for (const p of shelterPins) {
        mapPins.push({ lat: p.lat, lng: p.lng, type: 'shelter', label: p.label });
      }
    }

    const threat = parsed?.threat as { level?: string; detail?: string } | undefined;
    const fuel = parsed?.fuel as { name?: string; distance?: string; status?: string } | undefined;
    const shelter = parsed?.shelter as { name?: string; distance?: string; status?: string } | undefined;
    const directive = parsed?.directive as { primary?: string; secondary?: string } | undefined;

    feedItems.push({
      time: ts(),
      agent: 'dispatch',
      color: '#ff6b35',
      message: parsed
        ? 'Your action plan is ready. Stay safe out there. 🌀'
        : 'Analysis complete. ' + finalText.slice(0, 200),
    });

    const result: NotusState = {
      agents: {
        recon: { status: 'done', data: null },
        supply: { status: 'done', data: null },
        shelter: { status: 'done', data: null },
        dispatch: { status: 'done', data: null },
      },
      feedItems,
      actionPlan: parsed
        ? {
            threat: {
              level: threat?.level || 'Unknown',
              detail: threat?.detail || '',
            },
            fuel: {
              name: fuel?.name || 'Not found',
              distance: fuel?.distance || '--',
              status: fuel?.status || 'Unknown',
            },
            shelter: {
              name: shelter?.name || 'Not found',
              distance: shelter?.distance || '--',
              status: shelter?.status || 'Unknown',
            },
            directive: {
              primary: directive?.primary || 'Stay alert',
              secondary: directive?.secondary || 'Monitor local news',
            },
          }
        : null,
      mapPins,
      stormTrack: [],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Agent route error:', err);
    return NextResponse.json(
      { error: 'Agent execution failed', detail: String(err) },
      { status: 500 }
    );
  }
}
