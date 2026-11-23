export type Clip = {audio: string; mime: string};

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

type Wav = {format: number; channels: number; rate: number; bits: number; data: Uint8Array};

function readWav(bytes: Uint8Array): Wav | null {
  if (bytes.length < 44 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let format: Omit<Wav, 'data'> | null = null;
  for (let at = 12; at + 8 <= bytes.length;) {
    const id = ascii(bytes, at, 4);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === 'fmt ') {
      format = {format: view.getUint16(body, true), channels: view.getUint16(body + 2, true), rate: view.getUint32(body + 4, true), bits: view.getUint16(body + 14, true)};
    } else if (id === 'data') {
      return format ? {...format, data: bytes.subarray(body, Math.min(body + size, bytes.length))} : null;
    }
    at = body + size + (size & 1);
  }
  return null;
}

function joinWav(first: Wav, second: Wav): Uint8Array | null {
  if (first.format !== 1 || second.format !== 1 || first.channels !== second.channels
    || first.rate !== second.rate || first.bits !== second.bits) return null;
  const block = first.channels * first.bits / 8;
  const gap = Math.round(first.rate * 0.18) * block;
  const size = first.data.length + gap + second.data.length;
  const out = new Uint8Array(44 + size);
  const view = new DataView(out.buffer);
  out.set([82, 73, 70, 70], 0);
  view.setUint32(4, 36 + size, true);
  out.set([87, 65, 86, 69, 102, 109, 116, 32], 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, first.channels, true);
  view.setUint32(24, first.rate, true);
  view.setUint32(28, first.rate * block, true);
  view.setUint16(32, block, true);
  view.setUint16(34, first.bits, true);
  out.set([100, 97, 116, 97], 36);
  view.setUint32(40, size, true);
  out.set(first.data, 44);
  out.set(second.data, 44 + first.data.length + gap);
  return out;
}

const MPEG1_KBPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_KBPS = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const MPEG1_RATES = [44100, 48000, 32000];

function frameLength(bytes: Uint8Array, at: number) {
  const version = (bytes[at + 1] >> 3) & 3;
  const layer = (bytes[at + 1] >> 1) & 3;
  const bitrateIndex = bytes[at + 2] >> 4;
  const rateIndex = (bytes[at + 2] >> 2) & 3;
  if (version === 1 || layer !== 1 || rateIndex === 3 || !bitrateIndex || bitrateIndex === 15) return 0;
  const mpeg1 = version === 3;
  const rate = MPEG1_RATES[rateIndex] / (mpeg1 ? 1 : version === 2 ? 2 : 4);
  const kbps = (mpeg1 ? MPEG1_KBPS : MPEG2_KBPS)[bitrateIndex];
  return Math.floor((mpeg1 ? 144000 : 72000) * kbps / rate) + ((bytes[at + 2] >> 1) & 1);
}

/** Audio frames only: no ID3 tags, and no Xing/Info frame, whose frame count would cut a joined clip short. */
function mp3Frames(bytes: Uint8Array): Uint8Array | null {
  let start = 0;
  if (ascii(bytes, 0, 3) === 'ID3') {
    start = 10 + ((bytes[6] & 0x7f) << 21 | (bytes[7] & 0x7f) << 14 | (bytes[8] & 0x7f) << 7 | (bytes[9] & 0x7f));
    if (bytes[5] & 0x10) start += 10;
  }
  let end = bytes.length;
  if (end >= 128 && ascii(bytes, end - 128, 3) === 'TAG') end -= 128;
  while (start + 4 < end && !(bytes[start] === 0xff && (bytes[start + 1] & 0xe0) === 0xe0)) start += 1;
  const length = start + 4 < end ? frameLength(bytes, start) : 0;
  if (!length) return null;
  const header = ascii(bytes, start, Math.min(length, 200));
  if (header.includes('Xing') || header.includes('Info')) start += length;
  return start < end ? bytes.subarray(start, end) : null;
}

/** One clip that plays `first` then `second`, or null when the two cannot be joined losslessly. */
export function joinClips(first: Clip, second: Clip): Clip | null {
  const a = fromBase64(first.audio);
  const b = fromBase64(second.audio);
  const wavA = readWav(a);
  const wavB = readWav(b);
  if (wavA && wavB) {
    const joined = joinWav(wavA, wavB);
    return joined ? {audio: toBase64(joined), mime: 'audio/wav'} : null;
  }
  if (wavA || wavB) return null;
  const framesA = mp3Frames(a);
  const framesB = mp3Frames(b);
  if (!framesA || !framesB) return null;
  const joined = new Uint8Array(framesA.length + framesB.length);
  joined.set(framesA, 0);
  joined.set(framesB, framesA.length);
  return {audio: toBase64(joined), mime: 'audio/mpeg'};
}
