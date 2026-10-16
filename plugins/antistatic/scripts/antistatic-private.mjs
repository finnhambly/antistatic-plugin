#!/usr/bin/env node
// The old name of antistatic-encrypted.mjs, kept so existing setups work.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { main } from "./antistatic-encrypted.mjs";

export * from "./antistatic-encrypted.mjs";

const isMain = () => {
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
};
if (process.argv[1] && isMain()) main(process.argv.slice(2));
