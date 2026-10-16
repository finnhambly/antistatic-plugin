// Private mode's recovery phrase: 6 words drawn uniformly from the EFF large
// list (wordlist.mjs: 7776 words, 77.5 bits), shown lowercase with spaces
// between them (four list words have hyphens, such as t-shirt). Generated on the
// user's device; never sent. Users don't pick their own. Shared by the
// private CLI (antistatic-private.mjs) and the browser, via private-crypto.mjs.
import { WORDS } from "./wordlist.mjs";

export const PHRASE_WORDS = 6;
// The words Settings asks to retype (1-based).
export const CONFIRM_WORDS = [2, 5];
// Words are compared without hyphens: the list has both "yo-yo" and "yoyo",
// and either spelling of a hyphenated word must give the same key.
const canon = (w) => w.replaceAll("-", "");
const INDEX = new Set(WORDS.map(canon));
const HYPHENATED = new Set(WORDS.filter((w) => w.includes("-")));
const MAX_PARTS = Math.max(...WORDS.map((w) => w.split("-").length));

// A uniform index below n: rejection sampling over 32-bit draws, so no
// modulo bias for any n.
export function randomIndex(n, rng = globalThis.crypto) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    rng.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

export function generatePhrase(rng = globalThis.crypto) {
  return Array.from({ length: PHRASE_WORDS }, () => WORDS[randomIndex(WORDS.length, rng)]).join(" ");
}

function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// The closest word in the list by edit distance (ties: the one sharing the
// longest start), when close enough to be a typo.
export function suggestWord(word) {
  const w = word.toLowerCase();
  const shared = (x) => {
    let i = 0;
    while (i < x.length && x[i] === w[i]) i++;
    return i;
  };
  let best = null;
  let bestD = Infinity;
  for (const x of WORDS) {
    const d = distance(w, x);
    if (d < bestD || (d === bestD && shared(x) > shared(best))) [best, bestD] = [x, d];
  }
  return bestD <= Math.max(1, Math.floor(w.length / 3)) ? best : null;
}

// The list word (without hyphens) that atoms[i..i+n) spell: one atom, or
// the n parts of a hyphenated word. Null when none.
function wordAt(atoms, i, n) {
  if (n === 1) return INDEX.has(atoms[i]) ? atoms[i] : null;
  const parts = atoms.slice(i, i + n);
  return HYPHENATED.has(parts.join("-")) ? parts.join("") : null;
}

// Any case; dashes, commas, dots or whitespace between words. Hyphenated
// list words match with or without their hyphen. {phrase} (the words without
// hyphens, joined by single spaces: what the key is derived from) or {error}.
export function parsePhrase(input) {
  const atoms = String(input ?? "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  // best[i]: the fewest words that spell atoms[i..], as a list (null: none).
  const best = new Array(atoms.length + 1).fill(null);
  best[atoms.length] = [];
  for (let i = atoms.length - 1; i >= 0; i--) {
    for (let n = 1; n <= MAX_PARTS && i + n <= atoms.length; n++) {
      const w = wordAt(atoms, i, n);
      const rest = best[i + n];
      if (w && rest && (!best[i] || rest.length + 1 < best[i].length)) best[i] = [w, ...rest];
    }
  }
  if (!best[0]) {
    // The first atom that isn't a word or part of one.
    const covered = (j) => wordAt(atoms, j, 1) || (j > 0 && wordAt(atoms, j - 1, 2)) || wordAt(atoms, j, 2);
    const bad = atoms.find((_, j) => !covered(j)) ?? atoms[0];
    const s = suggestWord(bad);
    return { error: `Not a word in the list: ${bad}${s ? ` (${s}?)` : ""}` };
  }
  if (best[0].length !== PHRASE_WORDS)
    return { error: `Needs ${PHRASE_WORDS} words, not ${best[0].length}` };
  return { phrase: best[0].join(" ") };
}
