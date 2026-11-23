import {DeviceEventEmitter} from 'react-native';
import {post} from '@/services/api';
import type {ReportVoice} from './ReportChat';
import {spokenAudio, spokenDataUrl, voiceCode, invalidateSpoken} from './cloudVoice';

function emit(type: string, text?: string, level?: number) {
  DeviceEventEmitter.emit('ReportVoiceState', {type, ...(text != null ? {text} : {}), ...(level != null ? {level} : {})});
}

function reportLanguage(language: string): 'en' | 'hi' | 'hinglish' | 'ur' | 'ks' | 'doi' {
  return voiceCode(language);
}

function speechLanguage(language: string) {
  const code = voiceCode(language);
  if (code === 'en') return 'en-US';
  if (code === 'ur') return 'ur-IN';
  if (code === 'ks') return 'ks-IN';
  return 'hi-IN';
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const targetRate = 16000;
  const length = Math.max(1, Math.floor(samples.length * targetRate / sampleRate));
  const pcm = new Int16Array(length);
  for (let index = 0; index < length; index += 1) {
    const source = samples[Math.min(samples.length - 1, Math.floor(index * sampleRate / targetRate))] ?? 0;
    const clamped = Math.max(-1, Math.min(1, source));
    pcm[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const wav = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(wav.buffer);
  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  wav.set(new Uint8Array(pcm.buffer), 44);
  return wav;
}

async function audioBase64(blob: Blob) {
  try {
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const wav = encodeWav(decoded.getChannelData(0), decoded.sampleRate);
    await context.close();
    return bytesToBase64(wav);
  } catch {
    return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
  }
}

function preferredVoice(language: string) {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const code = voiceCode(language);
  const prefixes = code === 'en' ? ['en']
    : code === 'ur' ? ['ur', 'ar']
    : code === 'ks' ? ['ks', 'ur', 'ar']
    : ['hi', 'doi'];
  const score = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase();
    const name = `${voice.name} ${voice.lang}`.toLowerCase();
    const rank = prefixes.findIndex(prefix => lang.startsWith(prefix));
    if (rank < 0) return 0;
    let value = 20 - rank * 5;
    if (/natural|neural|premium|enhanced/.test(name)) value += 5;
    if (name.includes('google')) value += 4;
    if (name.includes('microsoft') && name.includes('online')) value += 3;
    if (code !== 'en' && /hindi|urdu|kashmiri|dogri|swara|kalpana/.test(name)) value += 3;
    if (code === 'en' && lang.startsWith('en-us')) value += 3;
    if (code === 'en' && /hindi|urdu|swara|kalpana/.test(name)) return 0;
    return value;
  };
  return voices.reduce<SpeechSynthesisVoice | null>((best, voice) => {
    if (!best || score(voice) > score(best)) return score(voice) ? voice : best;
    return best;
  }, null);
}

function spokenLine(text: string, language: string) {
  if (!language.toLowerCase().startsWith('en') || !/[\u0900-\u097f]/.test(text)) return text;
  const english = text.replace(/[\u0900-\u097f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return english.length > 8 ? english : 'What is the problem?';
}

function speakWithBrowser(text: string, language: string) {
  if (typeof window.speechSynthesis === 'undefined') return Promise.resolve(false);
  return new Promise<boolean>(resolve => {
    let started = false;
    const speakNow = () => {
      if (started) return;
      started = true;
      const voice = preferredVoice(language);
      if (!voice && voiceCode(language) !== 'en') {
        resolve(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(spokenLine(text, language));
      utterance.lang = voice?.lang || 'en-US';
      utterance.rate = 1;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => emit('speech_started');
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length) speakNow();
    else {
      window.speechSynthesis.addEventListener('voiceschanged', speakNow, {once: true});
      window.setTimeout(speakNow, 350);
    }
  });
}

function playClip(source: string, keep: (clip: HTMLAudioElement) => void) {
  return new Promise<boolean>(resolve => {
    const clip = new Audio(source);
    keep(clip);
    clip.onplay = () => emit('speech_started');
    clip.onended = () => resolve(true);
    clip.onerror = () => resolve(false);
    void clip.play().catch(() => resolve(false));
  });
}

/** Desktop mic. Records in the browser and transcribes on the app API. */
export function createWebVoice(): ReportVoice | undefined {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    return undefined;
  }

  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let spoken: HTMLAudioElement | null = null;
  let levelTimer = 0;
  let stopTimer = 0;
  let settled = false;
  let discard = false;
  let heardSpeech = false;
  let quietSince = 0;
    let resolveListen: ((value: {text: string; confidence?: number} | null) => void) | null = null;
  let rejectListen: ((error: {code: string; message?: string}) => void) | null = null;

  const stopMeter = () => {
    window.clearInterval(levelTimer);
    window.clearTimeout(stopTimer);
    levelTimer = 0;
    stopTimer = 0;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    void audioContext?.close();
    audioContext = null;
  };

  const finish = (value: {text: string; confidence?: number} | null, error?: {code: string; message?: string}) => {
    if (settled) return;
    settled = true;
    const resolve = resolveListen;
    const reject = rejectListen;
    resolveListen = null;
    rejectListen = null;
    recorder = null;
    stopMeter();
    if (error) reject?.(error);
    else resolve?.(value);
  };

  const transcribe = async (blob: Blob, language: string) => {
    emit('processing');
    try {
      const audio = await audioBase64(blob);
      const result = await post<{text: string}>('/ai/transcribe', {audio, language: reportLanguage(language)});
      finish(result.text?.trim() ? {text: result.text.trim().slice(0, 500), confidence: 1} : null);
    } catch (error) {
      const message = (error as {response?: {data?: {message?: string}}})?.response?.data?.message;
      finish(null, {code: 'VOICE_NETWORK', message});
    }
  };

  return {
    prepare: async () => true,
    listen(language: string) {
      if (recorder) return Promise.reject({code: 'VOICE_BUSY'});
      settled = false;
      discard = false;
      const capture = navigator.mediaDevices.getUserMedia({audio: true});
      return new Promise((resolve, reject) => {
        resolveListen = resolve;
        rejectListen = reject;
        capture.then(next => {
          if (settled || discard) {
            next.getTracks().forEach(track => track.stop());
            return;
          }
          stream = next;
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
          const session = new MediaRecorder(next, mimeType ? {mimeType} : undefined);
          const chunks: Blob[] = [];
          recorder = session;
          session.ondataavailable = event => {
            if (event.data.size) chunks.push(event.data);
          };
          session.onstop = () => {
            const blob = new Blob(chunks, {type: session.mimeType || 'audio/webm'});
            if (discard || blob.size < 400) finish(null);
            else void transcribe(blob, language);
          };
          try {
            const context = new AudioContext();
            audioContext = context;
            const source = context.createMediaStreamSource(next);
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const samples = new Uint8Array(analyser.fftSize);
            levelTimer = window.setInterval(() => {
              analyser.getByteTimeDomainData(samples);
              let energy = 0;
              for (const sample of samples) {
                const centered = (sample - 128) / 128;
                energy += centered * centered;
              }
              const level = Math.min(1, Math.sqrt(energy / samples.length) * 4);
              emit('level', undefined, level);
              const now = Date.now();
              if (level > 0.12) {
                heardSpeech = true;
                quietSince = 0;
              } else if (heardSpeech) {
                quietSince = quietSince || now;
                if (now - quietSince > 700 && session.state === 'recording') session.stop();
              }
            }, 120);
          } catch {
            /* The meter is optional. Recording still works. */
          }
          session.start(200);
          emit('ready');
          heardSpeech = false;
          quietSince = 0;
          stopTimer = window.setTimeout(() => {
            if (session.state === 'recording') session.stop();
          }, 20000);
        }).catch((error: {name?: string}) => {
          const blocked = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError' || error?.name === 'SecurityError';
          finish(null, blocked
            ? {code: 'VOICE_PERMISSION'}
            : {code: 'VOICE_UNAVAILABLE', message: error?.name === 'NotFoundError'
              ? 'No microphone was found on this computer.'
              : 'The microphone could not start. Click the lock icon in the address bar, set Microphone to Allow, and try again.'});
        });
      });
    },
    stopListening() {
      if (recorder?.state === 'recording') recorder.stop();
    },
    async speak(text: string, language: string) {
      const heard = await speakWithBrowser(text, speechLanguage(language));
      if (heard) return true;
      try {
        const audio = await spokenAudio(text, language);
        if (audio == null) return false;
        if (audio) {
          window.speechSynthesis?.cancel();
          return playClip(spokenDataUrl(audio), clip => { spoken = clip; });
        }
      } catch {
        /* A missing computer voice is the only reason to wait for the remote voice. */
      }
      return false;
    },
    cancel() {
      invalidateSpoken();
      discard = true;
      spoken?.pause();
      spoken = null;
      window.speechSynthesis?.cancel();
      if (recorder?.state === 'recording') {
        recorder.stop();
        return;
      }
      if (resolveListen || rejectListen) finish(null);
    },
  };
}
