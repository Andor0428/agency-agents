import * as Crypto from 'expo-crypto';

/** React Native–safe UUID v4 (uuid npm package needs global crypto). */
export function createId(): string {
  return Crypto.randomUUID();
}
