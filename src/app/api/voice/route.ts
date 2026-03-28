import type { ActionPlan } from '../../lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { actionPlan, zip } = (await request.json()) as {
    actionPlan: ActionPlan;
    zip: string;
  };

  const briefing =
    `NOTUS Briefing for zip code ${zip}. ` +
    `Threat level: ${actionPlan.threat.level}. ${actionPlan.threat.detail}. ` +
    `Your nearest fuel is ${actionPlan.fuel.name}, ${actionPlan.fuel.distance} away, currently ${actionPlan.fuel.status}. ` +
    `Your recommended shelter is ${actionPlan.shelter.name}, ${actionPlan.shelter.distance} away, ${actionPlan.shelter.status}. ` +
    `Directive: ${actionPlan.directive.primary}. ${actionPlan.directive.secondary}. ` +
    `Stay safe.`;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response('ELEVENLABS_API_KEY not set', { status: 500 });
  }

  const ttsRes = await fetch(
    'https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB',
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: briefing,
        model_id: 'eleven_flash_v2_5',
      }),
    },
  );

  if (!ttsRes.ok) {
    return new Response(`ElevenLabs error: ${ttsRes.status}`, { status: 502 });
  }

  return new Response(ttsRes.body, {
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}
