import type { Bindings } from '../types';

const DHRUVA_URL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

/**
 * Same Dhruva models as the Legal Setu voice app (rebuild/packages/backend/convex/lib/bhashini.ts).
 * Hindi and English use the models that app round-tripped.
 * Dogri has no dedicated Coqui voice there, so playback uses the Hindi voice; recognition tries the
 * published Dogri model first, then that Hindi model.
 * Kashmiri is not a Legal Setu voice language. These are the Dhruva services whose catalog lists Kashmiri.
 */
const ASR: Record<string, {sourceLanguage: string; serviceId: string}[]> = {
  hi: [{sourceLanguage: 'hi', serviceId: 'ai4bharat/conformer-hi-gpu--t4'}],
  hinglish: [{sourceLanguage: 'hi', serviceId: 'ai4bharat/conformer-hi-gpu--t4'}],
  en: [{sourceLanguage: 'en', serviceId: 'ai4bharat/whisper-medium-en--gpu--t4'}],
  doi: [
    {sourceLanguage: 'doi', serviceId: 'bhashini/ai4bharat/conformer-multilingual-asr'},
    {sourceLanguage: 'doi', serviceId: 'bhashini/bodhan/asr-transcribe-flex'},
    {sourceLanguage: 'hi', serviceId: 'ai4bharat/conformer-hi-gpu--t4'},
  ],
  ks: [
    {sourceLanguage: 'ks', serviceId: 'bhashini/ai4bharat/conformer-multilingual-asr'},
    {sourceLanguage: 'ks', serviceId: 'bhashini/bodhan/asr-transcribe-flex'},
  ],
  // All three return Perso-Arabic Urdu; ordered by measured latency (about 0.36, 0.43 and 1.9 s).
  ur: [
    {sourceLanguage: 'ur', serviceId: 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4'},
    {sourceLanguage: 'ur', serviceId: 'bhashini/ai4bharat/conformer-multilingual-asr'},
    {sourceLanguage: 'ur', serviceId: 'bhashini/bodhan/asr-transcribe-flex'},
  ],
};

const TTS: Record<string, {sourceLanguage: string; serviceId: string}[]> = {
  hi: [{sourceLanguage: 'hi', serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4'}],
  hinglish: [{sourceLanguage: 'hi', serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4'}],
  en: [{sourceLanguage: 'en', serviceId: 'ai4bharat/indic-tts-coqui-misc-gpu--t4'}],
  // Paused: Dogri speaks through the MIET voice gateway (doi_karan) first, then Gemini.
  // // Legal Setu's Dogri voice: the male Hindi Coqui voice reads Devanagari Dogri.
  // doi: [{sourceLanguage: 'hi', serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4'}],
  ks: [
    {sourceLanguage: 'ks', serviceId: 'bhashini/bodhan/indic-tts'},
  ],
};

function keys(env: Bindings): string[] {
  return [env.BHASHINI_INFERENCE_API_KEY, env.BHASHINI_API_KEY, env.BHASHINI_API_KEY_FALLBACK]
    .map(key => key?.trim() ?? '')
    .filter(Boolean);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

/** Bhashini decodes these containers. Android sends 16 kHz WAV; the browser sends WebM. */
export function audioContainer(bytes: Uint8Array): {audioFormat: string; samplingRate: number} | null {
  if (bytes.length < 12) return null;
  const head = String.fromCharCode(...bytes.subarray(0, 12));
  if (head.startsWith('RIFF')) return {audioFormat: 'wav', samplingRate: 16000};
  if (head.slice(4, 8) === 'ftyp') return {audioFormat: 'm4a', samplingRate: 16000};
  if (head.startsWith('OggS')) return {audioFormat: 'ogg', samplingRate: 48000};
  if (head.startsWith('ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return {audioFormat: 'mp3', samplingRate: 48000};
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return {audioFormat: 'webm', samplingRate: 48000};
  return null;
}

/** Turns Bhashini's 32-bit float WAV into 16-bit PCM WAV so Android MediaPlayer can play it. */
export function toPcm16Wav(wav: Uint8Array): Uint8Array {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const tag = (offset: number) => String.fromCharCode(...wav.subarray(offset, offset + 4));
  if (wav.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file');
  let format = 0;
  let channels = 0;
  let rate = 0;
  let bits = 0;
  let data: Uint8Array | null = null;
  for (let offset = 12; offset + 8 <= wav.byteLength;) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      rate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    }
    if (id === 'data') {
      data = wav.subarray(body, Math.min(body + size, wav.byteLength));
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!data || !channels || !rate) throw new Error('WAV without audio');
  if (format === 1 && bits === 16) return wav;
  if (format !== 3 || bits !== 32) throw new Error(`unsupported WAV format ${format}/${bits}`);
  const samples = Math.floor(data.byteLength / 4);
  const input = new DataView(data.buffer, data.byteOffset, samples * 4);
  const out = new Uint8Array(44 + samples * 2);
  const output = new DataView(out.buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < 4; index += 1) out[offset + index] = text.charCodeAt(index);
  };
  write(0, 'RIFF');
  output.setUint32(4, 36 + samples * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  output.setUint32(16, 16, true);
  output.setUint16(20, 1, true);
  output.setUint16(22, channels, true);
  output.setUint32(24, rate, true);
  output.setUint32(28, rate * channels * 2, true);
  output.setUint16(32, channels * 2, true);
  output.setUint16(34, 16, true);
  write(36, 'data');
  output.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index += 1) {
    const value = Math.max(-1, Math.min(1, input.getFloat32(index * 4, true)));
    output.setInt16(44 + index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return out;
}

async function dhruva(apiKey: string, body: unknown): Promise<unknown | null> {
  const response = await fetch(DHRUVA_URL, {
    method: 'POST',
    headers: {Authorization: apiKey, Accept: '*/*', 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    return null;
  }
  return response.json();
}

/** Speech to text for Hindi, English, Hinglish, Dogri, Kashmiri and Urdu. Null when Bhashini cannot help. */
export async function bhashiniTranscribe(env: Bindings, audioBase64: string, language: string): Promise<string | null> {
  const routes = ASR[language];
  const apiKeys = keys(env);
  if (!routes || !apiKeys.length) return null;
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(audioBase64);
  } catch {
    return null;
  }
  const container = audioContainer(bytes);
  if (!container) return null;

  for (const route of routes) {
    for (const apiKey of apiKeys) {
      try {
        const payload = await dhruva(apiKey, {
          pipelineTasks: [{
            taskType: 'asr',
            config: {
              language: {sourceLanguage: route.sourceLanguage},
              serviceId: route.serviceId,
              audioFormat: container.audioFormat,
              samplingRate: container.samplingRate,
            },
          }],
          inputData: {audio: [{audioContent: audioBase64}]},
        }) as {pipelineResponse?: {taskType?: string; output?: {source?: string}[]}[]} | null;
        const asr = payload?.pipelineResponse?.find(row => row.taskType === 'asr') ?? payload?.pipelineResponse?.[0];
        const text = asr?.output?.[0]?.source?.replace(/\s+/g, ' ').trim() ?? '';
        if (text) return text.slice(0, 500);
      } catch (error) {
        console.warn('Bhashini ASR error', route.serviceId, error instanceof Error ? error.name : 'UnknownError');
      }
    }
  }
  return null;
}

/** Text to speech. Returns 16-bit PCM WAV when Bhashini returns a WAV, otherwise the original clip. */
export async function bhashiniSpeak(env: Bindings, text: string, language: string): Promise<{audio: string; mime: string} | null> {
  const routes = TTS[language];
  const apiKeys = keys(env);
  const line = text.replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!routes || !apiKeys.length || !line) return null;

  for (const route of routes) {
    for (const apiKey of apiKeys) {
      try {
        const payload = await dhruva(apiKey, {
          pipelineTasks: [{
            taskType: 'tts',
            config: {
              language: {sourceLanguage: route.sourceLanguage},
              serviceId: route.serviceId,
              gender: 'male',
              samplingRate: 16000,
            },
          }],
          inputData: {input: [{source: line}]},
        }) as {pipelineResponse?: {audio?: {audioContent?: unknown}[]}[]} | null;
        const content = payload?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
        if (typeof content !== 'string' || content.length < 80) continue;
        try {
          const wav = toPcm16Wav(decodeBase64(content));
          return {audio: encodeBase64(wav), mime: 'audio/wav'};
        } catch {
          return {audio: content, mime: 'audio/wav'};
        }
      } catch (error) {
        console.warn('Bhashini TTS error', route.serviceId, error instanceof Error ? error.name : 'UnknownError');
      }
    }
  }
  return null;
}
