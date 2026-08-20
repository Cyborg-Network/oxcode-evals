# Claude Code

Run with the prompt in [`../PROMPT.md`](../PROMPT.md), unchanged, against the
`backend/` directory in this eval.

Mapped to the same 27 findings as [`oxcode.md`](oxcode.md), so the two can be
read side by side.

---

## What it found

**21 of the 27 defects**, including all four High-severity ones and all three of
the separators (13 humidity, 14 fetch timeout, 20 `?? null`).

**Zero incorrect findings.**

| | |
|---|---|
| Found | 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25 |
| Missed | 4, 12, 22, 23, 26, 27 |
| Wrong | none |

It booted the server and probed each edge case rather than reasoning about them,
and it marked which findings were observed and which were derived from reading.

---

## Where it was strongest

**Finding 13, the humidity indexing.** This is the best treatment of that defect
we have seen from any agent. It did not stop at proving the code works today: it
queried the API, established that Open-Meteo defaults to GMT, and named the
failure class rather than just the symptom.

> *"Correct by accident is the hardest bug class to see. It passes every test
> you would write today. It only fails when someone makes an unrelated,
> reasonable change."*

And it prescribed the structural fix rather than a patch:

> *"The fix isn't a bounds check, it's removing the coupling by asking the
> response where 'now' is instead of asking the server."*

**It composed related defects instead of listing them.** Findings 6, 7 and the
absence of caching were reported as one High-severity finding about an
unauthenticated, unthrottled, uncached open proxy, rather than three separate
Mediums. That is a more useful shape for a reader who has to decide what to fix.

**It connected findings 13 and 20 unprompted**, noting that the `?? null`
fallback is what stops the indexing bug from ever being noticed.

---

## Where it was weaker

- The six it missed are all Low except **26** (`"main"` starting a live server on
  `require`), which is the reason the project cannot be tested and is arguably
  the most consequential of the six.
- **12** (`trust proxy`) and **4** (discarded `listen` return value) are both
  absences, which is the category every agent finds hardest.
- It reported fewer findings overall, though with no loss of accuracy.

---

## Reproducing

```bash
cd evals/express-weather-proxy/backend
npm install
```

Give the agent [`../PROMPT.md`](../PROMPT.md) and compare its output against
[the ground truth](../README.md).
