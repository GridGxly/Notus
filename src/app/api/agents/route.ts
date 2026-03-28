import { InMemoryRunner, isFinalResponse, stringifyContent } from '@google/adk';
import { rootAgent } from '../../agents/dispatch';
import type { MapPin, ActionPlan, StreamChunk } from '../../lib/types';

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

function mapAuthor(author: string): 'recon' | 'supply' | 'shelter' | 'dispatch' {
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

export async function POST(request: Request) {
  const { zip } = await request.json();
  const coords = ZIP_COORDS[zip] || DEFAULT_COORDS;
  const { lat, lng, state: stateCode } = coords;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (chunk: StreamChunk) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        } catch {}
      };

      try {
        send({
          agent: 'dispatch',
          status: 'active',
          thinkingMessage: 'Deploying agents',
          feed: `Got it — looking into conditions near ${zip} now.`,
        });

        send({
          agent: 'recon',
          status: 'active',
          thinkingMessage: 'Checking weather alerts',
          feed: 'Pulling the latest weather data from NWS.',
        });

        const runner = new InMemoryRunner({
          agent: rootAgent,
          appName: 'notus',
        });
        const session = await runner.sessionService.createSession({
          appName: 'notus',
          userId: 'notus-user',
        });

        const userMessage = {
          role: 'user' as const,
          parts: [
            {
              text: `Analyze hurricane preparedness for coordinates ${lat}, ${lng} in state ${stateCode}. The user is at zip code ${zip}.`,
            },
          ],
        };

        let reconDone = false;
        let supplyStarted = false;
        let shelterStarted = false;
        let finalText = '';
        const supplyPins: MapPin[] = [];
        const shelterPins: MapPin[] = [];

        const reconThinking = [
          'Checking weather alerts',
          'Reading storm data',
          'Analyzing conditions',
          'Rating the threat',
        ];
        let reconIdx = 0;

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
            reconIdx = (reconIdx + 1) % reconThinking.length;
            send({
              agent: 'recon',
              thinkingMessage: reconThinking[reconIdx],
            });
            if (content && content.length > 15 && !looksLikeJson(content)) {
              send({ agent: 'recon', feed: content.slice(0, 250) });
            }
          }

          if (agentName === 'supply') {
            if (!supplyStarted) {
              supplyStarted = true;
              if (!reconDone) {
                reconDone = true;
                send({ agent: 'recon', status: 'done' });
                send({
                  agent: 'dispatch',
                  thinkingMessage: 'Coordinating supply + shelter',
                });
              }
              send({
                agent: 'supply',
                status: 'active',
                thinkingMessage: 'Finding gas stations',
                feed: 'Searching for open gas stations nearby.',
              });
            } else {
              send({ agent: 'supply', thinkingMessage: 'Checking availability' });
              if (content && content.length > 15 && !looksLikeJson(content)) {
                send({ agent: 'supply', feed: content.slice(0, 250) });
              }
            }
          }

          if (agentName === 'shelter') {
            if (!shelterStarted) {
              shelterStarted = true;
              if (!reconDone) {
                reconDone = true;
                send({ agent: 'recon', status: 'done' });
              }
              send({
                agent: 'shelter',
                status: 'active',
                thinkingMessage: 'Finding shelters',
                feed: 'Searching for emergency shelters nearby.',
              });
            } else {
              send({ agent: 'shelter', thinkingMessage: 'Checking capacity' });
              if (content && content.length > 15 && !looksLikeJson(content)) {
                send({ agent: 'shelter', feed: content.slice(0, 250) });
              }
            }
          }

          // Extract pins from tool results (functionResponse parts)
          try {
            const contentObj = ev.content as Record<string, unknown> | undefined;
            const parts = (contentObj?.parts as Array<Record<string, unknown>>) || [];
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
                    send({
                      agent: 'supply',
                      pin,
                      thinkingMessage: `Found ${pin.label}`,
                      feed: `${pin.label} — ${(p.isOpen as boolean) ? 'OPEN' : 'status unknown'}`,
                    });
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
                    send({
                      agent: 'shelter',
                      pin,
                      thinkingMessage: `Found ${pin.label}`,
                      feed: `${pin.label} — potential shelter`,
                    });
                  }
                }
              }
            }
          } catch {}

          if (isFinalResponse(event) && content) {
            finalText = content;
          }
        }

        if (!reconDone) send({ agent: 'recon', status: 'done' });
        if (supplyStarted) {
          send({
            agent: 'supply',
            status: 'done',
            feed:
              supplyPins.length > 0
                ? `Found ${supplyPins.length} supply location${supplyPins.length > 1 ? 's' : ''}.`
                : 'No supply data available from API.',
          });
        } else {
          send({ agent: 'supply', status: 'done' });
        }
        if (shelterStarted) {
          send({
            agent: 'shelter',
            status: 'done',
            feed:
              shelterPins.length > 0
                ? `Found ${shelterPins.length} potential shelter${shelterPins.length > 1 ? 's' : ''}.`
                : 'No shelter data available from API.',
          });
        } else {
          send({ agent: 'shelter', status: 'done' });
        }

        send({
          agent: 'dispatch',
          pin: { lat, lng, type: 'user', label: 'You' },
        });

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
              name:
                fuel.name || supplyPins[0]?.label || 'Not found',
              distance: fuel.distance || '--',
              status: fuel.status || 'Unknown',
            },
            shelter: {
              name:
                shelter.name || shelterPins[0]?.label || 'Not found',
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
                send({
                  agent: 'supply',
                  pin: {
                    lat: p.lat,
                    lng: p.lng,
                    type: 'supply',
                    label: (p.label as string) || 'Supply',
                  },
                });
              }
            }
          }
          if (shelterPins.length === 0 && Array.isArray(parsed.shelterPins)) {
            for (const p of parsed.shelterPins as Array<Record<string, unknown>>) {
              if (typeof p.lat === 'number' && typeof p.lng === 'number') {
                send({
                  agent: 'shelter',
                  pin: {
                    lat: p.lat,
                    lng: p.lng,
                    type: 'shelter',
                    label: (p.label as string) || 'Shelter',
                  },
                });
              }
            }
          }
        } else {
          actionPlan = buildFallbackPlan(finalText, supplyPins, shelterPins);
        }

        send({
          agent: 'dispatch',
          status: 'done',
          feed: 'Your action plan is ready. Stay safe out there. 🌀',
          actionPlan,
        });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Agent route error:', err);
        const encoder = new TextEncoder();
        send({
          agent: 'dispatch',
          status: 'done',
          feed: `Agent error: ${String(err).slice(0, 200)}`,
        });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
