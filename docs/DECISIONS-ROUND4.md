# Round 4 decisions (Coder A, 2026-11-10)

Recorded by Coder A (team lead) after the upgrade proposal "IGNIS upgrade strategy 2026-11-10" (kept unedited outside
the repository, like the round-3 review). Round 2 and Round 3 decisions stand unless noted.

**Timing hold (applies to every build item below):** the official 2026 Participant FAQ says *"Teams are not allowed to
begin working on the challenges prior to the hackathon"* (event: 2026-11-14 → 11-15). Until the Local Lead / Global
Organizing Team rules on our pre-event work (`docs/DISCLOSURE.md`), **no new challenge code lands**. These decisions
fix *what* we build; *when* waits for the ruling.

| # | Decision | Affects |
|---|---|---|
| 1 | **ADOPTED: the Guided Demo becomes the evidence-investigation mission.** Five steps (open the case → examine the observations → check the source → find the limit → explain the result) with manual Next / Back / Explore freely and static captions. No new LLM calls, no timer, no score, no accounts. Coder B wires it from the existing sections and selection state on `console`. **Content gate:** the chosen case, the caption text and the gap example come only from R1's verified cards, selected from the real catalog in the event window, never scripted to a false success. The target stays ≥3 strong matches + one clean gap. If the catalog can't support it, improve the evidence selection; the fallback is the existing preset with static captions and a presenter-led click-through. | Coder B, R1, R3 captions, Coder A cache |
| 2 | **ADOPTED: ledgered stills on cards.** R2 supplies assets with a rights ledger → R1 checks each association → Coder B renders them. Campaign-only imagery is labeled as context, and a missing image leaves a clean text card. The Evidence Map stays a pure plot (no imagery or decoration on it). | R2, R1, Coder B |
| 3 | **ADOPTED in stages: comparison.** First align the Match Panel fields so the same fields line up. Only if time allows after the mission and QA: a static two-card comparison view. The comparison *animation* stays cut. GMT45-T4 always shows its changing-flow qualifier. No causal claims between two outcomes, no "safer material", no winning card. | Coder B, R1 wording |
| 4 | **REJECTED, and it stays rejected:** trainers, survival guides, games, health tools, boundary fits, danger heatmaps, safety rankings, new report formats, new artwork. | Everyone |
| 5 | **The bundle regression comes first.** Finish lazy-loading the console section (main JS 55 → 96 KB gzip; Zod back on the landing path) before any mission code lands. | Coder B, Coder A review |
| 6 | **Schedule re-baselined to the official start (2026-11-14 = Day 1).** The proposal's dates are replaced by the plan in `docs/MILESTONES.md` §5. Build items (lazy-loading, mission wiring, stills rendering, field alignment) were proposed as pre-event prep and are **on hold pending the ruling**. Mission content, card verification, rehearsals, the video and the three-person usability test (the proposal's five questions) are event-window work. | Whole team |
| 7 | **The proposal file stays uncommitted** (`reports/`, excluded via `.git/info/exclude`), like the round-3 review. | Coder A |

## Usability test (event window, Day 2)

Three people unfamiliar with IGNIS try the same reviewed mission. Record what happens; fix the step where they
hesitate:

1. Can they explain the purpose after the opening screen?
2. Can they find a real observation and open its original source?
3. Can they distinguish their scenario from an experiment's measured conditions?
4. Can they explain the gap without calling it unsafe, or untested across all NASA research?
5. Can they finish when narration is unavailable, using the matched evidence?
