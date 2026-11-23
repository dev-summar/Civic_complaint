import {post} from '@/services/api';

const codes = ['en', 'hi', 'hinglish', 'ur', 'ks', 'doi'] as const;
type VoiceCode = typeof codes[number];
let requestId = 0;

export function voiceCode(language: string): VoiceCode {
  const value = language.toLowerCase();
  if (value.startsWith('ur')) return 'ur';
  if (value.startsWith('ks')) return 'ks';
  if (value.startsWith('doi') || value.startsWith('dg')) return 'doi';
  if (value === 'hinglish') return 'hinglish';
  if (value.startsWith('hi')) return 'hi';
  return codes.includes(value as VoiceCode) ? value as VoiceCode : 'en';
}

export function invalidateSpoken() {
  requestId += 1;
}

/** Writes down a short recording. Hindi, English, Dogri and Kashmiri are heard by Bhashini on the server. */
export async function transcribedSpeech(audio: string, language: string): Promise<string | null> {
  const data = await post<{text?: string}>('/ai/transcribe', {
    audio,
    language: voiceCode(language),
  }, {timeout: 70000});
  const text = data?.text?.replace(/\s+/g, ' ').trim() ?? '';
  return text ? text.slice(0, 500) : null;
}

export type SpokenClip = {audio: string; mime: string};

/** Spoken reply audio from Setu / Gemini. Null when a newer reply replaced this one. */
export async function spokenAudio(text: string, language: string): Promise<SpokenClip | string | null> {
  const line = text.replace(/\s+/g, ' ').trim().slice(0, 400);
  const id = requestId;
  if (!line) return '';
  try {
    const data = await post<{audio?: string; mime?: string}>('/ai/speak', {
      text: line,
      language: voiceCode(language),
    }, {timeout: 125000});
    if (id !== requestId) return null;
    if (!data?.audio) return '';
    return {audio: data.audio, mime: data.mime || 'audio/mpeg'};
  } catch {
    return id === requestId ? '' : null;
  }
}

export function spokenDataUrl(clip: SpokenClip | string): string {
  if (typeof clip === 'string') {
    if (!clip) return '';
    if (clip.startsWith('http') || clip.startsWith('data:')) return clip;
    return `data:audio/mpeg;base64,${clip}`;
  }
  if (clip.audio.startsWith('http') || clip.audio.startsWith('data:')) return clip.audio;
  return `data:${clip.mime || 'audio/mpeg'};base64,${clip.audio}`;
}

export function spokenBase64(clip: SpokenClip | string): string {
  if (typeof clip === 'string') return clip.startsWith('data:') ? clip.slice(clip.indexOf(',') + 1) : clip;
  return clip.audio;
}
