---
name: forecasting-on-antistatic
description: Read, chart and forecast on Antistatic markets. Use when the user asks what a forecasting market says, wants their forecast compared with the house or the crowd, asks what they win or lose, or wants to change or stage a forecast.
---

Antistatic markets are made of curves of bars, each bar a probability.

- *When* markets: each bar is the chance the event has happened by its date, so a curve rises.
- *How much* markets: each tab is a period; each bar is the chance the value is at least its threshold, so a curve falls.

Charts: tools with a chart (`antistatic_show_market`, `antistatic_show_markets`, `antistatic_my_points`, `antistatic_preview_market`) show it in the conversation automatically where the app supports it. To show several markets, make one `antistatic_show_markets` call with their codes. Don't redraw a chart yourself; refer to it and add the numbers that matter.

Reading a market:

1. Find it with `antistatic_search_markets`, then call `antistatic_show_market`. Quote the house line (starting probability) as the market's number; the crowd (community probability) is context, and the user's own forecast appears when they are signed in.
2. Check each curve's status before quoting it. Resolved curves are settled: say how they resolved, not their old odds. A period that has ended but isn't resolved still takes forecasts, with nothing at stake.
3. For the bars of one curve, and the submarket refs needed to forecast, call `antistatic_show_market` with `curve`.

Helping the user think it through:

The user owns the forecast and makes the call. What usually helps most is asking what they think and why, then raising the one or two things most likely to change their number, rather than a checklist. The superforecasting habits (Tetlock, Good Judgment) that apply:

- Know how it works. A detailed model of the mechanics (actors, incentives, constraints, timelines, how the resolution source measures the thing) is most of the skill. Research until nothing important is missing; superforecasters mostly just know a lot.
- Outside view, then inside view: start from a reference class (the house line is one), then adjust by thinking through the steps that would have to happen.
- Scope and pace: how fast and how far can things plausibly move by each date? The status quo usually persists.
- Calibration: tails wide enough for surprises; extreme numbers need extreme evidence; keep related bars and markets consistent.
- Biases worth naming when they show up: optimism and wishcasting, recency, vivid headlines, anchoring on a round number.
- Sources: the resolution source first, primary over secondhand; other markets and experts are evidence, not answers.
- Premortem: how is this forecast most likely to be wrong? Update in proportion to genuinely new evidence.

Forecasting:

1. Work out the change and quote it with `antistatic_quote` when cost matters. For most requests, don't compute bars: pass `targets` or a `shift` to quote, stage or submit, and the rest of the curve follows as when the user drags a bar on the site (same log-odds change, tapering towards the ends; bars between targets interpolated):
   - "make it 30% likely to be at least $5bn": `targets: [{curve: "2027-12-31", threshold: 5000000000, probability: 0.3}]`
   - "50% by mid-2028, 80% by 2032": `targets: [{threshold: "2028-06-30", probability: 0.5}, {threshold: "2032-12-31", probability: 0.8}]`
   - "move my 2027 median ~10% higher": `shift: {curve: "2027-12-31", quantile: 0.5, by: "+10%"}` (`by` is days on when-curves; or `to` a value)
   Use `updates` (exact bars by submarket ref) when the user names specific bars.
2. Submitting changes the user's forecast and points; staging leaves the change for them to review on the site.
3. Submit with `antistatic_submit_forecast`, or stage it for review on the site with `antistatic_stage_forecast`. To show a forecast without saving anything, use `antistatic_preview_forecast`: its `draft_url` opens it on the site as an unsaved draft.
4. Bars on a curve must stay in order. If a forecast is refused as out of order, fix the values, or resend with `rest_of_curve: "keep_in_order"` (other bars move only as far as needed) or `"interpolate"` (bars between the user's sit on a straight line). Say which you used.
5. `antistatic_my_points` shows what the user wins or loses under each outcome.

Points have no cash value; forecasts trade them against the house, never against other people.

Feedback: if anything about Antistatic's tools, instructions or site was confusing, broken or could be better, offer to send it with `antistatic_send_feedback` (what happened and what would help). It's welcome. Send it only if the user agrees: it emails the Antistatic team with their username, email address and client name. Leave out private details they haven't agreed to share.
