import type { ActionPlan } from '../../lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { actionPlan, zip } = (await request.json()) as {
    actionPlan: ActionPlan;
    zip: string;
  };

  const briefing =
    `Hey, this is your Notus briefing for the area around zip code ${zip}. ` +
    `Here's what the team just put together for you. ` +
    `We're looking at a threat level of ${actionPlan.threat.level} right now. ` +
    `${actionPlan.threat.detail} ` +
    `For fuel, your best option is ${actionPlan.fuel.name}${actionPlan.fuel.distance !== '--' ? `, about ${actionPlan.fuel.distance} away` : ''}. ` +
    `If you need shelter, head to ${actionPlan.shelter.name}${actionPlan.shelter.distance !== '--' ? `, roughly ${actionPlan.shelter.distance} from your location` : ''}. ` +
    `The team's recommendation? ${actionPlan.directive.primary}. ` +
    `And as a backup plan, ${actionPlan.directive.secondary}. ` +
    `Stay safe out there. Notus is watching.`;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response('ELEVENLABS_API_KEY not set', { status: 500 });
  }

  const ttsRes = await fetch(
    'https://api.elevenlabs.io/v1/text-to-speech/ErXwobaYiN019PkySvjV',
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: briefing,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.25,
          similarity_boost: 0.85,
          style: 1.0,
          use_speaker_boost: true
        }
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
