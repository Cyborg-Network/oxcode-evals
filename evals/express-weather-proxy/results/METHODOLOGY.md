# How results here are produced

Short, because the interesting document in this repository is
[the ground truth](../README.md), not this one.

## The rule

An agent's output is compared against the 27 verified defects, by number. That
is the whole method.

We do not ask a model to read the report and award a score. A grade is a single
number standing in for two different things that matter separately: **what an
agent found**, and **whether what it said was true**. An agent that reports 25
findings with two errors is not better than one that reports 22 with none, and a
single score cannot tell you which you are looking at.

## What is recorded for each run

- **Coverage**: which of the 27 it found, listed by number so you can check.
- **Incorrect findings**: anything it asserted that is not true, listed in full.
- **Evidence**: whether it ran the code or only read it. Several defects here are
  invisible without executing something, so this separates agents more sharply
  than coverage does.
- **The three hard ones**: findings 13, 14 and 20, called out by name.

## Two things to know when reading our numbers

**We developed this agent against this eval.** OxCode was worked on with this
codebase in front of us. That is worth knowing before comparing its coverage to
anything else, and it is why the ground truth and the prompt are published in
full: the reusable part is the eval, not our result.

**The prompt is fixed.** Every agent gets the text in [`../PROMPT.md`](../PROMPT.md)
unchanged, with no hint about how many defects exist or which files matter.

## Results

- [`oxcode.md`](oxcode.md)
- [`claude-code.md`](claude-code.md)

Both are mapped to the same 27 findings, so they can be read side by side. Run
your own and compare against the same list.
