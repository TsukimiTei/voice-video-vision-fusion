export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VideoRecorderState {
  isRecording: boolean;
  stream: MediaStream | null;
  error: string | null;
}

export interface GeneratedImageResult {
  imageUrl: string;
  prompt: string;
}