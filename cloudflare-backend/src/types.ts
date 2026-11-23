export interface Bindings {
  DB: D1Database;
  BROADCASTER: DurableObjectNamespace;
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  JWT_SECRET: string;
  ENVIRONMENT: string;
  VOICE_API_KEY?: string;
  /** Bhashini Dhruva inference API key — Hindi, English, Dogri and Kashmiri speech. */
  BHASHINI_INFERENCE_API_KEY?: string;
  /** @deprecated alias for BHASHINI_INFERENCE_API_KEY */
  BHASHINI_API_KEY?: string;
  /** Second Dhruva key, tried when the first one is rejected. */
  BHASHINI_API_KEY_FALLBACK?: string;
  /** Google Gemini — Kashmiri TTS */
  GEMINI_API_KEY?: string;
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  name: string;
}

export type Variables = {
  user: UserPayload;
};
