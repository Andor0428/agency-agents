import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWisprAppendMessage,
  buildWisprAuthMessage,
  buildWisprWebSocketUrl,
  extractTranscriptFromMessages,
  pcmChunkVolume,
  splitPcmIntoChunks,
} from './services/wisprFlow/index.js';

describe('Wispr Flow WebSocket helpers', () => {
  it('builds API-key WebSocket URL with Bearer prefix', () => {
    const url = buildWisprWebSocketUrl('fl-test-key');
    assert.match(url, /^wss:\/\/platform-api\.wisprflow\.ai\/api\/v1\/dash\/ws\?api_key=/);
    assert.ok(url.includes(encodeURIComponent('Bearer fl-test-key')));
  });

  it('auth message includes British English context and dictionary', () => {
    const message = buildWisprAuthMessage({
      apiKey: 'fl-test',
      dictionary: ['Belvedere', 'Grey Goose'],
      localeLabel: 'British English UK bar stock take',
    });

    assert.equal(message.type, 'auth');
    assert.deepEqual(message.language, ['en']);
    assert.equal(
      (message.context as { app: { name: string } }).app.name,
      'Stock Take — British English UK bar stock take'
    );
    assert.deepEqual(
      (message.context as { dictionary_context: string[] }).dictionary_context,
      ['Belvedere', 'Grey Goose']
    );
  });

  it('splits PCM into fixed one-second chunks', () => {
    const pcm = Buffer.alloc(32000 * 3 + 100);
    const chunks = splitPcmIntoChunks(pcm, 16000, 1);
    assert.equal(chunks.length, 4);
    assert.equal(chunks[0]!.length, 32000);
    assert.equal(chunks[3]!.length, 100);
  });

  it('append message encodes base64 PCM with matching volume array', () => {
    const chunk = Buffer.from([0, 0, 255, 127]);
    const message = buildWisprAppendMessage(2, chunk, 1);
    assert.equal(message.type, 'append');
    assert.equal(message.position, 2);
    const packets = (message.audio_packets as { packets: string[]; volumes: number[] }).packets;
    const volumes = (message.audio_packets as { packets: string[]; volumes: number[] }).volumes;
    assert.equal(packets.length, 1);
    assert.equal(volumes.length, 1);
    assert.equal(packets[0], chunk.toString('base64'));
    assert.ok(pcmChunkVolume(chunk) >= 0);
  });

  it('extracts the latest transcript from text responses', () => {
    const result = extractTranscriptFromMessages([
      { status: 'text', body: { text: 'Belvedere', detected_language: 'en' } },
      { status: 'text', final: true, body: { text: 'Belvedere two', detected_language: 'en' } },
    ]);
    assert.equal(result.text, 'Belvedere two');
    assert.equal(result.detectedLanguage, 'en');
  });
});
