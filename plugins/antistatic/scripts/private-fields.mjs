// Private wargames: encrypt a tool call's arguments by the field schema
// (private-fields.json, which the server checks too). Every field of every
// tool a private run may use says whether it is text (encrypted), a
// client-chosen key (encrypted), or a plain format (an enum, a date, a
// number, a server-issued id); anything else is refused.
import fs from "node:fs";

export const SCHEMA = JSON.parse(fs.readFileSync(new URL("./private-fields.json", import.meta.url), "utf8"));

const CRYPTO = new Set(["text", "lines", "key", "opaque", "drop", "unit"]);

// Lines a script's parser reads: its section headings and close stay plain.
export const PLAIN_LINE = /^\s*(\*\*(Results|Elsewhere|Markets|Questions)\*\*|What do you do\?)\s*$/;
// Markdown markers before a line's text: headings, bullets, numbers, quotes.
export const MARKERS = /^(\s*(?:(?:#{1,6}|[-*+]|\d+[.)])\s+|>\s*)*)/;

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function resolve(node, schema = SCHEMA) {
  if (typeof node === "string") {
    if (CRYPTO.has(node)) return { kind: node };
    if (schema.formats[node]) return { format: node, ...schema.formats[node] };
    if (schema.types[node]) return resolve(schema.types[node], schema);
    throw new Error(`schema: unknown kind ${node}`);
  }
  if (Array.isArray(node)) return { union: node };
  if (node.ref) return resolve(schema.types[node.ref], schema);
  return node;
}

function formatFits(f, v) {
  switch (f.type) {
    case "integer":
      return Number.isInteger(v);
    case "number":
      return typeof v === "number" && Number.isFinite(v);
    case "boolean":
      return typeof v === "boolean";
    case "null":
      return v === null;
  }
  return typeof v === "string" && new RegExp(f.pattern).test(v);
}

function fits(n, v) {
  if (n.kind) return typeof v === "string";
  if (n.format) return formatFits(n, v);
  if (n.enum) return n.enum.includes(v);
  if (n.object || n.switch || n.map) return isObject(v);
  if (n.array) return Array.isArray(v);
  if (n.json) return typeof v === "string" && /^\s*[[{]/.test(v);
  return false;
}

function describe(n) {
  if (n.kind) return n.kind === "key" || n.kind === "opaque" ? "a key" : "text";
  if (n.format) return n.format;
  if (n.enum) return `one of ${n.enum.join(", ")}`;
  if (n.array) return "a list";
  if (n.union) return n.union.map((u) => describe(resolve(u))).join(" or ");
  return "an object";
}

// Walks `value` by `node`, calling leaf(kind, string, path) for text, lines
// and key fields and putting what it returns in their place. Throws on a
// field the schema doesn't have or a value that doesn't fit.
export async function walk(node, value, path, leaf, siblings = null, schema = SCHEMA) {
  const n = resolve(node, schema);
  if (n.union) {
    // The first option the value fits all the way down (two object shapes
    // can both fit at the top).
    const options = n.union.map((u) => resolve(u, schema)).filter((u) => fits(u, value));
    let first = null;
    for (const option of options) {
      try {
        return await walk(option, value, path, leaf, siblings, schema);
      } catch (e) {
        first ??= e;
      }
    }
    throw first ?? new Error(`${path}: expected ${describe(n)}`);
  }
  if (!fits(n, value)) throw new Error(`${path}: expected ${describe(n)}`);
  if (n.kind) return leaf(n.kind, value, path);
  if (n.format || n.enum) return value;
  if (n.array) {
    const out = [];
    for (let i = 0; i < value.length; i++) out.push(await walk(n.array, value[i], `${path}[${i}]`, leaf, null, schema));
    return out;
  }
  if (n.json) return JSON.stringify(await walk(n.json, JSON.parse(value), path, leaf, null, schema));
  if (n.switch) {
    const tag = siblings?.[n.switch];
    const c = n.cases[tag];
    if (!c) throw new Error(`${path}: no ${n.switch} ${JSON.stringify(tag)}`);
    return walk(c, value, path, leaf, null, schema);
  }
  if (n.map) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const kn = resolve(n.map.keys, schema);
      const key = await walk(kn, k, `${path} key ${JSON.stringify(k)}`, leaf, null, schema);
      out[key] = await walk(n.map.values, v, `${path}.${k}`, leaf, null, schema);
    }
    return out;
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const field = n.object[k];
    if (field === undefined) throw new Error(`${path}.${k}: not a field private runs take`);
    if (resolve(field, schema).kind === "drop") continue;
    out[k] = await walk(field, v, `${path}.${k}`, leaf, value, schema);
  }
  return out;
}

export function toolNode(tool, schema = SCHEMA) {
  const t = schema.tools[tool];
  if (!t) return null;
  return t.ref || t.object ? t : { object: t };
}

// Where the number goes in a unit, as the server reads it
// (AntistaticExchangeWeb.MCP.Format.template/1): "£Xk" stays, "seats" is
// "X seats", "%" is "X%", "$" is "$X", none is "X".
const SUFFIX_UNITS = new Set(["‰", "pp", "p.p.", "bp", "bps", "°", "°C", "°F"]);
const CURRENCY_UNIT = /^([A-Z]{0,2}[$£€¥₩₹₽₺₪₫฿₦₱])\s?([a-z]{1,8})?$/u;
export function unitTemplate(unit) {
  const u = String(unit ?? "").trim();
  if (u === "" || u === "date") return "X";
  if (u.includes("X")) return u;
  if (u.startsWith("%") || SUFFIX_UNITS.has(u)) return "X" + u;
  const c = CURRENCY_UNIT.exec(u);
  if (c) return c[1] + "X" + (c[2] || "");
  return "X " + u;
}

// A unit for a private run: its text encrypted, the X the server puts the
// number at plain (and a % right after it, which the server reads as a
// percentage). A word unit ("pence per litre") is one token.
async function encryptUnit(encrypt, unit) {
  const u = String(unit).trim();
  if (u === "" || u === "date") return u;
  const t = unitTemplate(u);
  if (t.startsWith("X ")) return encrypt(t.slice(2).trim());
  const at = t.indexOf("X");
  const before = t.slice(0, at);
  let after = t.slice(at + 1);
  let pct = "";
  if (after.startsWith("%")) [pct, after] = ["%", after.slice(1)];
  return (before ? await encrypt(before) : "") + "X" + pct + (after ? await encrypt(after) : "");
}

// A line of a script: its markers, script headings and blank lines plain;
// the rest encrypted (a bold-only line keeps its **).
async function encryptLine(encrypt, line) {
  if (line.trim() === "" || PLAIN_LINE.test(line)) return line;
  const bold = line.match(/^(\s*)\*\*(.+?)\*\*(\s*)$/);
  if (bold) return `${bold[1]}**${await encrypt(bold[2])}**${bold[3]}`;
  const prefix = line.match(MARKERS)[1];
  const rest = line.slice(prefix.length);
  return rest.trim() === "" ? line : prefix + (await encrypt(rest));
}

// A call's arguments with every text and key field encrypted and opaque ids
// (a turn_id) replaced by opaque(value). Throws for a tool or field private
// runs don't take.
export async function encryptCall(tool, args, encrypt, opaque, schema = SCHEMA) {
  const node = toolNode(tool, schema);
  if (!node) throw new Error(`${tool} isn't available for private runs.`);
  // market_code is read as code, as the server does (Tools.prepare_args/2).
  const fields = (node.ref ? schema.types[node.ref] : node).object;
  if (fields?.code && args?.market_code !== undefined && args.code === undefined) {
    const { market_code, ...rest } = args;
    args = { ...rest, code: market_code };
  }
  return walk(node, args, tool, async (kind, s) => {
    if (kind === "lines") {
      const out = [];
      for (const l of s.split("\n")) out.push(await encryptLine(encrypt, l));
      return out.join("\n");
    }
    if (kind === "opaque") return opaque(s);
    if (kind === "unit") return encryptUnit(encrypt, s);
    if (kind === "text" && s === "") return s;
    if (s === "") throw new Error(`${tool}: a key can't be empty`);
    return encrypt(s);
  });
}
