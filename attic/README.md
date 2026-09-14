# attic

Things nothing references, kept so they are not lost.

Mostly frame art carried over from Card Anvil's `src/templates/` so nothing was
lost in the split, but nothing imports it and it is not part of any frame. It is
kept here — outside `packages/` — so it is obvious these files are inert, rather
than sitting inside a frame package looking intentional.

- `universesBeyond/` — a Universes Beyond frame family that was never wired up.
  The UB crown art that _is_ live lives in `frame-borderless` under
  `regular/crowns/ub/`, not here.
- `studio-prototype/` — the throwaway box viewer that `frame-kit studio` grew
  out of: a single-file canvas page plus a zero-dependency server that read
  `boxes.ts` with a regex and `eval`. Kept for reference only; its paths were
  already broken where it sat, and nothing here runs. The real tool is
  `packages/frame-studio`.
