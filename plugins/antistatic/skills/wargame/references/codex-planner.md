# Codex: the planner as a `codex exec` session

Only when the native `sandbox-planner` fails its readiness check for want of an authenticated Antistatic connection, and the `codex` CLI has its own (`codex mcp get antistatic`; if not, `codex mcp add` and `codex mcp login`, with the user's approval). Never move tokens between clients, and never fall back to REST or the database.

1. Start one session per run: `codex exec --json`, its prompt the planner brief (`antistatic_guide` planner) with no job_id, so it replies `ready`. Not `--ephemeral`; the user's model with `-m`. Take the session id from the `thread.started` event.
2. Each job: `codex exec resume <session-id>` with only the job_id (and any answers), `--output-last-message <file>`. Wait for it, then read only that file: `ready`, `done`, questions or an error. The rest of its output is sealed: keep it in a log you don't read or show.
3. Drive a session from one place: not the CLI and the Codex app at once.
4. Session lost: start a new one; the job and its notes carry the run.

Flags differ by version: check `codex exec --help`.
