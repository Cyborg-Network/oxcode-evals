# OxCode Evals

Reproducible evaluations for coding agents, with **verified ground truth**.

Every eval here gives you three things: a small real codebase, the exact prompt
to hand an agent, and a list of the defects that codebase actually contains,
each one checked against the source rather than asserted.

Run any agent you like against them. We publish our own results, but the point
of this repository is the ground truth, not the scoreboard.

---

## Why ground truth is the hard part

It is easy to ask an agent to review some code. It is hard to know whether its
answer was any good.

The usual shortcut is to ask a model to grade the output. That collapses two
things worth separating: **what an agent found**, and **whether what it said was
true**. An agent reporting 25 findings with two errors is not better than one
reporting 22 with none, and a single number cannot tell you which you are
looking at.

So these evals work the other way round. The answers are established first, by
hand, against the code, with the evidence recorded. Then an agent's output is
checked against them.

Each finding is marked:

- **VERIFIED**: reproduced by running something. The command is included.
- **REASONED**: derived from reading the code, with the reasoning stated.

If you disagree with an entry, the evidence is there to argue with, which is the
whole idea.

---

## The evals

| Eval | Codebase | Defects | What it is good at separating |
|---|---|:--:|---|
| [express-weather-proxy](evals/express-weather-proxy) | 89 lines of Node/Express | 27 | Agents that read code from agents that run it |

More to come. Each is deliberately small enough to hold in your head, because an
eval you cannot check by hand is one you have to take on faith.

---

## Running one

```bash
cd evals/express-weather-proxy/backend
npm install
```

Then give your agent the contents of
[`PROMPT.md`](evals/express-weather-proxy/PROMPT.md), unchanged, pointed at that
`backend/` directory.

Then compare its output against
[the ground truth](evals/express-weather-proxy/README.md).

**Do not show the agent the ground truth.** That file is the answer sheet.

---

## Scoring it yourself

There is no scoring script, on purpose. A single number hides the thing that
actually matters, which is *which* defects an agent found and *how* it justified
them.

What we suggest looking at:

- **Coverage.** How many of the 27 did it find?
- **Correctness.** Did it report anything that is not true? One confident wrong
  finding costs more trust than three missed ones.
- **Evidence.** Did it run the code, or only read it? Several of these defects
  are invisible without executing something.
- **The hard ones.** Findings 13, 14 and 20 are the separators. Most agents
  miss at least one, and Finding 13 in particular is only visible if the agent
  questions an assumption that currently holds.

---

## Results

Two agents, mapped to the same 27 findings so they read side by side:

| Agent | Found | Incorrect findings |
|---|:--:|:--:|
| [OxCode 0.5.0](evals/express-weather-proxy/results/oxcode.md) | 24 / 27 | 0 |
| [Claude Code](evals/express-weather-proxy/results/claude-code.md) | 21 / 27 | 0 |

Both found all four High-severity defects and all three separators. The
differences are in the Low findings and in how each one justified its work,
which is why each result file says what the agent did well rather than only
counting.

[How these are produced](evals/express-weather-proxy/results/METHODOLOGY.md),
including the fact that we developed OxCode against this eval.

Run your own and compare against the same list. That is what the repository is
for.

---

## Contributing an eval

The bar is the ground truth, not the codebase. A good eval has:

- a small codebase somebody can read in one sitting
- defects that are genuinely there, each with evidence
- a prompt that does not hint at the answers
- at least one defect that is invisible without running the code

Open an issue before writing one, so we can agree it separates something worth
separating.

---

## Licence

The eval codebases are deliberately small and are provided for evaluation use.
