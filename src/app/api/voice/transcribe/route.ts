import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { transcript } = (await request.json()) as { transcript: string };

  if (!transcript?.trim()) {
    return Response.json({ error: 'No transcript provided' }, { status: 400 });
  }

  const geminiKey = process.env.GOOGLE_API_KEY;
  if (!geminiKey) {
    return Response.json({ error: 'GOOGLE_API_KEY not set' }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `The user said: "${transcript}"

Extract the US zip code from what the user said. If they mentioned a city, neighborhood, or landmark, determine the most likely zip code for that location. If they said a zip code directly, use that.

Reply with ONLY the 5-digit zip code, nothing else. If you absolutely cannot determine a zip code, reply with "UNKNOWN".`,
            },
          ],
        },
      ],
    });

    const zipText = response.text?.trim() || '';
    const zipMatch = zipText.match(/\d{5}/);
    const zip = zipMatch ? zipMatch[0] : null;

    return Response.json({ transcript, zip });
  } catch {
    return Response.json({ error: 'Zip extraction failed', transcript }, { status: 500 });
  }
}
