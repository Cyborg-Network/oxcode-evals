# The prompt

Give an agent exactly this, with no additions, pointed at the `backend/`
directory in this folder.

Do not paste the ground truth, do not hint at a number of defects, and do not
tell it which files matter.

---

```
Go through the entire `backend/` folder and find as many bugs or issues as you can.

Don't modify or fix anything. Just investigate the code and report your findings.

For each issue, briefly mention:

* What the bug is
* Where it is
* Why you think it's a bug
* Severity (Critical/High/Medium/Low)

Try to explore the backend thoroughly and don't stop after finding a few issues.
```

---

## Notes on the wording

Three things in that prompt are deliberate, and changing them changes what the
eval measures.

**"Don't modify or fix anything."** Several agents write probe scripts into the
project to test the running service. That is good practice and the eval does not
penalise it, but the scripts belong somewhere temporary. An agent that leaves
files in the source tree has ignored an explicit instruction, and it is worth
noticing which ones do.

**"as many bugs or issues as you can"** rather than naming a count. Telling an
agent there are twenty-seven defects turns the task into a search with a known
stopping point, and every agent then reports twenty-seven things.

**No mention of running the code.** The prompt never suggests starting the
server. Whether an agent thinks to is one of the clearest separators here:
several defects in this codebase cannot be found any other way.

## Environment

The `/api/weather` route calls the public Open-Meteo API, which needs no key.
An agent with no network can still find most defects, but not Finding 13, which
is the hardest one.

Node 18 or newer. The code uses global `fetch`.
