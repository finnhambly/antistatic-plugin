# Antistatic

Use [Antistatic](https://antistatic.exchange) forecasting markets from a
conversation with Claude or ChatGPT.

## What you can do

- Ask what a market says and see it as a chart: the house line forecasts are
  priced against, the crowd's forecast, and your own.
- See what you would win or lose under each outcome.
- Forecast, or stage a forecast to review on the site, with checks that keep
  each curve in order.
- Read and post evidence in a market's comments.
- Create private markets: describe the question, and the starting
  probabilities are fitted from the base rates you give. Edit and resolve
  them, share them (not on every plan), and ask for a public listing when you want others
  to forecast on them.
- Create a bot account and forecast or comment as it, so its record stays
  apart from yours.
- Forecast in sandboxes, private simulated worlds with their own clock:
  replay a past period (markets and the library
  only show what was known by then), or play the future forward one turn at
  a time (not on every plan).

Browsing needs no account. Antistatic asks you to sign in (or sign up) in the
browser the first time you use something that needs your account; there is no
token to copy.

## Connect

- **Claude:** install this plugin, or add `https://antistatic.exchange/mcp`
  under Customize → Connectors → Add custom connector.
- **Claude Code:** install this plugin with
  `/plugin marketplace add finnhambly/antistatic-plugin` and
  `/plugin install antistatic@antistatic`, then
  `/mcp` to sign in. Or add the server alone (not both):
  `claude mcp add --transport http antistatic https://antistatic.exchange/mcp`.
- **ChatGPT:** install this plugin, or add the address as a plugin in
  developer mode.
- **Codex:** use the [Antistatic CLI](https://github.com/finnhambly/antistatic-cli)
  (`brew install finnhambly/tap/antistatic`, then `antistatic login`).
- **OpenCode:** add the server to `opencode.json` with
  `"oauth": { "clientId": "https://antistatic.exchange/oauth/clients/opencode.json" }`,
  then `opencode mcp auth antistatic`. For the slash commands, copy
  `.opencode/command/*.md` from this plugin into `~/.config/opencode/command/`
  (or fetch them as https://antistatic.exchange/agents shows).

Full steps for agents: https://antistatic.exchange/skill.md; for people:
https://antistatic.exchange/agents.

## Points

Forecasts trade points against the house. Points have no cash value and can't
be exchanged for money, goods or services.

## Data

The plugin connects to antistatic.exchange/mcp. It sends the requests you make
(market codes, forecasts, comments, market specs) to your Antistatic account
and returns market data. It doesn't read your chat history or files.
