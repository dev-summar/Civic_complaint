import type { Bindings } from '../types';

/** Wrap little-endian PCM16 as a WAV container browsers/MediaPlayer can play. */
export function pcm16ToWavBase64(pcm: Uint8Array, sampleRate = 24000): string {
  const dataSize = pcm.byteLength;
  const wav = new Uint8Array(44 + dataSize);
  const view = new DataView(wav.buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  wav.set(pcm, 44);
  let binary = '';
  for (let index = 0; index < wav.length; index += 0x8000) {
    binary += String.fromCharCode(...wav.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function sampleRateFromMime(mime: string | undefined): number {
  const match = mime?.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
}

/**
 * Kashmiri (and other Indic) TTS via Gemini preview TTS.
 * Returns WAV base64 + mime so clients can play without assuming MP3.
 */
export async function geminiSpeak(env: Bindings, text: string, language: string): Promise<{audio: string; mime: string} | null> {
  if (!env.GEMINI_API_KEY) return null;
  // Prefer Gemini for Kashmiri replies; optional for Dogri when MIET voice is weak.
  if (language !== 'ks' && language !== 'doi') return null;

  const line = text.replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!line) return null;
  // Only the line itself: the TTS models read any instruction text aloud as part of the reply.
  const prompt = line;

  const models = [
    'gemini-3.1-flash-tts-preview',
    'gemini-3.8-flash-lite-tts',
    'gemini-2.5-flash-preview-tts',
  ];
  let response: Response | null = null;
  for (const model of models) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                // Fixed Setu voice for Kashmiri replies.
                prebuiltVoiceConfig: { voiceName: 'Charon' },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (response.ok) break;
    if (response.status !== 429 && response.status !== 404) break;
  }
  if (!response) return null;
  if (!response.ok) {
    console.warn('Gemini TTS failed', response.status, (await response.text()).slice(0, 160));
    return null;
  }
  const payload = await response.json() as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  const inline = payload.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData;
  if (!inline?.data) return null;

  const mime = inline.mimeType || 'audio/wav';
  if (/mpeg|mp3/i.test(mime)) return { audio: inline.data, mime: 'audio/mpeg' };
  if (/wav|wave/i.test(mime) && !/L16|pcm/i.test(mime)) return { audio: inline.data, mime: 'audio/wav' };

  // Gemini preview TTS usually returns raw PCM16 — wrap as WAV for playback.
  const rate = sampleRateFromMime(mime);
  return { audio: pcm16ToWavBase64(decodeBase64(inline.data), rate), mime: 'audio/wav' };
}
