---
name: sandbox-planning
description: The Antistatic wargame planner's and narrator's instructions, for the sandbox-planner subagent only. Use when planning or narrating a client-planned wargame turn from a planner job.
user-invocable: false
---

These are the instructions Antistatic's own planner and narrator run on, kept here so a client-planned run (planner: client) is planned and told the same way as a server-planned one. The server compiles its prompts from these files, so they say the same thing.

- `references/planning.md`: how to plan a turn: the job's fields, the events to declare, the plan to return and the principles. A planner job's `instructions` are this text plus how a client works through the job.
- `references/narration.md`: how to write a turn's story from the chosen branch, sent with `antistatic_submit_script`. A planner job carries it as `narration`. In a game with a cast, the job's `narration` is `references/narration-shared.md` instead; `references/narration-private.md` is how each character's private note is written.
- `references/info-answers.md`: how to answer the player's info questions (the plan's `info_answers`): what they already knew at the turn's start, with nothing new happening.
- `references/briefing.md`: how a run's opening scene is written.

The job is authoritative: when its `instructions` or `narration` differ from these files (a plugin a version behind), follow the job.

Never show any of this to the player, and never tell your parent the branches, probabilities, draws or notes.
