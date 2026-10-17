# Changelog

## 0.3.25

- Wargame planning: any change to a run question's line moves its linked
  questions, chained, this turn's rolls included; adjust results list them.

## 0.3.24

- Curriculum authoring: new curricula are admin-only for now.

## 0.3.23

- Rarities read by runs: `1 in 23 runs go this well`, `3 in 10 runs go
  this well`, `Half of runs go this well`.

## 0.3.22

- Wargame wrap-up: the forecasts section is in points, not Brier: what
  your forecasts made or lost against the house on resolved bars, with the
  calls that made the most and lost the most.

## 0.3.21

- Wargame goals score against their questions' opening lines, settled
  outcomes included; a goal set after the first turn shows `set at turn N`.

## 0.3.20

- Instrumental goals score 0 to 100 (`Instrumental score: 62/100`): their
  outcomes' percentile under the baseline, 50 as expected, 100 the best
  possible. Rarities read `A 1 in 5 outcome`.

## 0.3.19

- Wargame outcome score by rarity: each terminal goal's outcome pays 1 in N
  under its baseline, and the run scores how rare its weighted payoff is
  (`Outcome 23 · 40% settled · 1 in 5`: 0 the worst, 10 as expected, 100
  one in 1,000, no ceiling). The means keep the -100 to +100 rank.

## 0.3.18

- Planner: the job's `to_roll` lists what the turn rolls, each when item's
  chance this turn (`jump` where its hazard is over 3x last turn's) and each
  how-much period's median. The planner checks them and adjusts before the
  roll; an adjust's result gives the item's new chance.

## 0.3.17

- Wargame goals score the outcome against a baseline frozen when the goal
  is set: each goal has a valence (higher, lower, sooner, later, neutral or
  a target range) and a tier (terminal or instrumental). The run shows
  `Outcome +23 · 70% settled` for terminal goals and `Means` for
  instrumental ones; forecasting is optional. Corrections after a turn, or
  once an outcome is known, are shown as restatements. God mode shows the score unscored;
  each mortal stretch is its own segment.
- Planner: `adjust` takes `research` (new anchors with a basis) to refit a
  house line's open periods, conditioned on what has settled; linked
  questions follow. The sandbox-planning skill says when to use a shift, a
  value pin or re-research.
- Encrypted wargames need CLI 0.7.5 or later.

## 0.3.16

- Encrypted wargames: each piece of text is encrypted with a fresh nonce
  and bound to the account, the run (and its forks) and its field; text
  that fails to decrypt shows as "⚠ Unreadable". Needs CLI 0.7.4 or later
  (`brew upgrade finnhambly/tap/antistatic`); runs made before can't be
  read.

## 0.3.15

- Encrypted wargames: goals take `market_code` or `code`; `player_choice`
  and `persistence` work in specs and items; an item may carry its own
  `anchors`; periods and anchors take quarters (`2026-Q4`) and months
  (`Oct 2026`). The `encrypted-sandbox` skill shows each common call's
  argument shape and asks for `antistatic unlock` only when locked (CLI
  0.7.3 or later).
- Planner: staged questions, items and extensions that can't be made are
  refused when drawn, or reported in the turn's result; never dropped.
  Each plan branch may carry its own `adjust`, applied after the roll if
  that branch is chosen. `shift` is a level move that fades with
  persistence; links chain; `correlate` pairs a when-item with a how-much
  question. Jobs last four hours, longer while in use.
- Turns: the planner's action status stands unless a draw contradicts it;
  a feed's `settle` shows in the turn; `reopen` removes the fact that
  settled the item; each item that moved has its own label.
- Claude Code install: `/plugin marketplace add finnhambly/antistatic-plugin`,
  then `/plugin install antistatic@antistatic`.

## 0.3.14

- Encrypted wargames go through the `antistatic` command
  (`brew install finnhambly/tap/antistatic`, 0.7.0 or later):
  `antistatic encrypt` logs in with the browser, then sets up or unlocks;
  `antistatic call <tool>` makes each call. The `encrypted-sandbox` skill,
  the wargame skill and the planner use it.

## 0.3.13

- Private wargames are now called encrypted wargames: the
  `encrypted-sandbox` skill (was `private-sandbox`) and
  `scripts/antistatic-encrypted.mjs` (`antistatic-private.mjs` still works).

## 0.3.12

- `adjust` updates any run question's house line, every turn the story moves
  it: `lasting` reprices a when-item's later chances; a how-much `value` with
  `at` anchors a period or, mid-period, is a reading (`noise`); `shift` moves
  the outlook with no new data. Linked questions move with it, whatever their
  periods. Persistence is the planner's, per question (spec `persistence`, or
  `correlate` without `with`).
- `player_choice` marks a question or item that is the player's own decision:
  never rolled, adjusted or drawn; settled only on their word.
- `antistatic_correct_sandbox` `reopen` undoes a wrong settlement.
- `antistatic_get_sandbox` `script` returns a turn's script verbatim.
- `antistatic_wait_sandbox` waits at most 45 seconds.

## 0.3.11

- Private wargames (end-to-end encrypted): `scripts/antistatic-private.mjs`
  encrypts every call for the run with the user's key, unlocked by a
  generated 6-word recovery phrase (`init` prints it once). Each tool's
  fields follow a fixed schema (`scripts/private-fields.json`); arguments
  go on stdin. Units are encrypted too, around the plain X. The
  `private-sandbox` skill says how. The planner agent uses
  it for private runs.

## 0.3.10

- Run when-items that tend to happen together (or apart) without ruling each
  other out can be correlated: `correlate` takes two items, a `lift` (how many
  times likelier both are by `by` than if independent) and the horizon `by`.
  Each item keeps its own curve; when one happens, the other's chances in later
  turns move with it. Lifts the two chances can't give are refused, as are items
  in an exclusive group, a requires link or a given adjustment.

## 0.3.9

- Run when-questions can be linked so their rolls stay consistent: `link`
  makes items exclusive (at most one ever happens; once one does, the rest
  resolve no) or makes one require another (it can't happen first). `adjust`
  takes `given`, so a factor applies only when another item's roll this turn
  comes out a set way, with the other branch compensating so the item keeps
  its house chance.

## 0.3.8

- A value an info answer or observation fixes (savings on a date) anchors
  the roll of the how-much question that tracks it: `adjust` takes `value`,
  `at` and `evidence` for a how-much question.

## 0.3.7

- A new run question is priced as of the turn's end, taking in that turn's
  events, and leaves out items the turn has already ruled out (a candidate
  who withdrew), since it is first rolled next turn.

## 0.3.6

- A draw is tied to an action only when yes means the player carried it
  out; others' responses to an action are untied, so they no longer turn a
  done action into slipped.
- Settling a run question yes takes the day it happened, the same date as
  the observation that narrates it.
- The world snapshot describes the real world: the planner leans on it less,
  or not at all, once the scenario has moved far from reality.

## 0.3.5

- The planner reference says a turn job keeps the latest six info answers
  in full and cuts earlier ones to their first 400 characters.

## 0.3.4

- A large planner job comes in pages (`antistatic_planner_job` with
  `page`), so a turn's brief no longer overflows a tool result; the planner
  agent reads every page.
- Run questions in the job list their bars by curve, with a period's label
  and end once.

## 0.3.3

- The planner reference says how-much bars carry their threshold
  (`at_least`), that history keeps resolved bars for the latest three
  turns, and that a client planner's draw call rolls the run questions.
- The narration reference says where the program puts Results and Markets.

## 0.3.2

- Installable in Claude Code from the public marketplace
  (`/plugin install antistatic --marketplace finnhambly/antistatic-plugin`).
- A client-planned turn shows progress: the agent says a turn takes minutes,
  then relays each step of the planner's job (picked up, reading, drawn)
  from `antistatic_wait_sandbox`'s new `progress`, or shows
  `antistatic_show_turn_status`, whose card now has the steps, the chat's
  scope bars and an elapsed timer.
- Codex installs it with `codex plugin marketplace add
  finnhambly/antistatic-plugin` (the repository also carries
  `.agents/plugins/marketplace.json`).
- Questions between turns work in client-planned runs:
  `antistatic_ask_sandbox` hands them to the run's planner as an info job
  (`kind: "info"`), which answers with `antistatic_submit_script`.
- Turns, reads and goals show the run grid: a card in Claude and ChatGPT,
  and a text grid where cards don't show.
- The wargame skill no longer asks for `[real]` marks.

## 0.3.1

- `antistatic_guide` answers with its text alone (no structured copy), so
  clients that show a structured copy in place of the text get the guide.
- New `sandbox-planning` skill, loaded by the `sandbox-planner` agent: the
  planner's and narrator's instructions as markdown. Antistatic's own
  planner and narrator compile from the same files. A client-planned turn's
  job now carries `narration` (the narrator's instructions), and the planner
  writes each turn's story with `antistatic_submit_script` by default, so a
  run reads the same whichever plans it.
- Agents without the plugin get its rules where they act: a run started with
  `characters` answers with `next` (one subagent per character, private
  material kept to each), `antistatic_get_sandbox` repeats it to the host,
  and a turn's result over MCP leaves out `private_by_character`. New guide
  topics `planner` (the planner subagent's brief, from
  `agents/sandbox-planner.md`) and `curriculum` (the authoring skill).
- Forecasts on a future sandbox's questions (its goals): `run_id` on
  `antistatic_quote`, `antistatic_preview_forecast` and
  `antistatic_submit_forecast`; `X-Antistatic-Run` on the positions, quote
  and curve-targets routes. Past sandboxes stay read-only over the API.
- `antistatic_edit_comment`, `antistatic_my_forecasts` and
  `antistatic_curriculum_member`. The keeping-forecasts-current skill offers
  `extend` for a market of the user's nearing its top bar or last period.
- Client planning is the default for runs started through MCP or the API
  (`planner: "server"` for Antistatic's model; runs started on the website
  stay server-planned) and needs no paid plan. `antistatic_list_sandboxes`
  (`GET /sandbox`, `future_sandboxes.ai_budget`) shows the monthly AI
  budget: plan, allowance, used, remaining and reset date.
- Wargames with several characters per user: `characters` on
  `antistatic_start_sandbox` and `antistatic_update_sandbox_setup` makes a
  cast; `character` (a key) on the sandbox tools acts as one of them, and
  `antistatic_submit_orders` drafts and submits a character's orders.
- The wargame skill says who plans a run (Antistatic's model, or your own
  planner subagent with `planner: "client"`, chosen at the start when the
  host can run subagents), that a client-planned run has no opening
  briefing, and that the model is fixed after the first turn. The planner
  agent reports a failed tool's error instead of `done`. The OpenCode and
  Codex planner agents are generated from `agents/sandbox-planner.md`.
- Client-planned games with other players: the plan schema lets an
  observation name its `audience` (character keys; omitted for everyone),
  and only those players ever receive it. Each player pays for their own
  model calls: a guest's info answers and private turn notes go on the
  guest's AI budget (a client-planned run builds the notes in code).
- Market guidance: a source's cadence is checked on its data page (e.g.
  FRED), not assumed yearly.
- Future sandboxes: when a how-much period settles, the question's later
  periods are repriced to the conditional line given it, as a house
  probability change: Move with the house / Double down on held forecasts,
  and auto double down for players who have it on.
- Market guidance: a how_much quantity tracked over time takes monthly
  periods (quarterly past 12), or its source's own cadence when the source
  publishes less often (`year` for an annual figure).
- A future sandbox's mode can change at any time. Turning god freezes the
  score (`score.frozen`: the turn and the points then); turning mortal
  prices the goals again, and new points add to the frozen score. Each
  switch is kept on the run.
- Future sandboxes can have a planned end: `ends_on` in the setup
  (`antistatic_update_sandbox_setup`, `PATCH .../setup`; the wargame skill
  asks "Do you want the game to end on a set date? You can carry on after
  it."). New questions run to it. Once the clock passes it the run shows
  `past_end` (quietly on the site) and play carries on. The turn that
  reaches it wraps a server-planned run up (`wrapup` in the turn result; a
  client-planned run gets `wrapup_due`). New: `antistatic_wrap_up_sandbox`
  (`POST /api/v1/sandbox/runs/{id}/wrapup`): the arc, key resolutions with
  dates, turning points, goals and score, and how the forecasts did,
  written by the run's model (charged like a turn) or, for a client-planned
  run, by its planner subagent through a planner job. Stored on the run
  (`wrapup` in the run view); making it again keeps the earlier ones.
- Future sandbox forks are snapshots: a fork after turn N copies every
  question as it stood then (spec, links, goals, forecasts, positions, house
  line, liquidity and the resolutions reached by N) under the fork's own
  codes; later changes in either run stay in that run. Questions carry a
  `definition_sha256` (shared while definitions are identical). New:
  `antistatic_import_sandbox_questions` (`GET
  /api/v1/sandbox/runs/{id}/importable-questions`, `POST
  .../questions/import` with `from_run_id` and `codes`) copies questions
  from your other future runs (not deleted ones), with fresh state; the planner can do the
  same (`import_question`). `antistatic_edit_market` with `run_id` takes
  `also_runs` to make the same item edit in other runs with the identical
  question, only those named.
- Wargames on a free account: start and set up a future sandbox, and
  take server-planned turns on Haiku (`model_requires_pro` on another
  model). Server turns, info answers and briefings count against a monthly
  AI budget (`ai_budget_exhausted`, 402, when it is used up; client-planned
  turns cost nothing and admins are exempt). The turn audit gives each
  turn's `model` (fixed when the turn starts, so a model change applies from
  the next turn) and its exact `cost_usd`.
- Scenarios of your own: `antistatic_start_sandbox` with `title` and
  `premise` (and optionally `bio`), without `template`, starts a future
  sandbox of the user's own scenario, set up at once; the world rules,
  pacing and curveball guidance are shared defaults. A template run may
  take a `premise` in place of its own. `antistatic_update_sandbox_setup`
  takes `title` and `premise`; each change of the premise or the bio is
  logged with the run's date and turn (`settings.setup_log`). No pace to
  choose: each turn's length is chosen when it is taken (the setup has
  `pacing` and `curveballs` in place of pace options and modification
  suggestions). The wargame skill asks for the premise rather than a pace.
- Past sandboxes: market comments are the feed. A comment written in a run
  is stamped with the run's clock (shown as the sandbox day; the real
  posting day on hover). Settings gain `show_other_players_comments` (off by
  default) and `share_sandbox_comments` (account-wide): shared comments are
  reviewed for contamination first, and a player sees another's only once
  their clock is at or past its date. Ante, a bot account, posts curated
  library items as comments. Admin API: `GET
  /api/v1/admin/sandbox/comment-reviews` (pending, with flags), `POST
  .../comment-reviews/approve` and `.../reject`, `POST
  /api/v1/admin/sandbox/{slug}/ante-comments` and `.../ante-curate`. A
  run's Feed page is now a digest of the comments it can see;
  `sandbox_sources` still reads the library.
- `antistatic_take_turn` takes `until: "auto"`: the planner chooses the
  turn's end date (the wargame skill sends it when the user just says
  "advance"), keeping to the run's cadence (recent turn lengths, else the
  pace) or else a sensible step. The result's `until` gives the date, who
  chose it and a one-line reason, also stated under the script's header. A
  client planner declares it as its first event (`set_until`).
- Sandboxes can be renamed and archived, and deleting one is now
  recoverable. `antistatic_rename_sandbox` (`run_id`, `name`; empty clears
  it) names a future sandbox wherever it is listed; a past sandbox keeps its
  curriculum's title. `antistatic_archive_sandbox` (`run_id`, `archived`,
  default true) takes a run off the user's lists without changing it.
  `antistatic_delete_sandbox` is now a soft delete: the run is gone for the
  user (404 everywhere) but kept, so it can be restored on request; its forks
  stay. `antistatic_list_sandboxes` runs carry `name`, `archived` and
  `forked_from_run_id`. REST: `PATCH /api/v1/sandbox/runs/:id` (`name`,
  `archived`).
- The learning skill and the server instructions say plainly that nothing
  from after a past sandbox's clock may be used: not later knowledge, and
  not web results; a web search takes only sources dated on or before the
  clock.
- Future sandboxes have a mode. `mortal` (the default for new runs): the
  world is drawn from the house line, and the user is scored with
  Antistatic's regular market points on the run questions they mark as
  goals with the new `antistatic_set_sandbox_goal` (`market_code`,
  `liquidity` 100 to 1,000: the market's budget; or `remove`). Points are the
  run positions' own: the budget decays with the run's clock as on a live
  market, and points count from when each goal was priced. Decrees and feeds
  can't settle or move a goal. `god`: the world may be drawn from the user's
  forecasts (`sample_from: "user"`), unscored. `mode` on
  `antistatic_start_sandbox` and `antistatic_update_sandbox_setup`;
  `sample_from: "user"` alone starts a god run; a mortal run turns god only
  before its first turn. Existing runs: house runs are mortal, user runs god.
  `antistatic_get_sandbox` shows the mode and score (per goal: liquidity,
  each bar's p0 and p, realised and unrealised points), and the turn audit
  records the goals after each turn. REST: `PUT
  /api/v1/sandbox/runs/:id/goals/:code`, and `mode` on start and setup.
- Future sandboxes roll how-much run questions coherently: each period
  follows the question's earlier periods (and any question the planner
  linked to it) instead of being drawn independently, and a running maximum
  or minimum never moves back. How-much specs take `running: true` (with measure highest, lowest or total_over_period) for a value that carries over (the highest so far, a total to date); previews warn when a title says so far, to date, ever or cumulative without it. Settling a run-question item now needs a
  cited observation, fact or entry. The turn audit shows each roll's latent
  draw, correlation, truncation and links.
- Future sandboxes take `sample_from` (`house`, the default, or `user`) on
  `antistatic_start_sandbox` and `antistatic_update_sandbox_setup`: with
  `user`, run-question rolls use the user's own forecast where they have one
  and the house line elsewhere. The turn audit records each roll's source
  (house, user, fallback or mixed).
- `antistatic_get_sandbox` takes `include_audit`: for a future sandbox's
  owner, how each completed turn was decided (the seeded draws, run-question
  rolls with house p, adjustment, u and result, and the branch sample).
  REST: `GET /api/v1/sandbox/runs/:id/audit` (`turn` picks one).
- Client planner mode: a future sandbox with `planner: "client"` is planned
  by the user's own agent. `antistatic_take_turn` returns
  `status: "planner_job"` with a `job_id`; the wargame skill hands it to one
  persistent `sandbox-planner` subagent per run (agents for Claude Code,
  OpenCode and Codex ship with the plugin), which uses the new
  `antistatic_planner_job`, `antistatic_planner_draw`,
  `antistatic_submit_plan`, `antistatic_submit_script` and
  `antistatic_planner_notes`. The server still draws every uncertain event
  and rolls the run questions; client turns make no model calls and have
  their own daily allowance.
- `antistatic_take_turn` can return `status: "questions"` with
  `questions_for_player` when the simulation needs the user's answers
  before a turn: the wargame skill relays them verbatim and retries the same
  `turn_id` with the answers as feed entries (`answers`: the question's id).
  Completed turns can carry non-blocking questions too.
  `antistatic_update_sandbox_setup` takes `duty_rates`.
- Market guidance: a quantity tracked over time is one how_much market with
  regular periods (a projection); a word unit ("subscribers") labels the
  axis, and previews warn about "X subscribers".
- `antistatic_start_sandbox` and `antistatic_update_sandbox_setup` take
  `model` (opus, the default, sonnet or haiku): the model that simulates a
  future sandbox, changeable between turns.
- Plan limits are stated as facts ("isn't available on this account's
  plan"), with no plan names, prices or upgrade links, in tool
  descriptions, errors and skills.
- Future sandboxes roll run questions on the server each turn, from the
  house line; `antistatic_edit_market` with `run_id` adds items to a run's
  when-question with items.
- Future sandboxes narrate each turn on the server: `antistatic_take_turn`
  returns `script` (a dated header with T+days, what happened, Results,
  Elsewhere, Markets, ending "What do you do?"), which the wargame skill
  shows verbatim. Turns take typed `entries` (action, decree, feed, info);
  `actions` is deprecated. New `antistatic_ask_sandbox` answers info and
  records feeds with no time passing. A completed setup gets an opening
  briefing at T+0.
- Timelines are now Sandboxes: the tools are `antistatic_list_sandboxes`,
  `antistatic_get_sandbox`, `antistatic_sandbox_sources`,
  `antistatic_search_sandbox_library`, `antistatic_start_sandbox`,
  `antistatic_update_sandbox_setup`, `antistatic_advance_sandbox`,
  `antistatic_fork_sandbox` and `antistatic_delete_sandbox`
  (`antistatic_take_turn` and `antistatic_promote_market` keep their names),
  and their descriptions say a sandbox is a simulated forecasting world, not
  a code environment. The old timeline tool names are gone. Skill
  `learning-with-timelines` is now `learning-in-sandboxes`; the rules and
  manifest are at https://antistatic.exchange/sandbox/rules.md and
  /sandbox/manifest.md.
- Future-timeline setup as a form: clients that declare form elicitation
  get the bio, modifications and pace as a form when
  `antistatic_start_timeline` starts the run; ChatGPT shows a setup card that
  saves through `antistatic_update_timeline_setup`. Other clients still get
  the setup object.
- OpenCode: the commands and skills as `/antistatic-*` commands in
  `.opencode/command/` (also at
  `https://antistatic.exchange/opencode/command/<name>.md`).
- Timelines: `antistatic_list_timelines`, `antistatic_get_timeline`,
  `antistatic_timeline_sources` and `antistatic_search_timeline_library`
  (a library capped at the run's clock), and `run_id` on
  `antistatic_show_market`, `antistatic_show_markets` and
  `antistatic_get_comments` to read a market as of a run's clock.
  `retrocasting_run_id` is now `run_id` (the old name still works).
- Skill `learning-with-timelines`: tutoring through a curriculum timeline.
- Curriculum authoring: `antistatic_create_curriculum_draft`,
  `antistatic_add_checkpoint`, `antistatic_add_question`,
  `antistatic_add_disclosure`, `antistatic_validate_curriculum` and
  `antistatic_publish_curriculum` build a small past-timeline curriculum
  without files; the `author-curriculum` skill links the rules
  (https://antistatic.exchange/timelines/rules.md).
- `antistatic_promote_market`: copies a future timeline's question into the
  real exchange today, as a private market whose opening probabilities come
  from today's evidence. The `wargame` skill and the `/antistatic:promote`
  command describe it.
- README and listing: connect steps per host (Claude, Claude Code, ChatGPT,
  Codex, OpenCode), the tool count, and bots, resolving and timelines in the
  capability list.

## 0.3.0 (directory submission)

- Listing metadata for the OpenAI plugin directory: a 30-character subtitle,
  descriptive capabilities, a dark-theme brand colour, and the logo and
  composer icon in `assets/` (the site's radio-dish icon).
- Review information: five positive and three negative test cases, commerce
  declaration and release notes. `demo_recording_url` is a placeholder until
  the walkthrough is recorded.
- Skills describe what the tools do and what the site expects instead of
  directing the assistant.
- Forecasting and resolving describe their effects (forecast, points) without
  asking for the user's agreement first; agents may update forecasts on their own.
- `antistatic_preview_forecast` draws a proposed forecast on the market's card
  and returns `draft_url`, which opens it on Antistatic as an unsaved draft;
  it saves nothing. Quotes return `draft_url` too.

0.3.0 skips 0.2.8 and 0.2.9 on purpose: 0.2.8 is a release candidate built
outside this repository, so this version can't be confused with it.

## 0.2.7

- Points-only MCP operations; access and feedback fixes.
