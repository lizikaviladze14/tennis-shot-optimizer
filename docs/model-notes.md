# Model notes

How much each illustrative parameter matters: see docs/sensitivity.md.

Detailed adds more factors (shot types, bounce, rally value); it is not a claim that results match real tennis. All parameters are illustrative.

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

## Opponent interception: Simple vs Detailed

**Simple mode.** Coverage uses the ball's flight time to the landing point,
and the gap is measured from the opponent to that landing spot.

**Detailed mode.** The opponent can meet the ball anywhere along its path
after the bounce within a short playable window. The model picks the easiest
interception point for them.

**Still left out.** Spin direction, net clearance, anticipation, and recovery
between shots. Court surface still only changes the court's appearance.

**Possible future link:** bounce behavior is where the court surface could
reasonably affect the model (clay: higher, slower bounce, so more time;
grass: lower, faster bounce, so less time).

## Shot types fix the short-ball problem

A constant ball speed made short balls arrive almost instantly, so the model
over-recommended them (a baseline drop shot scored 91% to win). In Detailed
mode, each shot type multiplies the level's speed and errors, and has a range
of depths it can land in; the search only tries targets in that range.
Simple mode keeps the original behavior: one speed, the whole court.

## The opponent can play the ball after the bounce

After landing, the ball keeps travelling in the same direction for a
playable window (PLAYABLE_WINDOW_S = 0.4 s, illustrative) at
ball speed × the shot type's afterBounceSpeedFactor. The model checks five
points along that path and uses the one easiest for the opponent to reach.
This fixed the remaining short-ball bias: a fast drive landing short keeps
travelling toward the opponent, so it's easier to return than its landing
spot suggests. Simple mode uses a window of 0 (the opponent must reach the
landing point). Sideways kicks from sidespin aren't modeled.

## Shorter targets mean slower balls

With one speed per shot type, a drive landing just past the service line still
travelled at full pace, so the search always picked the shortest allowed depth
(the answer sat on the range boundary in every setup). In reality a short
drive must be hit slower to clear the net and come down in time. In Detailed
mode, speed now grows linearly from minDepthSpeedFactor at the shot type's
shortest depth to full speed at its deepest. Net clearance itself (balls
hitting the net) is still not modeled.

## Returned balls have value, and deep returns are worth more

A returned ball used to score 0 regardless of where it landed, so short balls
that were safe to land looked best for less accurate players. In Detailed
mode a returned ball is worth q, the chance to still win the rally: 0.2 for a
ball landing at the net, rising linearly to 0.5 at the baseline (illustrative),
measured at the actual landing. A landing's contribution is
1 − (1 − q) × P(return), and the search maximizes P(rally win) − λ·P(miss).
Losing the rally after a return scores 0, not −λ.
