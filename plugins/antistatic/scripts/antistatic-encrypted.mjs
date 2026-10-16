#!/usr/bin/env node
// Antistatic encrypted wargames: end-to-end encryption between you and the
// site. Every MCP call for an encrypted run goes through this script, which
// encrypts its text with your key and decrypts what comes back. The server
// keeps only ciphertext; your recovery phrase and key never leave this
// machine.
//
// Usage (arguments and text go on stdin, never the command line, so they
// stay out of shell history):
//   antistatic-encrypted.mjs login                 save URL and API token (prompts)
//   antistatic-encrypted.mjs init                  set up encryption: prints a new recovery phrase once
//   antistatic-encrypted.mjs unlock                save the key on this machine (prompts for the phrase)
//   antistatic-encrypted.mjs lock                  delete the saved key
//   antistatic-encrypted.mjs status
//   antistatic-encrypted.mjs call <tool> [--json] [@args.json]   JSON arguments on stdin (or in a file)
//   antistatic-encrypted.mjs encrypt               stdin -> a token
//   antistatic-encrypted.mjs decrypt               stdin -> stdout
//
// Env: ANTISTATIC_URL (default https://antistatic.exchange), ANTISTATIC_TOKEN
// (a personal API token from /users/settings), ANTISTATIC_CONFIG_DIR
// (default ~/.config/antistatic). ANTISTATIC_PHRASE answers the recovery
// phrase prompt, and ANTISTATIC_SKIP_CONFIRM=1 skips init's retyping of
// two of its words, for scripts and tests only.
//
// Zero dependencies; Node >= 18.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";

globalThis.crypto ??= webcrypto;

import {
  FORMAT,
  splitTokens,
  decrypt,
  encrypt,
  fingerprint,
  fromB64,
  importKeys,
  newSetup,
  toB64,
  unlockRaw,
  verify,
} from "./private-crypto.mjs";
import { encryptCall } from "./private-fields.mjs";
import { CONFIRM_WORDS } from "./recovery-phrase.mjs";

export { encryptCall };

const te = new TextEncoder();

// A client-chosen id (a turn_id) made opaque: t + 32 hex of an HMAC under
// the key, the same for the same id. An id already in that form (the
// server's echo of one) is kept.
export async function opaqueId(keys, id) {
  if (/^t[0-9a-f]{32}$/.test(id)) return id;
  const mac = new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", keys.iv, te.encode(`antistatic/${FORMAT}/opaque\0${id}`)));
  return "t" + [...mac.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SENTENCE_END = /[.!?…][)\]"'’”»]*$/u;

// Every enc2 token in text, decrypted ("🔒" when it isn't this key's). The
// server ends a sentence after a token with "."; a plaintext that already
// ends one keeps its own.
export async function decryptText(keys, text) {
  const plain = new Map();
  let out = "";
  let ended = false;
  for (const piece of splitTokens(text)) {
    if (piece.text !== undefined) {
      out += ended && piece.text.startsWith(".") ? piece.text.slice(1) : piece.text;
      ended = false;
    } else {
      if (!plain.has(piece.token)) plain.set(piece.token, await decrypt(keys, piece.token).catch(() => "🔒"));
      out += plain.get(piece.token);
      ended = SENTENCE_END.test(plain.get(piece.token));
    }
  }
  return out;
}

export async function decryptDeep(keys, value) {
  if (typeof value === "string") return value.includes("enc2:") ? decryptText(keys, value) : value;
  if (Array.isArray(value)) return Promise.all(value.map((v) => decryptDeep(keys, v)));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value))
      out[k.includes("enc2:") ? await decryptText(keys, k) : k] = await decryptDeep(keys, v);
    return out;
  }
  return value;
}

// ── config ──────────────────────────────────────────────────────────────

const configDir = () => process.env.ANTISTATIC_CONFIG_DIR || path.join(os.homedir(), ".config", "antistatic");
const configFile = () => path.join(configDir(), "private.json");
const keysFile = () => path.join(configDir(), "private-keys.json");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(file), 0o700);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function settings() {
  const saved = readJson(configFile());
  const url = (process.env.ANTISTATIC_URL || saved.url || "https://antistatic.exchange").replace(/\/+$/, "");
  const token = process.env.ANTISTATIC_TOKEN || (saved.url === url || !saved.url ? saved.token : null);
  return { url, token };
}

// Saved keys, by site and account: {"<url> <user id>": {fp, enc, iv}}.
const slot = (url, userId) => `${url} ${userId}`;

// The saved keys for the token's account, checked against its setup.
async function savedKeys(url, token) {
  const setup = await setupOf(url, token);
  if (!setup.salt) throw new Error("Not set up yet: run `antistatic-encrypted.mjs init` in your own terminal.");
  const raw = readJson(keysFile())[slot(url, setup.user_id)];
  if (!raw || raw.fp !== (await fingerprint(setup.check)))
    throw new Error("Locked for this account: run `antistatic-encrypted.mjs unlock` in your own terminal.");
  const keys = await importKeys({ enc: fromB64(raw.enc), iv: fromB64(raw.iv) }, setup.user_id);
  if (!(await verify(keys, setup.check))) throw new Error("The saved key isn't this account's: run `unlock`.");
  return keys;
}

async function saveKey(url, setup, raw) {
  const all = readJson(keysFile());
  all[slot(url, setup.user_id)] = { fp: await fingerprint(setup.check), enc: toB64(raw.enc), iv: toB64(raw.iv) };
  writeJson(keysFile(), all);
}

// ── prompts ─────────────────────────────────────────────────────────────

function readHidden(question) {
  if (process.env.ANTISTATIC_PHRASE != null && /phrase/i.test(question))
    return Promise.resolve(process.env.ANTISTATIC_PHRASE);
  const input = process.stdin;
  if (!input.isTTY) return Promise.reject(new Error("Run this in your own terminal: it asks for your recovery phrase."));
  return new Promise((resolve, reject) => {
    process.stderr.write(question);
    let value = "";
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    const done = (err) => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      process.stderr.write("\n");
      err ? reject(err) : resolve(value);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return done();
        if (ch === "\u0003") return done(new Error("Cancelled."));
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    input.on("data", onData);
  });
}

// Words 2 and 5 of the phrase, retyped (any case, hyphens optional).
export async function confirmWords(phrase, ask = readHidden) {
  const words = phrase.split(" ");
  const norm = (w) => String(w).trim().toLowerCase().replaceAll("-", "");
  for (const n of CONFIRM_WORDS)
    if (norm(await ask(`Word ${n}: `)) !== norm(words[n - 1]))
      throw new Error("That word doesn't match; nothing was saved. Run init again for a new phrase.");
}

// ── MCP ─────────────────────────────────────────────────────────────────

let rpcId = 0;
// A turn's planning can take minutes; past this the call is abandoned.
const RPC_TIMEOUT_MS = 10 * 60 * 1000;

// fetch says only "fetch failed": name the cause (refused, reset, timed out).
export function fetchError(e, url, tool) {
  if (e?.name === "TimeoutError") return `${tool}: no answer from ${url} in ${RPC_TIMEOUT_MS / 60000} minutes`;
  const c = e?.cause;
  const why = [c?.code, c?.message].filter(Boolean).join(" ");
  return `${tool}: request to ${url} failed${why ? ` (${why})` : e?.message ? ` (${e.message})` : ""}`;
}

export async function rpc(url, token, tool, args) {
  if (!token) throw new Error("No API token: set ANTISTATIC_TOKEN or run `antistatic-encrypted.mjs login`.");
  const res = await fetch(url + "/mcp", {
    method: "POST",
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: "Bearer " + token,
      "user-agent": "antistatic-private/1",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name: tool, arguments: args } }),
  }).catch((e) => {
    throw new Error(fetchError(e, url, tool));
  });
  const body = await res.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error_description || data.error || body.slice(0, 300)}`);
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

// A result's text, decrypted. Text that is (or ends in) JSON is parsed,
// decrypted field by field and re-serialised, so plaintext with quotes or
// newlines keeps it valid JSON.
export async function decryptResult(keys, text) {
  const at = text.search(/^[[{]/m);
  if (at >= 0) {
    let parsed;
    try {
      parsed = JSON.parse(text.slice(at));
    } catch {
      parsed = undefined;
    }
    if (parsed !== undefined) {
      const head = await decryptText(keys, text.slice(0, at));
      const compact = !text.slice(at).includes("\n");
      return head + JSON.stringify(await decryptDeep(keys, parsed), null, compact ? 0 : 2);
    }
  }
  return decryptText(keys, text);
}

const resultText = (result) => (result.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");

// ── commands ────────────────────────────────────────────────────────────

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function setupOf(url, token) {
  const r = await rpc(url, token, "antistatic_private_setup", {});
  if (r.isError) throw new Error(resultText(r));
  const setup = r.structuredContent || JSON.parse(resultText(r));
  if (setup.salt && setup.version !== FORMAT)
    throw new Error(`This account uses encryption format ${setup.version}; update the plugin.`);
  return setup;
}

async function readArgs(file) {
  if (file) return JSON.parse(fs.readFileSync(file.replace(/^@/, ""), "utf8"));
  if (process.stdin.isTTY) throw new Error("Pass the JSON arguments on stdin (or @file), not on the command line.");
  const text = (await readStdin()).trim();
  return text ? JSON.parse(text) : {};
}

const commands = {
  async login() {
    const url = (process.env.ANTISTATIC_URL || "https://antistatic.exchange").replace(/\/+$/, "");
    const token = process.env.ANTISTATIC_TOKEN || (await readHidden(`API token for ${url} (from /users/settings): `));
    writeJson(configFile(), { url, token: token.trim() });
    console.log(`Saved for ${url}.`);
  },

  async init() {
    const { url, token } = settings();
    const setup = await setupOf(url, token);
    if (setup.salt) throw new Error("Encryption is already set up for this account: run `unlock`.");
    const made = await newSetup(setup.user_id);
    // The phrase first; nothing is stored until two of its words come back.
    console.log(
      `Recovery phrase (shown once; write it down):\n\n  ${made.phrase}\n\nIt unlocks your encrypted runs on the site and other machines. Antistatic doesn't have it and can't recover it.\n`,
    );
    if (process.env.ANTISTATIC_SKIP_CONFIRM !== "1") await confirmWords(made.phrase);
    const sent = { salt: made.salt, wrapped: made.wrapped, check: made.check, version: made.version };
    const r = await rpc(url, token, "antistatic_private_setup", sent);
    if (r.isError) throw new Error(resultText(r));
    await saveKey(url, { ...setup, ...sent }, made.raw);
    console.log("Set up and unlocked.");
  },

  async unlock() {
    const { url, token } = settings();
    const setup = await setupOf(url, token);
    if (!setup.salt) throw new Error("Not set up yet: run `init`.");
    await saveKey(url, setup, await unlockRaw(await readHidden("Recovery phrase: "), setup));
    console.log("Unlocked.");
  },

  async lock() {
    const { url } = settings();
    const all = readJson(keysFile());
    for (const k of Object.keys(all)) if (k.startsWith(url + " ")) delete all[k];
    writeJson(keysFile(), all);
    console.log("Locked.");
  },

  async status() {
    const { url, token } = settings();
    let state = "locked";
    try {
      await savedKeys(url, token);
      state = "unlocked";
    } catch (e) {
      if (/Not set up/.test(e.message)) state = "not set up; run init";
      else if (!/Locked|isn't this account's/.test(e.message)) state = e.message;
    }
    console.log(`${url} · token ${token ? "set" : "missing"} · ${state}`);
  },

  async call(tool, ...rest) {
    if (!tool) throw new Error("call <tool> [--json] [@file], arguments on stdin");
    const json = rest.includes("--json");
    const file = rest.find((a) => a.startsWith("@"));
    if (rest.some((a) => !a.startsWith("@") && a !== "--json"))
      throw new Error("Pass the JSON arguments on stdin (or @file), not on the command line.");
    const { url, token } = settings();
    const keys = await savedKeys(url, token);
    const args = await encryptCall(tool, await readArgs(file), (t) => encrypt(keys, t), (id) => opaqueId(keys, id));
    const result = await rpc(url, token, tool, args);
    if (result.isError) {
      console.error(await decryptText(keys, resultText(result)));
      process.exitCode = 1;
    } else if (json) console.log(JSON.stringify(await decryptDeep(keys, result.structuredContent ?? null), null, 2));
    else console.log(await decryptResult(keys, resultText(result)));
  },

  async encrypt() {
    const { url, token } = settings();
    const keys = await savedKeys(url, token);
    console.log(await encrypt(keys, await readStdin()));
  },

  async decrypt() {
    const { url, token } = settings();
    const keys = await savedKeys(url, token);
    process.stdout.write(await decryptText(keys, await readStdin()));
  },
};

export async function main([cmd, ...args]) {
  const run = commands[cmd];
  if (!run) {
    console.error("usage: antistatic-encrypted.mjs login|init|unlock|lock|status|call <tool> [--json] [@file] (JSON on stdin)|encrypt|decrypt");
    process.exitCode = 2;
    return;
  }
  try {
    await run(...args);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

const isMain = () => {
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
};
if (process.argv[1] && isMain()) main(process.argv.slice(2));
