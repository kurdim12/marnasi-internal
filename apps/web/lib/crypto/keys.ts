/**
 * Identity keys + X3DH primitives.
 *
 * - Identity key: long-term X25519 keypair, generated at signup.
 * - Signed prekey: X25519 keypair signed by the identity key (Ed25519 sig);
 *   rotated every 30 days.
 * - One-time prekeys: 100 X25519 keypairs, consumed by senders.
 *
 * All private material lives in IndexedDB encrypted at rest with a KEK
 * derived from the user's password (PBKDF2 600k iters).
 */
import { x25519, ed25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { randomBytes } from '@noble/hashes/utils';
import { toBase64, fromBase64, utf8, concatBytes } from './encoding';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IdentityBundle {
  identity: KeyPair;        // X25519
  signing: KeyPair;         // Ed25519 (separate from identity — cleaner)
  signedPrekey: KeyPair;    // X25519
  signedPrekeySig: Uint8Array;
  oneTimePrekeys: KeyPair[];
}

export interface PublicBundle {
  identityPubkey: string;
  signingPubkey: string;
  signedPrekey: string;
  signedPrekeySig: string;
  oneTimePrekeys: string[];
}

export function generateX25519(): KeyPair {
  const privateKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function generateEd25519(): KeyPair {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function signWithEd25519(privKey: Uint8Array, msg: Uint8Array): Uint8Array {
  return ed25519.sign(msg, privKey);
}

export function verifyEd25519(pubKey: Uint8Array, msg: Uint8Array, sig: Uint8Array): boolean {
  return ed25519.verify(sig, msg, pubKey);
}

export function generateIdentity(prekeyCount = 100): IdentityBundle {
  const identity = generateX25519();
  const signing = generateEd25519();
  const signedPrekey = generateX25519();
  const signedPrekeySig = signWithEd25519(signing.privateKey, signedPrekey.publicKey);
  const oneTimePrekeys = Array.from({ length: prekeyCount }, () => generateX25519());
  return { identity, signing, signedPrekey, signedPrekeySig, oneTimePrekeys };
}

export function toPublicBundle(b: IdentityBundle): PublicBundle {
  return {
    identityPubkey: toBase64(b.identity.publicKey),
    signingPubkey: toBase64(b.signing.publicKey),
    signedPrekey: toBase64(b.signedPrekey.publicKey),
    signedPrekeySig: toBase64(b.signedPrekeySig),
    oneTimePrekeys: b.oneTimePrekeys.map((kp) => toBase64(kp.publicKey)),
  };
}

// ============================================================
// X3DH-lite shared secret derivation
// Sender knows: their identity priv, their ephemeral priv,
//               recipient identity pub, recipient signed prekey pub,
//               recipient one-time prekey pub (optional).
// ============================================================
export function deriveX3DHSender(args: {
  senderIdentityPriv: Uint8Array;
  senderEphemeralPriv: Uint8Array;
  recipientIdentityPub: Uint8Array;
  recipientSignedPrekeyPub: Uint8Array;
  recipientOneTimePrekeyPub?: Uint8Array;
}): Uint8Array {
  const dh1 = x25519.getSharedSecret(args.senderIdentityPriv, args.recipientSignedPrekeyPub);
  const dh2 = x25519.getSharedSecret(args.senderEphemeralPriv, args.recipientIdentityPub);
  const dh3 = x25519.getSharedSecret(args.senderEphemeralPriv, args.recipientSignedPrekeyPub);
  const inputs = args.recipientOneTimePrekeyPub
    ? concatBytes(dh1, dh2, dh3, x25519.getSharedSecret(args.senderEphemeralPriv, args.recipientOneTimePrekeyPub))
    : concatBytes(dh1, dh2, dh3);
  return hkdf(sha256, inputs, utf8('maranasi-x3dh-v1'), utf8('chat-room-key'), 32);
}

export function deriveX3DHReceiver(args: {
  recipientIdentityPriv: Uint8Array;
  recipientSignedPrekeyPriv: Uint8Array;
  recipientOneTimePrekeyPriv?: Uint8Array;
  senderIdentityPub: Uint8Array;
  senderEphemeralPub: Uint8Array;
}): Uint8Array {
  const dh1 = x25519.getSharedSecret(args.recipientSignedPrekeyPriv, args.senderIdentityPub);
  const dh2 = x25519.getSharedSecret(args.recipientIdentityPriv, args.senderEphemeralPub);
  const dh3 = x25519.getSharedSecret(args.recipientSignedPrekeyPriv, args.senderEphemeralPub);
  const inputs = args.recipientOneTimePrekeyPriv
    ? concatBytes(dh1, dh2, dh3, x25519.getSharedSecret(args.recipientOneTimePrekeyPriv, args.senderEphemeralPub))
    : concatBytes(dh1, dh2, dh3);
  return hkdf(sha256, inputs, utf8('maranasi-x3dh-v1'), utf8('chat-room-key'), 32);
}

// ============================================================
// Hybrid encryption: encrypt arbitrary bytes to a recipient X25519 pubkey
// (used for: anonymous reports → HR pubkey; payslips → employee pubkey)
//
// Output: { ephemeralPubkey, iv, ciphertext, wrappedKey? }
// Algorithm: generate ephemeral X25519 key → ECDH → HKDF → AES-256-GCM.
// ============================================================
export async function hybridEncryptToPubkey(plaintext: Uint8Array, recipientPubkey: Uint8Array): Promise<{
  ephemeralPubkey: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}> {
  const eph = generateX25519();
  const shared = x25519.getSharedSecret(eph.privateKey, recipientPubkey);
  const key = hkdf(sha256, shared, utf8('maranasi-hybrid-v1'), utf8('encrypt-to-pubkey'), 32);
  const aesKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext));
  return { ephemeralPubkey: eph.publicKey, iv, ciphertext: ct };
}

export async function hybridDecryptFromPubkey(args: {
  ephemeralPubkey: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  recipientPrivkey: Uint8Array;
}): Promise<Uint8Array> {
  const shared = x25519.getSharedSecret(args.recipientPrivkey, args.ephemeralPubkey);
  const key = hkdf(sha256, shared, utf8('maranasi-hybrid-v1'), utf8('encrypt-to-pubkey'), 32);
  const aesKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: args.iv }, aesKey, args.ciphertext));
  return pt;
}

// ============================================================
// Wrap/unwrap an AES-256 room key for a single recipient using their pubkey.
// (used at room creation + key rotation)
// ============================================================
export async function wrapRoomKey(roomKey: Uint8Array, recipientPubkey: Uint8Array): Promise<string> {
  const out = await hybridEncryptToPubkey(roomKey, recipientPubkey);
  // Encode as a single base64 string: eph || iv || ct
  return toBase64(concatBytes(out.ephemeralPubkey, out.iv, out.ciphertext));
}

export async function unwrapRoomKey(wrapped: string, recipientPrivkey: Uint8Array): Promise<Uint8Array> {
  const bytes = fromBase64(wrapped);
  // eph=32 bytes, iv=12 bytes
  const ephemeralPubkey = bytes.slice(0, 32);
  const iv = bytes.slice(32, 44);
  const ciphertext = bytes.slice(44);
  return hybridDecryptFromPubkey({ ephemeralPubkey, iv, ciphertext, recipientPrivkey });
}

// ============================================================
// Generate a random AES-256 room key (as raw bytes)
// ============================================================
export function generateRoomKey(): Uint8Array {
  return randomBytes(32);
}
