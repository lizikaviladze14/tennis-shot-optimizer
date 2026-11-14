# Sensitivity analysis

How much each illustrative parameter of the Detailed model changes the
recommendation. All parameters are illustrative; this shows which guesses the
advice depends on, not which values are right.

## Setup

One base setup, Detailed · Drive · Pro vs Pro · default positions · Balanced (λ = 0.4) · 2000 shots per target · seed 42 · 27×27 grid.
The search finds the recommended aim for the base setup. Then each parameter is
set to a low and a high value, with everything else at base, and the search runs
again with the same draws. Model guesses are moved by a fixed step around the
model's constants; player inputs are multiplied by 0.8 and 1.2 (opponent
consistency is capped at 1).

## How to run

    npx vite-node scripts/sensitivity.ts

This rewrites [sensitivity-results.md](./sensitivity-results.md). This file is
never overwritten. The same analysis runs in the app under Model analytics →
Test assumptions, where the setup can be changed.

## Model in symbols

- Landing: aim + σ_depth·z₁ along the shot + σ_side·z₂ across it, with z₁, z₂ standard normal draws.
- Ball speed for an aim at depth d past the net: v·f(d), where f goes linearly from f_min at d_min to 1 at the deepest landing.
- After the bounce the ball moves at b·v·f(d) and stays playable for T seconds.
- Margin m = distance the opponent needs to run − distance they can run in the time available, at the easiest point along the ball's path after the bounce (opponent speed v_opp).
- P(reach) = 1 / (1 + e^(k·m)); P(return) = c · P(reach).
- Rally value after a return that lands d past the net: q(d), linear from q₀ at the net to q₁ at the baseline.
- Each draw that lands in contributes 1 − (1 − q)·P(return); a miss contributes 0. P(rally win) is the mean.
- Score = P(rally win) − λ·P(miss). The search picks the aim with the highest score between d_min and the baseline.
- Cost of keeping the base aim = 100 × (best score − score of the base aim), both under the changed value, in points per 100 shots (pts).

## Results

See [sensitivity-results.md](./sensitivity-results.md).

## What this means

