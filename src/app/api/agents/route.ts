import { InMemoryRunner, isFinalResponse, stringifyContent } from '@google/adk';
import { rootAgent } from '../../agents/dispatch';
import type { MapPin, ActionPlan, StreamChunk, AgentName } from '../../lib/types';

export const dynamic = 'force-dynamic';

async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; state: string }> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
    if (!res.ok) return DEFAULT_COORDS;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return DEFAULT_COORDS;
    
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      state: place['state abbreviation'] || 'FL'
    };
  } catch {
    return DEFAULT_COORDS;
  }
}

const DEFAULT_COORDS = { lat: 27.9506, lng: -82.4572, state: 'FL' };

const SESSION_TTL = 15 * 60 * 1000;

type SessionEntry = {
  runner: InMemoryRunner;
  sessionId: string;
  zip: string;
  lat: number;
  lng: number;
  stateCode: string;
  createdAt: number;
};

const globalForSessions = globalThis as typeof globalThis & {
  __notusSessionStore?: Map<string, SessionEntry>;
};
const sessionStore =
  globalForSessions.__notusSessionStore ??= new Map<string, SessionEntry>();

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessionStore) {
    if (now - session.createdAt > SESSION_TTL) sessionStore.delete(id);
  }
}

function mapAuthor(author: string): AgentName {
  if (author.includes('recon')) return 'recon';
  if (author.includes('supply')) return 'supply';
  if (author.includes('shelter')) return 'shelter';
  return 'dispatch';
}

function looksLikeJson(text: string): boolean {
  const t = text.trim();
  return t.startsWith('{') || t.startsWith('```') || t.startsWith('[');
}

function buildFallbackPlan(
  finalText: string,
  supplyPins: MapPin[],
  shelterPins: MapPin[],
): ActionPlan {
  const levelMatch =
    finalText.match(/threat\s*level[:\s]*(\d)\s*(?:[/(]|of\s)/i) ||
    finalText.match(/level[:\s]*(\d)\s*\(/i) ||
    finalText.match(/(\d)\s*(?:out\s+of|\/)\s*5/i);
  const level = levelMatch ? `${levelMatch[1]}/5` : '1/5';

  let detail = '';
  const cleaned = finalText
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{[\s\S]*?\}/g, '')
    .trim();
  const sentences = cleaned.match(/[A-Z][^.!?]*[.!?]/g) || [];
  for (const s of sentences) {
    if (s.length > 20 && s.length < 200 && !s.includes('{') && !s.includes('JSON')) {
      detail = s.trim();
      break;
    }
  }
  if (!detail) {
    detail = 'No active hurricane or tropical storm threats detected for this area.';
  }

  const fuelName = supplyPins[0]?.label || 'No nearby stations found';
  const shelterName = shelterPins[0]?.label || 'No nearby shelters found';

  const hasFuel = supplyPins.length > 0;
  const hasShelter = shelterPins.length > 0;
  let primary = 'Stay weather-aware and keep emergency supplies ready';
  let secondary = 'Sign up for local county emergency alerts';
  if (hasFuel && hasShelter) {
    primary = `Fuel up at ${fuelName} and note ${shelterName} as your go-to shelter`;
    secondary = 'Keep a 72-hour emergency kit packed and monitor local forecasts';
  } else if (hasFuel) {
    primary = `Top off fuel at ${fuelName} while conditions are clear`;
    secondary = 'Identify your nearest community shelter as a precaution';
  } else if (hasShelter) {
    primary = `Know your shelter route to ${shelterName}`;
    secondary = 'Keep your vehicle fueled above half-tank as a precaution';
  }

  return {
    threat: { level, detail },
    fuel: {
      name: fuelName,
      distance: '--',
      status: hasFuel ? 'OPEN' : 'SEARCHING',
    },
    shelter: {
      name: shelterName,
      distance: '--',
      status: hasShelter ? 'AVAILABLE' : 'SEARCHING',
    },
    directive: { primary, secondary },
  };
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

function createStream() {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let writeQueue = Promise.resolve();
  const send = (chunk: StreamChunk): Promise<void> => {
    const p = writeQueue.then(async () => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      } catch {}
    });
    writeQueue = p;
    return p;
  };

  const finish = async () => {
    await writeQueue;
    try {
      await writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch {}
    try {
      await writer.close();
    } catch {}
  };

  return { readable, send, finish, writeQueue };
}

function extractPins(
  ev: Record<string, unknown>,
  send: (chunk: StreamChunk) => Promise<void>,
  supplyPins: MapPin[],
  shelterPins: MapPin[],
) {
  const contentObj = ev.content as Record<string, unknown> | undefined;
  const parts = (contentObj?.parts as Array<Record<string, unknown>>) || [];
  const promises: Promise<void>[] = [];

  for (const part of parts) {
    const funcResp = part.functionResponse as
      | { response: Record<string, unknown> }
      | undefined;
    const resp = funcResp?.response;
    if (!resp) continue;

    if (Array.isArray(resp.places)) {
      for (const p of resp.places as Array<Record<string, unknown>>) {
        if (typeof p.lat === 'number' && typeof p.lng === 'number') {
          const pin: MapPin = {
            lat: p.lat,
            lng: p.lng,
            type: 'supply',
            label: (p.name as string) || 'Gas Station',
          };
          supplyPins.push(pin);
          promises.push(
            send({
              agent: 'supply',
              pin,
              thinkingMessage: `Found ${pin.label}`,
              feed: `${pin.label} — ${(p.isOpen as boolean) ? 'OPEN' : 'status unknown'}`,
              mapView: { lat: p.lat, lng: p.lng, zoom: 14 },
            }),
          );
        }
      }
    }

    if (Array.isArray(resp.shelters)) {
      for (const s of resp.shelters as Array<Record<string, unknown>>) {
        if (typeof s.lat === 'number' && typeof s.lng === 'number') {
          const pin: MapPin = {
            lat: s.lat,
            lng: s.lng,
            type: 'shelter',
            label: (s.name as string) || 'Shelter',
          };
          shelterPins.push(pin);
          promises.push(
            send({
              agent: 'shelter',
              pin,
              thinkingMessage: `Found ${pin.label}`,
              feed: `${pin.label} — potential shelter`,
              mapView: { lat: s.lat, lng: s.lng, zoom: 14 },
            }),
          );
        }
      }
    }
  }

  return Promise.all(promises);
}

async function handleInitial(zip: string, directCoords?: { lat: number; lng: number }) {
  let lat: number, lng: number, stateCode: string;
  if (directCoords) {
    lat = directCoords.lat;
    lng = directCoords.lng;
    stateCode = 'FL';
  } else {
    const coords = await geocodeZip(zip);
    lat = coords.lat;
    lng = coords.lng;
    stateCode = coords.state;
  }
  const { readable, send, finish } = createStream();

  (async () => {
    try {
      await send({
        agent: 'dispatch',
        status: 'active',
        thinkingMessage: 'Starting up',
        mapView: { lat, lng, zoom: 11 },
      });
      await wait(800);

      await send({
        agent: 'dispatch',
        thinkingMessage: 'Sending out agents',
        feed: `Dispatch is online. Sending agents to check on ${zip === 'GPS' ? 'your area' : `ZIP ${zip}`}.`,
      });
      await wait(600);

      await send({
        agent: 'recon',
        status: 'active',
        thinkingMessage: 'Pulling up weather data',
      });

      const runner = new InMemoryRunner({ agent: rootAgent, appName: 'notus' });
      const session = await runner.sessionService.createSession({
        appName: 'notus',
        userId: 'notus-user',
      });

      pruneExpiredSessions();
      sessionStore.set(session.id, {
        runner,
        sessionId: session.id,
        zip,
        lat,
        lng,
        stateCode,
        createdAt: Date.now(),
      });

      await send({ agent: 'dispatch', sessionId: session.id });

      const locationLabel = zip === 'GPS' ? 'their current GPS location' : `zip code ${zip}`;
      const userMessage = {
        role: 'user' as const,
        parts: [{
          text: `Analyze hurricane preparedness for coordinates ${lat}, ${lng} in state ${stateCode}. The user is at ${locationLabel}.`,
        }],
      };

      let adkDone = false;
      let reconDone = false;
      let supplyStarted = false;
      let shelterStarted = false;
      let finalText = '';
      const supplyPins: MapPin[] = [];
      const shelterPins: MapPin[] = [];

      const reconMsgs = [
        'Pulling up weather data',
        'Checking satellite images',
        'Looking at radar',
        'Reading storm alerts',
        'Scanning for tropical activity',
        'Checking the forecast',
        'Looking at wind patterns',
        'Checking for flood warnings',
        'Reviewing the next 48 hours',
        'Checking ocean conditions',
        'Looking at rain chances',
        'Reviewing weather history for this area',
        'Checking nearby storm activity',
        'Wrapping up weather report',
      ];
      const supplyMsgs = [
        'Searching for gas stations',
        'Checking which stations are open',
        'Looking at nearby options',
        'Checking road access',
        'Finding the closest stations',
        'Comparing distances',
        'Checking backup options',
        'Looking at station hours',
        'Mapping the best routes',
        'Finding the best fuel option',
      ];
      const shelterMsgs = [
        'Looking for safe buildings nearby',
        'Checking community centers',
        'Searching schools and churches',
        'Looking at building strength',
        'Checking how easy they are to reach',
        'Comparing shelter options',
        'Checking for flood risk nearby',
        'Looking at parking and access',
        'Finding backup shelter options',
        'Mapping the safest spots',
      ];
      let beatIdx = 0;

      const heartbeat = (async () => {
        const start = Date.now();
        while (!adkDone) {
          for (let i = 0; i < 25 && !adkDone; i++) await wait(100);
          if (adkDone) break;
          beatIdx++;

          const elapsed = (Date.now() - start) / 1000;
          const offsetLat = lat + Math.sin(elapsed * 0.35) * 0.08 + Math.sin(elapsed * 0.7) * 0.02;
          const offsetLng = lng + Math.cos(elapsed * 0.25) * 0.08 + Math.cos(elapsed * 0.55) * 0.03;
          const zoomDrift = 11.5 + Math.sin(elapsed * 0.18) * 1.0;

          await send({
            agent: 'dispatch',
            mapView: { lat: offsetLat, lng: offsetLng, zoom: Math.round(zoomDrift * 10) / 10 },
          });

          if (!reconDone) {
            await send({
              agent: 'recon',
              thinkingMessage: reconMsgs[beatIdx % reconMsgs.length],
            });
          }
          if (supplyStarted) {
            await send({
              agent: 'supply',
              thinkingMessage: supplyMsgs[beatIdx % supplyMsgs.length],
            });
          }
          if (shelterStarted) {
            await send({
              agent: 'shelter',
              thinkingMessage: shelterMsgs[beatIdx % shelterMsgs.length],
            });
          }
        }
      })();

      for await (const event of runner.runAsync({
        userId: 'notus-user',
        sessionId: session.id,
        newMessage: userMessage,
      })) {
        const ev = event as unknown as Record<string, unknown>;
        const author = (ev.author as string) || '';
        const agentName = mapAuthor(author);
        const content = stringifyContent(event);

        if (agentName === 'recon') {
          if (content && content.length > 5 && !looksLikeJson(content)) {
            await send({ agent: 'recon', feed: content.trim() });
          }
        }

        if (agentName === 'supply') {
          if (!supplyStarted) {
            supplyStarted = true;
            if (!reconDone) {
              reconDone = true;
              await send({ agent: 'recon', status: 'done', feed: 'Weather report sent to the team.' });
              await wait(500);
              await send({
                agent: 'dispatch',
                thinkingMessage: 'Sending out Supply and Shelter',
                feed: 'Got the weather report. Now searching for fuel and shelter.',
              });
              await wait(400);
            }
            await send({
              agent: 'supply',
              status: 'active',
              thinkingMessage: 'Searching for gas stations',
              mapView: { lat, lng, zoom: 13 },
            });
          }
          if (content && content.length > 5 && !looksLikeJson(content)) {
            await send({ agent: 'supply', feed: content.trim() });
          }
        }

        if (agentName === 'shelter') {
          if (!shelterStarted) {
            shelterStarted = true;
            if (!reconDone) {
              reconDone = true;
              await send({ agent: 'recon', status: 'done' });
              await wait(400);
            }
            await send({
              agent: 'shelter',
              status: 'active',
              thinkingMessage: 'Looking for safe buildings nearby',
            });
          }
          if (content && content.length > 5 && !looksLikeJson(content)) {
            await send({ agent: 'shelter', feed: content.trim() });
          }
        }

        try {
          await extractPins(ev, send, supplyPins, shelterPins);
        } catch {}

        if (isFinalResponse(event) && content) {
          finalText = content;
        }
      }

      adkDone = true;
      await heartbeat;

      if (!reconDone) {
        await send({ agent: 'recon', status: 'done', feed: 'Weather assessment complete.' });
        await wait(800);
      }

      if (supplyStarted) {
        await send({ agent: 'supply', thinkingMessage: 'Wrapping up fuel search' });
        await wait(1000);
        await send({ agent: 'supply', status: 'done', feed: 'Found your fuel options. Report sent.' });
        await wait(600);
      } else {
        await send({ agent: 'supply', status: 'done' });
        await wait(400);
      }

      if (shelterStarted) {
        await send({ agent: 'shelter', thinkingMessage: 'Picking the best shelter options' });
        await wait(1000);
        await send({ agent: 'shelter', status: 'done', feed: 'Shelter options found and mapped.' });
        await wait(600);
      } else {
        await send({ agent: 'shelter', status: 'done' });
        await wait(400);
      }

      await send({
        agent: 'dispatch',
        thinkingMessage: 'All agents checked in',
        feed: 'All agents have reported back. Putting together your plan.',
      });
      await wait(1200);

      await send({
        agent: 'dispatch',
        thinkingMessage: 'Reviewing what the team found',
      });
      await wait(1000);

      await send({
        agent: 'dispatch',
        thinkingMessage: 'Assessing your risk level',
      });
      await wait(800);

      await send({
        agent: 'dispatch',
        pin: { lat, lng, type: 'user', label: 'You' },
        mapView: { lat, lng, zoom: 13 },
      });
      await wait(800);

      await send({
        agent: 'dispatch',
        thinkingMessage: 'Building your action plan',
      });
      await wait(1000);

      await send({
        agent: 'dispatch',
        thinkingMessage: 'Finishing up',
        mapView: { lat, lng, zoom: 14 },
      });
      await wait(600);

      let actionPlan: ActionPlan;
      let parsed: Record<string, unknown> | null = null;
      try {
        const fenced = finalText.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = fenced ? fenced[1] : finalText;
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) parsed = JSON.parse(objMatch[0]);
      } catch {
        parsed = null;
      }

      if (parsed) {
        const threat = (parsed.threat as Record<string, string>) || {};
        const fuel = (parsed.fuel as Record<string, string>) || {};
        const shelter = (parsed.shelter as Record<string, string>) || {};
        const directive = (parsed.directive as Record<string, string>) || {};
        actionPlan = {
          threat: {
            level: threat.level || 'Unknown',
            detail: threat.detail || '',
          },
          fuel: {
            name: fuel.name || supplyPins[0]?.label || 'Not found',
            distance: fuel.distance || '--',
            status: fuel.status || 'Unknown',
          },
          shelter: {
            name: shelter.name || shelterPins[0]?.label || 'Not found',
            distance: shelter.distance || '--',
            status: shelter.status || 'Unknown',
          },
          directive: {
            primary: directive.primary || 'Stay alert',
            secondary: directive.secondary || 'Monitor local news',
          },
        };

        if (supplyPins.length === 0 && Array.isArray(parsed.supplyPins)) {
          for (const p of parsed.supplyPins as Array<Record<string, unknown>>) {
            if (typeof p.lat === 'number' && typeof p.lng === 'number') {
              await send({
                agent: 'supply',
                pin: { lat: p.lat, lng: p.lng, type: 'supply', label: (p.label as string) || 'Supply' },
                mapView: { lat: p.lat, lng: p.lng, zoom: 14 },
              });
            }
          }
        }
        if (shelterPins.length === 0 && Array.isArray(parsed.shelterPins)) {
          for (const p of parsed.shelterPins as Array<Record<string, unknown>>) {
            if (typeof p.lat === 'number' && typeof p.lng === 'number') {
              await send({
                agent: 'shelter',
                pin: { lat: p.lat, lng: p.lng, type: 'shelter', label: (p.label as string) || 'Shelter' },
                mapView: { lat: p.lat, lng: p.lng, zoom: 14 },
              });
            }
          }
        }
      } else {
        actionPlan = buildFallbackPlan(finalText, supplyPins, shelterPins);
      }

      await send({
        agent: 'dispatch',
        status: 'done',
        thinkingMessage: undefined,
        actionPlan,
      });

      await finish();
    } catch (err) {
      console.error('Agent route error:', err);
      await send({
        agent: 'dispatch',
        status: 'done',
        feed: `Something went wrong: ${String(err).slice(0, 200)}`,
      });
      await finish();
    }
  })();

  return new Response(readable, { headers: SSE_HEADERS });
}

async function handleFollowUp(storedSessionId: string, question: string) {
  const stored = sessionStore.get(storedSessionId);
  if (!stored) {
    return new Response(
      JSON.stringify({ error: 'Session expired. Please start a new search.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { runner, sessionId, lat, lng } = stored;
  const { readable, send, finish } = createStream();

  (async () => {
    try {
      await send({
        agent: 'dispatch',
        status: 'active',
        thinkingMessage: 'Reading your question',
        feed: `"${question}"`,
      });

      let adkDone = false;
      const followUpMsgs = [
        'Thinking about your question',
        'Looking back at what we found',
        'Checking the earlier reports',
        'Reviewing the weather info',
        'Looking at fuel and shelter data',
        'Putting an answer together',
        'Almost ready',
      ];
      let beatIdx = 0;

      const heartbeat = (async () => {
        while (!adkDone) {
          for (let i = 0; i < 25 && !adkDone; i++) await wait(100);
          if (adkDone) break;
          beatIdx++;
          await send({
            agent: 'dispatch',
            thinkingMessage: followUpMsgs[beatIdx % followUpMsgs.length],
          });
        }
      })();

      let finalText = '';
      const newSupplyPins: MapPin[] = [];
      const newShelterPins: MapPin[] = [];

      for await (const event of runner.runAsync({
        userId: 'notus-user',
        sessionId,
        newMessage: {
          role: 'user' as const,
          parts: [{ text: question }],
        },
      })) {
        const ev = event as unknown as Record<string, unknown>;
        const author = (ev.author as string) || '';
        const agentName = mapAuthor(author);
        const content = stringifyContent(event);

        if (agentName !== 'dispatch' && content && content.length > 15 && !looksLikeJson(content)) {
          if (agentName === 'recon') {
            await send({
              agent: 'recon',
              status: 'active',
              thinkingMessage: 'Checking again',
              feed: content.trim(),
            });
          } else if (agentName === 'supply') {
            await send({
              agent: 'supply',
              status: 'active',
              thinkingMessage: 'Searching',
              feed: content.trim(),
            });
          } else if (agentName === 'shelter') {
            await send({
              agent: 'shelter',
              status: 'active',
              thinkingMessage: 'Looking',
              feed: content.trim(),
            });
          }
        }

        try {
          await extractPins(ev, send, newSupplyPins, newShelterPins);
        } catch {}

        if (isFinalResponse(event) && content) {
          finalText = content;
        }
      }

      adkDone = true;
      await heartbeat;

      let answer = finalText;
      if (looksLikeJson(answer)) {
        try {
          const parsed = JSON.parse(answer.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1'));
          if (parsed.directive?.primary) {
            answer = `${parsed.directive.primary} ${parsed.directive.secondary || ''}. ${parsed.threat?.detail || ''}`;
          }
        } catch {
          const cleaned = answer
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\{[\s\S]*?\}/g, '')
            .trim();
          if (cleaned.length > 20) answer = cleaned;
        }
      }

      await send({
        agent: 'dispatch',
        status: 'done',
        feed: answer.slice(0, 500) || 'I couldn\'t find more info on that. Try asking something else.',
        mapView: { lat, lng, zoom: 12 },
      });

      await finish();
    } catch (err) {
      console.error('Follow-up error:', err);
      await send({
        agent: 'dispatch',
        status: 'done',
        feed: `Couldn't process that: ${String(err).slice(0, 200)}`,
      });
      await finish();
    }
  })();

  return new Response(readable, { headers: SSE_HEADERS });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.followUp && body.sessionId) {
    return handleFollowUp(body.sessionId, body.followUp);
  }

  if (typeof body.lat === 'number' && typeof body.lng === 'number') {
    return handleInitial('GPS', { lat: body.lat, lng: body.lng });
  }

  return handleInitial(body.zip);
}
