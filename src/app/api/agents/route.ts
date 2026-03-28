import { InMemoryRunner, isFinalResponse, stringifyContent } from '@google/adk';
import { rootAgent } from '../../agents/dispatch';
import type { MapPin, ActionPlan, StreamChunk, AgentName } from '../../lib/types';

export const dynamic = 'force-dynamic';

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

const sessionStore = new Map<string, {
  runner: InMemoryRunner;
  sessionId: string;
  zip: string;
  lat: number;
  lng: number;
  stateCode: string;
}>();

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
    finalText.match(/level[:\s]*(\d)\s*\(/i);
  const level = levelMatch ? `${levelMatch[1]}/5` : 'Low';

  let detail = '';
  const patterns = [
    /(?:wind[s]?\s+(?:are\s+)?(?:expected\s+)?(?:at\s+)?[\d]+\s*mph[^.]*\.)/i,
    /(?:tropical\s+storm[^.]*\.)/i,
    /(?:no\s+active\s+hurricane[^.]*\.)/i,
    /(?:the\s+area\s+is\s+currently[^.]*\.)/i,
    /(?:conditions[^.]*\.)/i,
  ];
  for (const p of patterns) {
    const m = finalText.match(p);
    if (m) {
      detail = m[0];
      break;
    }
  }
  if (!detail) {
    detail = finalText
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\{[\s\S]*?\}/g, '')
      .trim()
      .slice(0, 150);
  }

  return {
    threat: { level, detail: detail || 'Assessment complete' },
    fuel: {
      name: supplyPins[0]?.label || 'Check local stations',
      distance: '--',
      status: supplyPins.length > 0 ? 'LOCATED' : 'CHECK LOCALLY',
    },
    shelter: {
      name: shelterPins[0]?.label || 'Check local shelters',
      distance: '--',
      status: shelterPins.length > 0 ? 'LOCATED' : 'CHECK LOCALLY',
    },
    directive: {
      primary: 'Monitor local emergency management',
      secondary: 'Prepare 72-hour emergency supplies',
    },
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
    await writer.write(encoder.encode('data: [DONE]\n\n'));
    await writer.close();
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

async function handleInitial(zip: string) {
  const coords = ZIP_COORDS[zip] || DEFAULT_COORDS;
  const { lat, lng, state: stateCode } = coords;
  const { readable, send, finish } = createStream();

  (async () => {
    try {
      await send({
        agent: 'dispatch',
        status: 'active',
        thinkingMessage: 'Deploying agents',
        feed: `On it — checking conditions near ${zip}.`,
        mapView: { lat, lng, zoom: 11 },
      });
      await send({
        agent: 'recon',
        status: 'active',
        thinkingMessage: 'Checking for storm warnings',
        feed: 'Let me check the latest weather alerts for your area.',
      });

      const runner = new InMemoryRunner({ agent: rootAgent, appName: 'notus' });
      const session = await runner.sessionService.createSession({
        appName: 'notus',
        userId: 'notus-user',
      });

      sessionStore.set(session.id, {
        runner,
        sessionId: session.id,
        zip,
        lat,
        lng,
        stateCode,
      });

      await send({ agent: 'dispatch', sessionId: session.id });

      const userMessage = {
        role: 'user' as const,
        parts: [{
          text: `Analyze hurricane preparedness for coordinates ${lat}, ${lng} in state ${stateCode}. The user is at zip code ${zip}.`,
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
        'Checking for storm warnings',
        'Looking at current weather',
        'Checking wind speeds',
        'Figuring out how serious this is',
        'Scanning for advisories',
        'Reading the latest forecast',
      ];
      const supplyMsgs = [
        'Finding open gas stations',
        'Checking if they have fuel',
        'Looking for the closest ones',
      ];
      const shelterMsgs = [
        'Finding safe places to go',
        'Checking if they have room',
        'Making sure you can get there',
      ];
      let beatIdx = 0;

      const heartbeat = (async () => {
        while (!adkDone) {
          for (let i = 0; i < 18 && !adkDone; i++) await wait(100);
          if (adkDone) break;
          beatIdx++;
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
          if (content && content.length > 15 && !looksLikeJson(content)) {
            await send({ agent: 'recon', feed: content.slice(0, 250) });
          }
        }

        if (agentName === 'supply') {
          if (!supplyStarted) {
            supplyStarted = true;
            if (!reconDone) {
              reconDone = true;
              await send({ agent: 'recon', status: 'done' });
              await send({
                agent: 'dispatch',
                thinkingMessage: 'Coordinating supply + shelter search',
              });
            }
            await send({
              agent: 'supply',
              status: 'active',
              thinkingMessage: 'Finding open gas stations',
              feed: 'Looking for gas stations that are still open near you.',
              mapView: { lat, lng, zoom: 13 },
            });
          } else {
            if (content && content.length > 15 && !looksLikeJson(content)) {
              await send({ agent: 'supply', feed: content.slice(0, 250) });
            }
          }
        }

        if (agentName === 'shelter') {
          if (!shelterStarted) {
            shelterStarted = true;
            if (!reconDone) {
              reconDone = true;
              await send({ agent: 'recon', status: 'done' });
            }
            await send({
              agent: 'shelter',
              status: 'active',
              thinkingMessage: 'Finding safe places nearby',
              feed: 'Finding shelters and safe places nearby.',
            });
          } else {
            if (content && content.length > 15 && !looksLikeJson(content)) {
              await send({ agent: 'shelter', feed: content.slice(0, 250) });
            }
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
        await send({ agent: 'recon', status: 'done' });
        await wait(300);
      }

      await send({
        agent: 'supply',
        status: 'done',
        feed: supplyStarted
          ? supplyPins.length > 0
            ? `Found ${supplyPins.length} gas station${supplyPins.length > 1 ? 's' : ''} near you.`
            : 'No fuel data available right now.'
          : undefined,
      });
      await wait(300);

      await send({
        agent: 'shelter',
        status: 'done',
        feed: shelterStarted
          ? shelterPins.length > 0
            ? `Found ${shelterPins.length} shelter${shelterPins.length > 1 ? 's' : ''} you could go to.`
            : 'No shelter data available right now.'
          : undefined,
      });
      await wait(300);

      await send({
        agent: 'dispatch',
        thinkingMessage: 'Putting your plan together',
      });
      await wait(400);

      await send({
        agent: 'dispatch',
        pin: { lat, lng, type: 'user', label: 'You' },
        mapView: { lat, lng, zoom: 12 },
      });
      await wait(200);

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
        feed: 'Your plan is ready. Stay safe out there.',
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
        'Checking what I found earlier',
        'Looking into it',
        'Putting an answer together',
      ];
      let beatIdx = 0;

      const heartbeat = (async () => {
        while (!adkDone) {
          for (let i = 0; i < 18 && !adkDone; i++) await wait(100);
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
              feed: content.slice(0, 250),
            });
          } else if (agentName === 'supply') {
            await send({
              agent: 'supply',
              status: 'active',
              thinkingMessage: 'Searching',
              feed: content.slice(0, 250),
            });
          } else if (agentName === 'shelter') {
            await send({
              agent: 'shelter',
              status: 'active',
              thinkingMessage: 'Looking',
              feed: content.slice(0, 250),
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
        const cleaned = answer
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*?\}/g, '')
          .trim();
        if (cleaned.length > 20) answer = cleaned;
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

  return handleInitial(body.zip);
}
