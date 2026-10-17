# Antistatic plugin

The [Antistatic](https://antistatic.exchange) plugin for Claude, Claude Code
and ChatGPT: forecasting markets as charts, forecasts in points, private
markets from base rates, and wargames whose turns your own agent plans.

## Install

**Claude Code:**

```
/plugin marketplace add finnhambly/antistatic-plugin
/plugin install antistatic@antistatic
```

`/plugin marketplace update antistatic` picks up new versions. Run `/mcp` and
choose antistatic to sign in. Use the plugin or the connector, not both.

**Codex:** `codex plugin marketplace add finnhambly/antistatic-plugin`, then
`/plugins` in Codex to install it. `codex plugin marketplace upgrade antistatic`
picks up new versions.

**Claude (web, desktop and mobile) and ChatGPT:** install Antistatic where
the app offers it. Until then, in Claude upload `plugins/antistatic` as a zip;
in ChatGPT add `https://antistatic.exchange/mcp` as a custom MCP server (the
tools without the skills), or a workspace admin can import this repository
under Admin > Plugins.

More: [plugins/antistatic/README.md](plugins/antistatic/README.md) and
https://antistatic.exchange/agents.

This repository is generated from Antistatic's own repository; changes made
here are overwritten. Report problems at
https://antistatic.exchange/agents#agents-support.
