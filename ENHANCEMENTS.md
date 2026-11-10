# Dim Scorekeeper — Enhancements & Audit

Last audited: 2026-11-10 (post UI enhancements merge to `main`).
P1 fixes + unit tests: 2026-11-10.

## How work ships

1. Create a feature branch from `main`
2. Open a PR → Netlify builds a **Deploy Preview**
3. Merge to `main` → Netlify deploys **production** automatically
4. Note: Netlify sets `CI=true`, so ESLint warnings fail the build

There is no GitHub Actions workflow in-repo; CI/CD is Netlify ↔ GitHub only.

Core rules live in `src/gameLogic.ts` + `src/storage.ts` with Jest coverage (`npm test`).

---

## Completed (shipped)

- [x] Sticky header with player names while scrolling
- [x] Cumulative totals in the sticky header (and bottom TOTAL row)
- [x] Highlight bust vs successful scores (red / green chips)
- [x] Fire streak indicator for 2+ consecutive successful rounds
- [x] Dealer “cards dealt” gate before betting timer / bet inputs
- [x] Setup-page heads-up for who deals and bets first
- [x] Leading-player crown on totals (header + bottom)
- [x] **P1.1** Betting order always `(dealer + 1) % players` (no setup `roundCount`)
- [x] **P1.2** Safe `localStorage` load (try/catch + clear corrupt / invalid shape)
- [x] **P1.3** Restore `playerNames` / `playerCount` / `roundCount` from saved game
- [x] **P1.4** Refresh skips cards-dealt gate when any bet already exists
- [x] **P1.5** Cancel bets confirmation clears last bettor so they can re-edit
- [x] **P1.6** Betting timer documented as reminder-only (no auto-advance)
- [x] **P1.7** Leader styling only when `score > 0`
- [x] Unit tests for betting order, hands/scores, streaks, leaders, storage

---

## Priority 2 — Product enhancements

### Still open from original backlog

- [ ] Hide bets once entered (show only after hands phase / round complete)
- [ ] Legend for border colors (current bettor solid / last bettor dashed)
- [ ] Hard-edit / redo a completed round when mistakes happen
- [ ] Save / export completed games (local download first; DB later)
- [ ] Persist game history across sessions beyond single `localStorage` slot
- [ ] “Play all the way up” (ascending card counts) option
- [ ] Stronger end-game celebration / clearer multi-winner UI

### Nice-to-haves (lower)

- [ ] Cumulative bets total while betting is in progress
- [ ] Bold / highlight highest score **within each round**
- [ ] Per-round confetti for a made contract (optional, toggleable)
- [ ] Joker emoji on busted scores (mirror crown)
- [ ] Voice input / announcements (optional, device-permission aware)
- [ ] Offline-safe sounds (bundle assets instead of Mixkit CDN URLs)
- [ ] Split monolithic `App.tsx` into smaller modules (table, setup, hooks)
- [ ] Soft timer nudge when countdown hits 0 (still reminder-only)

---

## Priority 3 — Engineering / CI

- [ ] Add `netlify.toml` so build command / publish dir live in-repo
- [ ] Add GitHub Action: `CI=true npm test -- --watchAll=false && CI=true npm run build` on PRs
- [ ] Avoid unused-variable ESLint failures (already burned once with `getCurrentStreak`)
- [ ] Consider `GameState` version field + migration helpers

---

## Suggested audit playtest checklist

Use a Deploy Preview or `npm start`:

1. **Fresh game** — setup heads-up matches first dealer / first bettor
2. **Deal gate** — cannot bet until “Cards dealt”; timer starts only after
3. **Last bettor** — forbidden total ≠ cards is enforced
4. **Hands** — last player forced to remaining tricks; scores green/red correctly
5. **Streak** — 2+ made contracts show 🔥 under score; bust breaks streak
6. **Scroll** — sticky header stays readable; deal overlay does not cover names
7. **Refresh** mid-betting, mid-hands, after all bets (before confirm), after deal gate
8. **Non-default setup** — e.g. 5 players / 13 rounds, refresh on round 10, re-check last-bettor rule
9. **Tie games** — multiple winners announced correctly
10. **New game** — clears storage and returns to setup cleanly
11. **Cancel bets** — “No, Keep Editing” clears last bettor and lets them change
12. **Corrupt storage** — bad `localStorage` value starts a clean setup screen

---

## Recommended next PRs

| PR | Scope | Why |
|----|--------|-----|
| **C** | Hide bets once confirmed; last-bettor legend | High-value UX from original TODOs |
| **D** | Hard-edit completed round | Table play mistake recovery |
| **E** | `netlify.toml` + GitHub Action for test+build | Fewer surprise CI failures |

---

## Implementation notes

- Prefer small PRs so Netlify previews stay easy to verify at the table
- Keep deal-gate / timer behavior explicit and dealer-driven
- Visual extras (voice, confetti density) should stay optional
- When marking items done here, also update the short TODOs list in `README.md`

_This file is the living backlog. Update it when shipping or discovering new edge cases._
