# Model notes

## Documented simplification: hitter mishits are not modeled

**What the model includes.** Each simulated shot misses the aim by a random
amount drawn from a normal distribution, scaled by the side and depth error
sliders. P(in) is the share of those simulated landings that land in the
singles court. This is placement scatter: the ball goes roughly where it was
aimed, a bit off.

**What it leaves out.** Real players also mishit (frame the ball, net it,
mistime it), independent of where they aim. As a result, central targets show
P(in) close to 100% even for club-level accuracy, which is optimistic.

**How it could be modeled.** A hitter consistency h (0–1), like the opponent's:

    P(in) = h × (share of draws that land in)

**Why it is left out: it doesn't change the recommended aim.** If h is the
same for every aim, it scales P(in) and P(win) equally:

    value = h·P(win) − λ·(1 − h·P(in)) = h·[P(win) + λ·P(in)] − λ

The aim that maximizes this is the aim that maximizes P(win) + λ·P(in), which
doesn't depend on h. A uniform mishit rate therefore only changes the displayed
percentages, never the recommendation.

**When it would matter.** If the mishit rate depended on the shot, for example
more mishits when hitting harder or aiming closer to the lines. That is a
possible post-MVP extension (speed–accuracy trade-off).

## Opponent coverage is derived, not set

Coverage is computed from running speed and flight time
(coverage = run speed × distance ÷ ball speed) rather than set as a fixed
radius, so that shot depth and ball speed affect the opponent's reach.
A deep ball gives the opponent more time; a short or fast ball gives less.

## Known limitation: the opponent meets the ball where it lands

**What the model does.** The opponent's coverage is computed from the ball's
flight time to the landing point, and the gap is measured from the opponent
to the landing point.

**What really happens.** The opponent hits the ball after the bounce. The ball
keeps travelling roughly in the same direction for another 1–5 m, depending
on spin, speed and surface. That gives the opponent more time, and they can
choose the easiest point along the ball's path after the bounce, not just the
landing spot.

**What partly absorbs it today.** The ball speed is an illustrative average
that includes the bounce, and the reach steepness adds uncertainty around the
edge of the opponent's reach.

**Possible ways to model it, from simple to realistic:**
1. Extra time after the bounce:
   coverage = run speed × (flight time + t_bounce), with t_bounce ≈ 0.3–0.5 s.
2. A contact point further along the shot: measure the gap to
   landing + d × along, where d is how far the ball travels after the bounce.
3. The best interception point: check several points along the path after
   the bounce and use the one the opponent reaches most easily.

**Likely next step:** option 1, followed by a sensitivity check. Does the
recommended aim move noticeably? If not, the simplification doesn't change
the conclusion.

**Possible future link:** bounce behavior is where the court surface could
reasonably affect the model (clay: higher, slower bounce, so more time;
grass: lower, faster bounce, so less time). Currently the surface only
changes the court's appearance, by design.
