---
name: encrypted-sandbox
description: Start, play or plan an encrypted (end-to-end) Antistatic wargame, where every call goes through the antistatic command. Use when the user wants an encrypted or private wargame, or a run's settings say private.
---

Encrypted wargames' text is encrypted on your device before upload. Our servers store encrypted text and don't send encrypted runs to Antistatic's models. Dates, numbers and activity metadata remain visible. Your own AI provider receives the text you ask it to process. Browser unlocking trusts the code Antistatic delivers; a malicious or compromised deployment could access unlocked data or keys.

## Steps

1. Check: `antistatic status --json`. Its `state` is `not_logged_in`, `not_set_up`, `locked` or `unlocked`.
   - Command not found: ask the user to run `brew install finnhambly/tap/antistatic`, then `antistatic encrypt`, in their own terminal.
   - Anything but `unlocked`: ask them to run `antistatic encrypt` in their own terminal. It logs in with the browser, then sets up (shows a 6-word recovery phrase once and asks for words 2 and 5) or unlocks (asks for the phrase).

   Then wait for them to say it's done. Never ask for, type or handle their recovery phrase, and never run `antistatic encrypt`, `unlock` or `login` yourself.
2. Start the run:
   ```
   antistatic call antistatic_start_sandbox <<'EOF'
   {"title": "...", "premise": "...", "private": true}
   EOF
   ```
3. Play as in the wargame skill, with every call for this run, yours and the planner's, made through `antistatic call <tool>`, its JSON arguments on stdin (a quoted heredoc as above; or `@file.json`), named as the tool's schema names them (`market_code` or `code` for a run question). Never call the antistatic MCP tools for an encrypted run, and never put arguments on the command line. The output is the tool's text, decrypted; `--json` prints its structured data.
4. Encrypted runs are client-planned: when take_turn returns a planner job, spawn the sandbox-planner subagent and tell it the run is encrypted (private), so it uses `antistatic call` too.

Exit codes of `antistatic call`: 3 not logged in, 4 not set up, 5 locked (ask the user to run `antistatic encrypt`, then retry); 2 the arguments don't fit (fix them); 6 the tool refused the call (its message is on stderr).

## What gets encrypted

Each tool's fields follow a fixed schema; `antistatic call` refuses a tool or field it doesn't list, and the server refuses unencrypted text.

- Encrypted: all prose, names, character keys, your question codes and item keys. The same text always encrypts the same way, so reuse codes and keys verbatim.
- Plain: enums, dates, numbers and server-issued ids (run, job and observation ids, run question codes such as p12-3, character ids such as c2).
- Units: give them as usual ("£Xk", "%", "pence per litre"); their text is encrypted and only the X (and a % after it) stays plain.
- `turn_id` is replaced by an opaque id.
- Scripts are encrypted line by line; markdown markers, blank lines, `**Results**`, `**Elsewhere**`, `**Markets**`, `**Questions**` and `What do you do?` stay plain.
- Cite evidence by observation id or by quoting a whole observation.

Not in encrypted runs: the server planner, the site's chat, the scout, invites, promoting a question to a real market, library search and comments.

On the site, encrypted text shows locked until the user unlocks it with the recovery phrase.
