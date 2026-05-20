/**
 * Per-message AES-GCM encrypt/decrypt with the room key.
 *
 * AAD binds (roomId, senderId, timestamp) into the auth tag, preventing
 * an attacker from replaying a ciphertext into a different room or under
 * a different sender identity even if they steal it.
 */
import { utf8, fromBase64, toBase64 } from './encoding';

async function roomAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function aad(roomId: string, senderId: string, timestampMs: number): Uint8Array {
  return utf8(`${roomId}|${senderId}|${timestampMs}`);
}

export async function encryptMessage(args: {
  roomKey: Uint8Array;
  roomId: string;
  senderId: string;
  timestampMs: number;
  plaintext: string;
}): Promise<{ ciphertext: string; iv: string }> {
  const key = await roomAesKey(args.roomKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(args.roomId, args.senderId, args.timestampMs) },
    key,
    utf8(args.plaintext),
  );
  return { ciphertext: toBase64(new Uint8Array(ct)), iv: toBase64(iv) };
}

export async function decryptMessage(args: {
  roomKey: Uint8Array;
  roomId: string;
  senderId: string;
  timestampMs: number;
  ciphertextB64: string;
  ivB64: string;
}): Promise<string> {
  const key = await roomAesKey(args.roomKey);
  const pt = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64(args.ivB64),
      additionalData: aad(args.roomId, args.senderId, args.timestampMs),
    },
    key,
    fromBase64(args.ciphertextB64),
  );
  return new TextDecoder().decode(pt);
}
