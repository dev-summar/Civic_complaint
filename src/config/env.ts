// Live Cloudflare Edge API and WebSocket configuration for SwachhSetu
export const API_BASE_URL =
  process.env.API_BASE_URL ||
  (typeof window !== 'undefined'
    ? 'https://swachhsetu-api.summar-adm.workers.dev/api/v1'
    : 'https://swachhsetu-api.summar-adm.workers.dev/api/v1');

export const SOCKET_URL =
  process.env.SOCKET_URL ||
  (typeof window !== 'undefined'
    ? 'https://swachhsetu-api.summar-adm.workers.dev'
    : 'https://swachhsetu-api.summar-adm.workers.dev');

export const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
