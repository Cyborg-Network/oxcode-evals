# How we evaluated, and where it is weak

Written down so you can discount it appropriately. The ground truth is the part
of this repository we stand behind; this file is how we used it.

---

## What we did

Twelve rounds against the same codebase and the same prompt, alternating between
running an agent and fixing whatever the round exposed in ours. Each round's
output was compared against the defects in
[the ground truth](../README.md).

## Three things worth knowing before you weigh any number we publish

**1. We wrote the eval and we tuned against it.**

Our agent was iterated against this specific codebase and this specific prompt
for twelve rounds. The other agent we measured was not. Any comparison across
that gap flatters us, and no amount of care in the scoring fixes it. That is the
main reason this repository leads with a ground truth rather than a scoreboard:
the ground truth is reusable and the comparison is not.

**2. We used a model to grade prose, and then measured the grader.**

For most of those rounds an LLM judge read each report and scored it. Late on, we
submitted **byte-identical output twice** and it came back **8.5 and then 8.0**.

Half a point of variance on unchanged input is larger than most of the
round-to-round differences we had been treating as progress. We had been reading
noise as signal for at least three rounds before we checked.

If you take one thing from this file: **measure your grader before you trust
your grades.** Run the same submission twice. It costs one extra run and it tells
you the size of the smallest difference you are entitled to believe.

**3. It graded us up when we showed it more.**

One round was scored 8.0 on a truncated paste, and 9.5 when the full output was
resubmitted, because a section it had marked as missing was present in the part
it had not seen. Same run, same code, different number. Worth knowing that these
scores are sensitive to what the grader was handed, not only to what the agent
produced.

---

## What we would do differently, and what we suggest instead

Checking output against a fixed list of verified defects is slower than asking a
model for a score, and it is the only part of this that survived contact with
scrutiny. So:

- **Count coverage against the ground truth.** How many of the 27, by number.
- **Count wrong findings separately, and weight them heavily.** One confident
  false claim costs more trust than three misses, because a reader who finds one
  error has to re-check everything else.
- **Note whether the agent ran anything.** Several defects here are invisible
  without executing code. This is the single clearest separator in this eval.
- **Look at the three hard ones by name** (13, 14, 20) rather than at a total.

None of that needs a judge model, and all of it is reproducible by someone who
does not trust us.

---

## Results

[`oxcode.md`](oxcode.md) records what our own agent found, by finding number.

We are not publishing a head-to-head table. We tuned against this eval and the
comparator did not, so the honest thing to publish is the ground truth and the
prompt. Run whichever agents you care about yourself: that takes about ten
minutes and it is worth more than our number.
