// Encrypted wargames' crypto, format 2 (docs/encrypted-wargames.md). Shared by the
// CLI (antistatic-encrypted.mjs) and the browser (assets/js/e2e_crypto.js).
// WebCrypto only: globalThis.crypto (the CLI sets it on Node 18).
//
// phrase  6 EFF words, compared without hyphens, joined by spaces (recovery-phrase.mjs)
// master  32 random bytes, made once at setup
// kek     HMAC-SHA256(PBKDF2-SHA256(phrase, salt 16 bytes, 600000), "antistatic/2/wrap")
// wrapped "wrap2:" + base64(iv 12 || AES-256-GCM(kek, master; aad)), 60 bytes
// enc,ivk HMAC-SHA256(master, "antistatic/2/enc" | "antistatic/2/iv")
// token   "enc2:" + base64(iv 12 || AES-256-GCM(enc, padded; aad)), with
//         padded = uint32 length || utf-8 text || zeros, to a bucket (BUCKETS),
//         iv = HMAC-SHA256(ivk, aad || 0 || text)[0..12): equal text in one
//         account, equal token.
// aad     "antistatic/2/<user id>": a token or wrapped key opens only for the
//         account it was made for.
// check   the token of "antistatic": the server keeps salt, wrapped and check.
import { generatePhrase, parsePhrase } from "./recovery-phrase.mjs";

export const FORMAT = 2;
export const ITERATIONS = 600000;
export const CHECK_TEXT = "antistatic";
// Padded plaintext sizes: powers of two from 32 bytes, then 64 KiB steps.
export const MIN_BUCKET = 32;
const STEP = 65536;
export const TOKEN_PREFIX = "enc2:";
export const WRAP_PREFIX = "wrap2:";
export const HANDLE_RE = /§e:([0-9a-f]{32})§/g;

const te = new TextEncoder();
const td = new TextDecoder("utf-8", { fatal: true });
const subtle = () => globalThis.crypto.subtle;
const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

export function bucket(n) {
  if (n <= MIN_BUCKET) return MIN_BUCKET;
  if (n <= STEP) return 2 ** Math.ceil(Math.log2(n));
  return Math.ceil(n / STEP) * STEP;
}

export const isBucket = (n) => n >= MIN_BUCKET && bucket(n) === n;

export function toB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// Strict: canonical base64 only (what toB64 makes), else throws.
export function fromB64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  if (toB64(out) !== b64) throw new Error("not canonical base64");
  return out;
}

const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) out.set(p, at), (at += p.length);
  return out;
};

async function hmac(keyBytes, data) {
  const key = await subtle().importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle().sign("HMAC", key, data));
}

export const aad = (userId) => te.encode(`antistatic/${FORMAT}/${userId}`);

// The key-encryption key from a recovery phrase (as parsePhrase gives it).
export async function deriveKek(phrase, salt, iterations = ITERATIONS) {
  const base = await subtle().importKey("raw", te.encode(phrase), "PBKDF2", false, ["deriveBits"]);
  const km = new Uint8Array(await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 256));
  return hmac(km, te.encode(`antistatic/${FORMAT}/wrap`));
}

export async function wrapMaster(kek, master, userId) {
  const key = await subtle().importKey("raw", kek, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = random(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: aad(userId) }, key, master));
  return WRAP_PREFIX + toB64(concat(iv, ct));
}

// Throws on a wrong key or account.
export async function unwrapMaster(kek, wrapped, userId) {
  if (!wrapped?.startsWith(WRAP_PREFIX)) throw new Error("not a wrap2 key");
  const bytes = fromB64(wrapped.slice(WRAP_PREFIX.length));
  if (bytes.length !== 60) throw new Error("not a wrap2 key");
  const key = await subtle().importKey("raw", kek, { name: "AES-GCM" }, false, ["decrypt"]);
  return new Uint8Array(
    await subtle().decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: aad(userId) }, key, bytes.slice(12)),
  );
}

// The raw subkeys {enc, iv} (32 bytes each) of a master key.
export async function contentKeys(master) {
  return {
    enc: await hmac(master, te.encode(`antistatic/${FORMAT}/enc`)),
    iv: await hmac(master, te.encode(`antistatic/${FORMAT}/iv`)),
  };
}

// Usable keys from raw subkeys, for one account.
export async function importKeys(raw, userId) {
  if (userId == null) throw new Error("importKeys needs the account's user id");
  return {
    userId: String(userId),
    aes: await subtle().importKey("raw", raw.enc, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]),
    iv: await subtle().importKey("raw", raw.iv, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
  };
}

export async function encrypt(keys, text) {
  const data = te.encode(text);
  const ad = aad(keys.userId);
  const padded = new Uint8Array(bucket(4 + data.length));
  new DataView(padded.buffer).setUint32(0, data.length);
  padded.set(data, 4);
  const iv = new Uint8Array(await subtle().sign("HMAC", keys.iv, concat(ad, new Uint8Array([0]), data))).slice(0, 12);
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: ad }, keys.aes, padded));
  return TOKEN_PREFIX + toB64(concat(iv, ct));
}

// The token's bytes, or throws when it isn't a well-formed enc2 token.
export function tokenBytes(token) {
  if (typeof token !== "string" || !token.startsWith(TOKEN_PREFIX)) throw new Error("not an enc2 token");
  const bytes = fromB64(token.slice(TOKEN_PREFIX.length));
  if (!isBucket(bytes.length - 28)) throw new Error("not an enc2 token");
  return bytes;
}

// Whether a string is a well-formed enc2 token.
export function isToken(s) {
  try {
    tokenBytes(s);
    return true;
  } catch {
    return false;
  }
}

// Text split into [{text}, {token}] pieces. A token is "enc2:" and the
// longest run of base64 after it that is a well-formed token, so a token
// may sit right against other text ("enc2:…36enc2:…" is two tokens around
// "36"). A malformed one stays text.
export function splitTokens(text) {
  const out = [];
  let rest = text;
  for (;;) {
    const at = rest.indexOf(TOKEN_PREFIX);
    if (at < 0) break;
    const run = /^[A-Za-z0-9+/]*={0,2}/.exec(rest.slice(at + TOKEN_PREFIX.length))[0];
    let len = 0;
    for (let b = MIN_BUCKET, lens = []; ; b = b < STEP ? b * 2 : b + STEP) {
      const l = 4 * Math.ceil((28 + b) / 3);
      if (l > run.length) {
        len = lens.reverse().find((l) => isToken(TOKEN_PREFIX + run.slice(0, l))) ?? 0;
        break;
      }
      lens.push(l);
    }
    const end = at + TOKEN_PREFIX.length + (len || run.length);
    if (at > 0) out.push({ text: rest.slice(0, at) });
    out.push(len ? { token: rest.slice(at, end) } : { text: rest.slice(at, end) });
    rest = rest.slice(end);
  }
  if (rest) out.push({ text: rest });
  return out;
}

// The padded size of a token's text (its length is somewhere below it).
export const paddedSize = (token) => tokenBytes(token).length - 28;

// Throws when the token isn't this key's (or this account's).
export async function decrypt(keys, token) {
  const bytes = tokenBytes(token);
  const pt = new Uint8Array(
    await subtle().decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: aad(keys.userId) },
      keys.aes,
      bytes.slice(12),
    ),
  );
  const len = new DataView(pt.buffer).getUint32(0);
  if (len > pt.length - 4 || pt.slice(4 + len).some((b) => b !== 0)) throw new Error("bad padding");
  return td.decode(pt.slice(4, 4 + len));
}

// Whether keys open the account's check token.
export async function verify(keys, check) {
  try {
    return (await decrypt(keys, check)) === CHECK_TEXT;
  } catch {
    return false;
  }
}

// A key's fingerprint: 16 hex of sha256 over the check token it opens.
export async function fingerprint(check) {
  const d = new Uint8Array(await subtle().digest("SHA-256", te.encode(check)));
  return [...d.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// A new setup for an account: {phrase, salt, wrapped, check, version} (all
// but the phrase go to the server) and raw, the content keys.
export async function newSetup(userId, iterations = ITERATIONS) {
  const phrase = generatePhrase();
  const parsed = parsePhrase(phrase);
  const salt = random(16);
  const master = random(32);
  const wrapped = await wrapMaster(await deriveKek(parsed.phrase, salt, iterations), master, userId);
  const raw = await contentKeys(master);
  const check = await encrypt(await importKeys(raw, userId), CHECK_TEXT);
  return { phrase, salt: toB64(salt), wrapped, check, version: FORMAT, raw };
}

// The content keys for a typed phrase and the server's setup ({user_id,
// salt, wrapped, check, version}). Throws Error with a short message.
export async function unlockRaw(input, setup, iterations = ITERATIONS) {
  if (setup?.version !== FORMAT) throw new Error(`Unknown encryption format ${setup?.version}`);
  const parsed = parsePhrase(input);
  if (parsed.error) throw new Error(parsed.error);
  let master;
  try {
    master = await unwrapMaster(await deriveKek(parsed.phrase, fromB64(setup.salt), iterations), setup.wrapped, setup.user_id);
  } catch {
    throw new Error("Wrong recovery phrase");
  }
  const raw = await contentKeys(master);
  if (!(await verify(await importKeys(raw, setup.user_id), setup.check))) throw new Error("Wrong recovery phrase");
  return raw;
}
