# Dim Scorekeeper — Enhancements & Audit

Last audited: 2026-11-10 (post UI enhancements merge to `main`).

## How work ships

1. Create a feature branch from `main`
2. Open a PR → Netlify builds a **Deploy Preview**
3. Merge to `main` → Netlify deploys **production** automatically
4. Note: Netlify sets `CI=true`, so ESLint warnings fail the build

There is no GitHub Actions workflow in-repo; CI/CD is Netlify ↔ GitHub only.

---

## Completed (shipped)

- [x] Sticky header with player names while scrolling
- [x] Cumulative totals in the sticky header (and bottom TOTAL row)
- [x] Highlight bust vs successful scores (red / green chips)
- [x] Fire streak indicator for 2+ consecutive successful rounds
- [x] Dealer “cards dealt” gate before betting timer / bet inputs
- [x] Setup-page heads-up for who deals and bets first
- [x] Leading-player crown on totals (header + bottom)

---

## Priority 1 — Bugs / edge cases (fix next)

### P1.1 Betting order depends on UI `roundCount`, not game state

**Bug:** `getValidNumbers`, `isPlayerTurn`, and `isLastBettingPlayer` use:

```ts
round.number === parseInt(roundCount) ? 0 : (round.dealer + 1) % players
```

`roundCount` is React state that defaults to `"10"` and is **not restored** from `localStorage`. After a refresh (or any game whose max round ≠ 10), a mid-game round whose `number === 10` can get the wrong “last bettor” restriction.

**Fix:** Derive “opening round” from `gameState.rounds[0].number` (or store `totalRounds` on `GameState`) and never use the setup `roundCount` selector during play.

### P1.2 Corrupted / invalid `localStorage` crashes the app

**Bug:** Multiple `JSON.parse(localStorage.getItem(...))` calls have no `try/catch`. Bad data → blank white screen.

**Fix:** Wrap parse in try/catch; on failure clear `STORAGE_KEY` and start fresh.

### P1.3 Setup fields not restored with saved game

**Bug:** On reload, `playerNames` / `playerCount` / `roundCount` stay at setup defaults even though `gameState` restores. Affects new-game UX and amplifies P1.1.

**Fix:** When hydrating from storage, sync those fields from `gameState`.

### P1.4 Refresh mid-round always re-shows cards-dealt gate

**Behavior:** `cardsDealtReady` is not persisted (intentionally safe). If bets were already entered and the page reloads, the deal overlay returns and can stack awkwardly with the bets-confirmation dialog.

**Fix options:**

- Persist `cardsDealtReady` (or infer: if any bet ≠ -1, treat as dealt), **or**
- If any bets exist, skip the overlay and resume betting/confirmation

### P1.5 Cancel bets confirmation leaves awkward edit state

**Bug:** After “No, Keep Editing” with all bets filled, `currentBettingPlayer` is `-1` and turn logic is ambiguous — hard to change a single wrong bet.

**Fix:** On cancel, clear the last player’s bet (or open an explicit “edit bets” mode).

### P1.6 Betting timer is cosmetic only

Timer hits 0 and disappears; nothing is enforced or announced. Either wire a soft nudge (highlight current bettor) or document that it’s a reminder only.

### P1.7 All-zero totals highlight everyone as leader

Bottom TOTAL (and some score color checks) treat score `0` as “highest” when all players are tied at 0, so everyone can get leader styling before any points are scored.

**Fix:** Only apply leader styling when `maxScore > 0` (header crown already does this in places).

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

---

## Priority 3 — Engineering / CI

- [ ] Add `netlify.toml` so build command / publish dir live in-repo
- [ ] Add GitHub Action: `CI=true npm run build` on PRs (catch Netlify failures early)
- [ ] Avoid unused-variable ESLint failures (already burned once with `getCurrentStreak`)
- [ ] Consider validating `GameState` shape on load (version field + migration)

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
8. **Non-default setup** — e.g. 5 players / 13 rounds, refresh on round 10, re-check last-bettor rule (P1.1)
9. **Tie games** — multiple winners announced correctly
10. **New game** — clears storage and returns to setup cleanly

---

## Recommended next PRs

| PR | Scope | Why |
|----|--------|-----|
| **A** | Fix P1.1 + P1.3 (betting order from `gameState`) | Real scoring-rule bug after refresh |
| **B** | Safe localStorage load (P1.2) + refresh deal-gate UX (P1.4) | Crash + confusing mid-game reload |
| **C** | Hide bets once confirmed; last-bettor legend | High-value UX from original TODOs |
| **D** | Hard-edit completed round | Table play mistake recovery |
| **E** | `netlify.toml` + optional GitHub build check | Fewer surprise CI failures |

---

## Implementation notes

- Prefer small PRs so Netlify previews stay easy to verify at the table
- Keep deal-gate / timer behavior explicit and dealer-driven
- Visual extras (voice, confetti density) should stay optional
- When marking items done here, also update the short TODOs list in `README.md`

_This file is the living backlog. Update it when shipping or discovering new edge cases._
