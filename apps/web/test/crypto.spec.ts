import { describe, it, expect } from 'vitest';
import {
  generateX25519, generateEd25519, signWithEd25519, verifyEd25519,
  generateIdentity, hybridEncryptToPubkey, hybridDecryptFromPubkey,
  wrapRoomKey, unwrapRoomKey, generateRoomKey,
  deriveX3DHSender, deriveX3DHReceiver,
} from '@/lib/crypto/keys';
import { encryptMessage, decryptMessage } from '@/lib/crypto/messages';
import { encryptKeyBundle, decryptKeyBundle } from '@/lib/crypto/kek';
import { utf8, fromUtf8 } from '@/lib/crypto/encoding';

describe('X25519 keypair', () => {
  it('produces 32-byte public key', () => {
    const kp = generateX25519();
    expect(kp.publicKey).toHaveLength(32);
  });
});

describe('Ed25519 sign/verify', () => {
  it('verifies a valid signature', () => {
    const kp = generateEd25519();
    const sig = signWithEd25519(kp.privateKey, utf8('hello'));
    expect(verifyEd25519(kp.publicKey, utf8('hello'), sig)).toBe(true);
  });
});

describe('hybrid encrypt-to-pubkey', () => {
  it('round-trips arbitrary bytes', async () => {
    const recipient = generateX25519();
    const data = utf8('top secret report content');
    const wrapped = await hybridEncryptToPubkey(data, recipient.publicKey);
    const back = await hybridDecryptFromPubkey({
      ephemeralPubkey: wrapped.ephemeralPubkey,
      iv: wrapped.iv,
      ciphertext: wrapped.ciphertext,
      recipientPrivkey: recipient.privateKey,
    });
    expect(fromUtf8(back)).toBe('top secret report content');
  });

  it('rejects wrong recipient', async () => {
    const recipient = generateX25519();
    const attacker = generateX25519();
    const w = await hybridEncryptToPubkey(utf8('secret'), recipient.publicKey);
    await expect(hybridDecryptFromPubkey({
      ephemeralPubkey: w.ephemeralPubkey,
      iv: w.iv,
      ciphertext: w.ciphertext,
      recipientPrivkey: attacker.privateKey,
    })).rejects.toBeTruthy();
  });
});

describe('room key wrap', () => {
  it('round-trips a 32-byte room key', async () => {
    const member = generateX25519();
    const roomKey = generateRoomKey();
    const wrapped = await wrapRoomKey(roomKey, member.publicKey);
    const unwrapped = await unwrapRoomKey(wrapped, member.privateKey);
    expect(unwrapped).toEqual(roomKey);
  });
});

describe('message encryption', () => {
  it('round-trips', async () => {
    const roomKey = generateRoomKey();
    const ctx = { roomKey, roomId: 'R1', senderId: 'U1', timestampMs: 12345 };
    const { ciphertext, iv } = await encryptMessage({ ...ctx, plaintext: 'مرحبا' });
    const back = await decryptMessage({ ...ctx, ciphertextB64: ciphertext, ivB64: iv });
    expect(back).toBe('مرحبا');
  });

  it('AAD binds room+sender+timestamp (tampered context fails)', async () => {
    const roomKey = generateRoomKey();
    const enc = await encryptMessage({ roomKey, roomId: 'R1', senderId: 'U1', timestampMs: 1, plaintext: 'hi' });
    await expect(
      decryptMessage({ roomKey, roomId: 'R2', senderId: 'U1', timestampMs: 1, ciphertextB64: enc.ciphertext, ivB64: enc.iv }),
    ).rejects.toBeTruthy();
  });
});

describe('KEK key bundle', () => {
  it('encrypts and decrypts under same password', async () => {
    const data = utf8(JSON.stringify({ secret: 42 }));
    const bundle = await encryptKeyBundle(data, 'CorrectHorseBattery!1');
    const back = await decryptKeyBundle(bundle, 'CorrectHorseBattery!1');
    expect(JSON.parse(fromUtf8(back))).toEqual({ secret: 42 });
  });

  it('fails with wrong password', async () => {
    const bundle = await encryptKeyBundle(utf8('secret'), 'real-password!');
    await expect(decryptKeyBundle(bundle, 'wrong-password!')).rejects.toBeTruthy();
  }, 30_000);
});

describe('X3DH derivation', () => {
  it('sender and receiver derive identical shared secret', () => {
    const sender = { identity: generateX25519(), ephemeral: generateX25519() };
    const receiver = { identity: generateX25519(), signedPrekey: generateX25519(), oneTimePrekey: generateX25519() };

    const senderSecret = deriveX3DHSender({
      senderIdentityPriv: sender.identity.privateKey,
      senderEphemeralPriv: sender.ephemeral.privateKey,
      recipientIdentityPub: receiver.identity.publicKey,
      recipientSignedPrekeyPub: receiver.signedPrekey.publicKey,
      recipientOneTimePrekeyPub: receiver.oneTimePrekey.publicKey,
    });
    const receiverSecret = deriveX3DHReceiver({
      recipientIdentityPriv: receiver.identity.privateKey,
      recipientSignedPrekeyPriv: receiver.signedPrekey.privateKey,
      recipientOneTimePrekeyPriv: receiver.oneTimePrekey.privateKey,
      senderIdentityPub: sender.identity.publicKey,
      senderEphemeralPub: sender.ephemeral.publicKey,
    });
    expect(senderSecret).toEqual(receiverSecret);
  });
});

describe('identity bundle', () => {
  it('signed prekey signature verifies', () => {
    const b = generateIdentity(5);
    expect(verifyEd25519(b.signing.publicKey, b.signedPrekey.publicKey, b.signedPrekeySig)).toBe(true);
  });
});
