# express-weather-proxy: ground truth

> **This is the answer sheet. Do not show it to an agent you are evaluating.**

An 89-line Express service that proxies the public Open-Meteo API. It has
**27 defects**, listed below with the evidence for each.

Every finding is marked:

- **VERIFIED**: reproduced by running something. The command is included, so
  you can check it yourself in a few seconds.
- **REASONED**: derived from reading the code, with the reasoning stated.

All VERIFIED entries were re-run against this exact source on 2026-08-20 with
Node 22.

---

## Why this codebase

It is a **proxy**, which is a specific bug archetype: it inherits two failure
domains, its caller's input and its upstream's behaviour, and almost every real
defect lives on the seam between them. Whose fault was this error, how long do
we wait for them, and what do we assume about their response shape.

It is also small enough to read in one sitting, so you can check this file
rather than trusting it.

---

## The three that separate agents

Most agents find the obvious ones. These are the separators.

**Finding 13 (humidity)** is the hardest defect here. The code is **correct
today** and breaks on a one-word change nobody would think twice about. An agent
that reads the code and reasons about it will usually get this wrong in one of
two ways: either it declares the code broken (it is not, today), or it declares
it fine (it is not, structurally). Getting it right requires querying the API and
noticing what the default timezone is.

**Finding 14 (fetch timeout)** cannot be found by reading carefully. It is an
absence, and absences are what careful readers miss.

**Finding 20 (`?? null`)** is only a defect *in combination with* Finding 13. On
its own it is ordinary defensive code. An agent has to connect two findings to
see it.

---

## server.js

### 1. Hardcoded port, no `process.env.PORT`
`server.js:3`, `const PORT = 3001;`

Every container platform assigns a port through the environment and health-checks
that port. A hardcoded one means the platform routes to a port nothing is
listening on, so the deploy reports success while all traffic fails.

**Severity: High.** REASONED.

### 2. No error handler on `app.listen`, and it crashes
`server.js:5`

```bash
# occupy the port, then start the server
node -e "require('net').createServer().listen(3001,()=>setTimeout(()=>{},3000))" &
npm start
```

Observed: exit code 1, `Unhandled 'error' event`, raw stack trace, no actionable
message.

**Severity: Medium.** VERIFIED.

### 3. The startup log claims success before the server has bound, and lies when it fails
`server.js:9`

`console.log` on line 9 is synchronous and runs before the `listen` callback on
lines 5-7. Observed output on a clean start is inverted:

```
1. Backend running on port 3001     <- line 9
2. Server listening on port 3001    <- line 6, the callback
```

And with the port already taken, `Backend running on port 3001` still prints,
immediately before the crash. Any log-scraping readiness check is fooled.

**Severity: Medium.** VERIFIED.

### 4. `app.listen` return value discarded
`server.js:5`

`app.listen()` returns an `http.Server`. Nothing captures it, so there is no
handle to attach an error listener to (Finding 2) or to call `.close()` on
(Finding 5). This is the structural defect that makes both of those unfixable
without changing this line first.

**Severity: Low** on its own, and it is the enabler for two Mediums.
REASONED.

### 5. No `SIGTERM` / `SIGINT` handling
`server.js`

No signal handlers exist, so every deploy, scale-down or container reschedule
severs in-flight requests instead of draining them.

**Severity: Low.** REASONED.

---

## app.js

### 6. Wildcard CORS
`app.js:6`, `app.use(cors())`

With no options, `cors()` sends `Access-Control-Allow-Origin: *` on every
response. The only route is an unauthenticated passthrough to a third-party API,
so anyone who finds the URL can use this deployment as a free relay: it burns
your upstream quota and risks your egress IP being rate-limited, which takes down
your real users.

```
$ curl -i -H "Origin: http://evil.example" localhost:3001/health
access-control-allow-origin: *
```

**Severity: Medium** in this testbed as written, since there is no auth and no
private data to expose. Higher the moment either exists.
VERIFIED.

### 7. Framework version advertised, and no security headers
`app.js`, nothing sets headers and no `helmet`

```
$ curl -i localhost:3001/health
x-powered-by: Express
```

`X-Powered-By` is on by default and tells a scanner what you are running. There
is also no `X-Content-Type-Options`, `X-Frame-Options`, or CSP.

**Severity: Low.** VERIFIED.

### 8. A malformed request body is reported as a server error
`app.js:7` with `app.js:22-25`

```bash
curl -i -X POST localhost:3001/health -H 'content-type: application/json' -d '{bad'
```

Observed: `500 {"error":"Internal server error"}`.

`express.json()` throws a `SyntaxError` for bad client input. The global handler
hardcodes 500 without inspecting `err.status` or `err.type`, so a client's
malformed body is reported as our fault. Callers retry something that can never
succeed, and it pollutes your error budget.

**Severity: Medium.** VERIFIED.

### 9. The error handler assumes it was given an `Error`
`app.js:23`, `console.error(err.stack)`

A thrown string or a rejected non-Error has no `.stack`, so the only diagnostic
you had logs as `undefined`.

**Severity: Low.** REASONED.

### 10. `express.json()` is registered but no route reads a body
`app.js:7`

No handler touches `req.body`. The middleware adds nothing except the failure
mode in Finding 8 and a small parsing surface on every request.

**Severity: Low.** REASONED.

### 11. A wrong method returns 404 rather than 405
`app.js:17-19` with `routes/weather.js:5`

```bash
curl -i -X POST 'localhost:3001/api/weather?lat=51.5&lon=-0.1'
```

Observed: `404 {"error":"Not found"}`. The path exists; the method does not.
A caller is told the endpoint is missing when it is not.

**Severity: Low.** VERIFIED.

### 12. No `trust proxy`, so `req.ip` is wrong behind one
`app.js`

Express does not trust `X-Forwarded-For` unless told to. Behind any load
balancer, every request appears to come from the proxy. Anything built on client
IP later (rate limiting, geo, abuse) is silently wrong.

**Severity: Low.** REASONED.

---

## routes/weather.js

### 13. Humidity is indexed by UTC hour, and is correct only by accident
`weather.js:32-35`

```js
const now = new Date();
const currentHour = now.getUTCHours();
const humidity = data.hourly?.relativehumidity_2m?.[currentHour] ?? null;
```

The code indexes the hourly array by hour-of-day. That happens to be right
**only because Open-Meteo defaults to GMT when no timezone parameter is sent**,
which makes hour-of-day and array index coincide. Nothing in the code says so.

Verified against the live API for Tokyo (UTC+9):

```
no timezone parameter        timezone: GMT         picks time[13] = 13:00  humidity 89
                                                   correct slot   = [13]   humidity 89   correct

with &timezone=auto          timezone: Asia/Tokyo  picks time[13] = 13:00  humidity 62
                                                   correct slot   = [22]   humidity 89   WRONG
```

Adding `&timezone=auto`, which is exactly what you would do to make `is_day`
trustworthy, silently returns humidity from nine hours earlier. It also breaks by
24 slots per day if `past_days` is ever added.

The array carries its own `time` field. That is what should be searched.

**Severity: High.** This is the worst failure shape an API can have: a 200 with
confident, wrong data. VERIFIED.

Reproduce:

```bash
node -e "
const B='https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.69&current_weather=true&hourly=relativehumidity_2m';
(async()=>{for(const tz of ['','&timezone=auto']){
  const d=await (await fetch(B+tz)).json(); const i=new Date().getUTCHours();
  const right=d.hourly.time.indexOf(d.current_weather.time.slice(0,13)+':00');
  console.log(tz||'(none)','tz:',d.timezone,'code picks',d.hourly.relativehumidity_2m[i],'correct',d.hourly.relativehumidity_2m[right]);
}})()"
```

### 14. The upstream `fetch` has no timeout
`weather.js:17`

No `AbortController`, no `signal`, no deadline. Node's undici defaults headers
and body timeouts to roughly 300 seconds, so a hanging upstream pins the request,
its socket and its memory for up to five minutes. The route has no upper bound on
its own latency, which is a denial-of-service vector and, on per-millisecond
billing, a direct cost bug.

**Severity: High.** REASONED from the code plus undici defaults.

### 15. `parseFloat` accepts trailing garbage and returns weather for the wrong place
`weather.js:8-9`, guarded at `11`

```
parseFloat("12abc")   -> 12       passes Number.isNaN guard
parseFloat("51.5abc") -> 51.5     passes
parseFloat("051.5")   -> 51.5     passes
parseFloat("5.15e1")  -> 51.5     passes
parseFloat("51.5\n")  -> 51.5     passes
```

`GET /api/weather?lat=12abc&lon=77xyz` returns 200 with weather for latitude 12.
The request was nonsense and the caller has no way to tell.

**Severity: High.** Silent wrong data beats a crash for damage.
VERIFIED.

### 16. `Infinity` passes the `Number.isNaN` guard
`weather.js:11`

```
parseFloat("Infinity")  -> Infinity    Number.isNaN(Infinity) === false
parseFloat("-Infinity") -> -Infinity   passes
```

`Number.isFinite` on a strict parse is the check this wanted.

**Severity: Medium.** VERIFIED.

### 17. No coordinate range validation, so a client error is reported as an upstream failure
`weather.js:11-13` with `19-21`

Latitude is not checked against -90..90, nor longitude against -180..180.
Out-of-range values are forwarded, Open-Meteo answers 400, and line 20 turns that
into **502**.

This is wrong three ways: the caller is told to retry something that can never
succeed, your dashboards attribute your users' typos to an upstream outage, and
a real Open-Meteo incident is hidden in that same noise.

**Severity: Medium.** VERIFIED.

### 18. The internal error message is returned to the client
`weather.js:39`, `err.message`

Whatever the runtime threw goes to the caller verbatim: DNS failures, TLS
errors, file paths. It also contradicts the deliberate choice at `app.js:24` to
return a generic message.

**Severity: Medium.** REASONED.

### 19. Upstream failures are never logged
`weather.js:38-40`

The catch block has no `console.error`, unlike the global handler at
`app.js:23`. Network-layer failures vanish with no server-side trace, so an
outage cannot be diagnosed afterwards. They are also classified 500 when the
failure is upstream, which is 502 or 504.

**Severity: Medium.** REASONED.

### 20. `?? null` makes a broken lookup and genuinely absent data identical
`weather.js:34-35`

If the indexing in Finding 13 misfires, the fallback quietly emits `null` and the
consumer renders it as "no data". A broken proxy and a real gap in the upstream
look exactly the same to every caller, and nothing is logged.

**This is a defect only in combination with Finding 13.** On its own it is
ordinary defensive code. That is what makes it a good separator: it requires
connecting two findings.

**Severity: Medium** given Finding 13. REASONED.

### 21. Repeated query parameters are silently coerced
`weather.js:6`

Express parses `?lat=1&lat=2` into an array. `parseFloat(["1","2"])` stringifies
to `"1,2"` and yields `1`.

```
parseFloat(["1","2"])  -> 1
parseFloat(["51.5"])   -> 51.5
```

Ambiguous input should be rejected, not silently resolved to one of the values.

**Severity: Low.** VERIFIED.

### 22. The `||` fallback on line 39 is unreachable for real Errors
`weather.js:39`, `err.message || 'Failed to fetch weather data'`

`Error.prototype.message` is always a string, and every error thrown here is an
Error, so the fallback only fires for a thrown non-Error. It reads as a safety
net and is not one.

**Severity: Low.** REASONED.

### 23. Destructuring assumes every field is present
`weather.js:29`

If Open-Meteo omits a field, the corresponding variable is `undefined`, and
`res.json` omits undefined values entirely. The client receives an object missing
keys it expected, with no error raised.

**Severity: Low.** REASONED.

### 24. The response drops the observation timestamp
`weather.js:29, 37`

`current_weather.time` and `interval` are read and discarded. The upstream
reading can be up to 15 minutes old and the client is given no way to know, so a
stale reading is presented as current.

**Severity: Low.** REASONED.

---

## package.json

### 25. No `engines` field, while the code needs Node 18+
`package.json`

`fetch` at `weather.js:17` is a global from Node 18. Nothing declares that, so an
older runtime installs cleanly and then fails on every request with
`fetch is not defined`.

**Severity: Low.** REASONED.

### 26. `"main": "src/server.js"` starts a live server on `require()`
`package.json:6`

```
$ node -e "require('./src/server.js')"
Backend running on port 3001
Server listening on port 3001
-> a listener is now bound to 3001
```

Requiring the package for any reason, including importing it to write a test,
boots a server and holds the process open. `app.js` is the importable half and
`server.js` should be guarded by `require.main === module`.

**Severity: Medium.** It is the reason the project cannot be tested.
VERIFIED.

### 27. No test script and no tests
`package.json:7-9`

Only `start` is defined.

**Severity: Low.** VERIFIED.

---

## Things that look like defects and are not

Worth checking separately. An agent that reports any of these is
pattern-matching rather than reading, and the last two are outright wrong.

**The error handler is NOT unreachable.** It is mounted at `app.js:22-25`, after
the 404 catch-all at `17-19`, which looks like a shadowing bug. Express dispatches
error middleware by **arity**: on `next(err)` it skips 2 and 3-argument middleware
and looks for a 4-argument one. Verified: the malformed-body request in Finding 8
returns our JSON `{"error":"Internal server error"}`, not Express's built-in HTML
page, which proves the custom handler ran.

**The URL is not an injection risk.** `weather.js:16` interpolates into a
template literal without `encodeURIComponent`, but `latitude` and `longitude` are
the output of `parseFloat`, so they are numbers by the time they get there. An
agent flagging this has matched a shape rather than followed the values.

**`parseFloat("")` does not return 0.** It returns `NaN`, so an empty `lat` is
correctly rejected with a 400. Verified.

**`parseFloat("0x28")` does not return 40.** It returns `0`: `parseFloat` reads
until it hits a non-numeric character, so it takes the `0` and stops at `x`. Only
`parseInt("0x28", 16)` gives 40. The input is still wrongly accepted, but the
mechanism is Finding 15, not hex parsing. Verified.

---

## Summary

| Severity | Count | Findings |
|---|:--:|---|
| High | 4 | 1, 13, 14, 15 |
| Medium | 10 | 2, 3, 6, 8, 16, 17, 18, 19, 20, 26 |
| Low | 13 | 4, 5, 7, 9, 10, 11, 12, 21, 22, 23, 24, 25, 27 |

Severity is judged on **who is affected and when they find out**. A defect that
fails silently outranks one that crashes in front of an operator, which is why
Finding 13 is High and Finding 2 is Medium: a crash is loud and immediate, and
wrong humidity is neither.
