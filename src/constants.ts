// API Configuration
export const FLUX_KONTEXT_API_URL = 'https://api.fluxkontext.com/v1/generate';
export const FLUX_KONTEXT_API_KEY = import.meta.env.VITE_FLUX_KONTEXT_API_KEY || '';

// Recording Configuration
export const MAX_RECORDING_TIME_MS = 30 * 1000; // 30 seconds
export const SPEECH_LANG = 'en-US';

// Media Configuration
export const VIDEO_CONSTRAINTS = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  },
  audio: true
};