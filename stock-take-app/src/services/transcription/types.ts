export interface TranscriptionService {
  transcribe(audioUri: string, catalogPrompt: string): Promise<string>;
}

export interface TranscriptionResult {
  text: string;
  provider: string;
}
