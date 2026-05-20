/**
 * IndexedDB key vault for the current user.
 *
 * The KEK derived from the password is held in memory only (cleared on logout).
 * Private key material lives encrypted at rest under that KEK.
 */
import type { IdentityBundle } from './keys';
import { fromBase64, toBase64 } from './encoding';

const DB_NAME = 'maranasi-keys';
const STORE = 'identity';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface StoredIdentity {
  identityPrivB64: string;
  identityPubB64: string;
  signingPrivB64: string;
  signingPubB64: string;
  signedPrekeyPrivB64: string;
  signedPrekeyPubB64: string;
  signedPrekeySigB64: string;
  oneTimePrekeys: { privB64: string; pubB64: string }[];
}

export function serializeIdentity(b: IdentityBundle): StoredIdentity {
  return {
    identityPrivB64: toBase64(b.identity.privateKey),
    identityPubB64: toBase64(b.identity.publicKey),
    signingPrivB64: toBase64(b.signing.privateKey),
    signingPubB64: toBase64(b.signing.publicKey),
    signedPrekeyPrivB64: toBase64(b.signedPrekey.privateKey),
    signedPrekeyPubB64: toBase64(b.signedPrekey.publicKey),
    signedPrekeySigB64: toBase64(b.signedPrekeySig),
    oneTimePrekeys: b.oneTimePrekeys.map((kp) => ({
      privB64: toBase64(kp.privateKey),
      pubB64: toBase64(kp.publicKey),
    })),
  };
}

export function deserializeIdentity(s: StoredIdentity): IdentityBundle {
  return {
    identity: { privateKey: fromBase64(s.identityPrivB64), publicKey: fromBase64(s.identityPubB64) },
    signing: { privateKey: fromBase64(s.signingPrivB64), publicKey: fromBase64(s.signingPubB64) },
    signedPrekey: { privateKey: fromBase64(s.signedPrekeyPrivB64), publicKey: fromBase64(s.signedPrekeyPubB64) },
    signedPrekeySig: fromBase64(s.signedPrekeySigB64),
    oneTimePrekeys: s.oneTimePrekeys.map((p) => ({
      privateKey: fromBase64(p.privB64),
      publicKey: fromBase64(p.pubB64),
    })),
  };
}

export async function storeIdentity(userId: string, identity: StoredIdentity): Promise<void> {
  await tx('readwrite', (s) => s.put(identity, userId));
}

export async function loadIdentity(userId: string): Promise<StoredIdentity | null> {
  const v = await tx<StoredIdentity | undefined>('readonly', (s) => s.get(userId));
  return v ?? null;
}

export async function clearIdentity(userId: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(userId));
}
