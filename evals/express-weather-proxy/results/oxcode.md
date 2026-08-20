# OxCode 0.5.0

Run on 2026-08-20 with the prompt in [`../PROMPT.md`](../PROMPT.md), unchanged,
against the `backend/` directory in this eval.

Read [`METHODOLOGY.md`](METHODOLOGY.md) first. We wrote this eval and tuned
against it, so treat this as a record of what one agent did, not as a claim about
which agent is better.

---

## What it found

**24 of the 27 defects**, including all four High-severity ones and all three of
the separators (13 humidity, 14 fetch timeout, 20 `?? null`).

**Zero incorrect findings.**

| | |
|---|---|
| Found | 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27 |
| Missed | 10 (`express.json` dead surface), 12 (`trust proxy`), 24 (dropped timestamp) |
| Wrong | none |

It ran roughly 40 probes against a live instance, which is how it reached 13,
15, 16, 17 and 21.

---

## The two things worth reading the transcript for

**It retracted its own finding.** Mid-run it theorised that `parseFloat("")`
returns `0`, which would mean an empty `lat` passes validation. A probe returned
400, contradicting the theory. It checked directly, found `parseFloat("")` is
`NaN`, checked whitespace and tab and newline as well, and then dropped the
finding rather than reporting it:

> *"Interesting, `parseFloat("")` returns NaN in Node.js 22, not 0. My earlier
> reasoning was wrong."*

That is the behaviour we most wanted, because a confident wrong finding is the
expensive failure in an audit. It is also the exact trap recorded in the ground
truth under "things that look like defects and are not".

**It reported which defects hide which.** Finding 20 is only a defect in
combination with Finding 13, and it connected them explicitly rather than listing
both and leaving the reader to notice:

> *"The `?? null` fallback makes the wrong value look intentionally absent."*

---

## Where it was weaker

- Its framing of Finding 13 was **abstractly right and empirically thin**. It
  said the hourly array is indexed by forecast time step rather than hour of day,
  which is correct, but it did not do what the ground truth does: query the API
  with and without `&timezone=auto` and show the humidity changing. Right
  conclusion, weaker proof.
- The three it missed are all Low, and two of them (10, 12) are absences rather
  than anything visible in the code it read.
- Severity on Finding 2 was debated across runs. We settled on Medium in the
  ground truth because the crash is loud and immediate, and an operator sees it.

---

## Reproducing

```bash
cd evals/express-weather-proxy/backend
npm install
```

Give the agent [`../PROMPT.md`](../PROMPT.md) and compare against
[the ground truth](../README.md).
