# Lekcijas

Mobile-first, independent LBTU lecture timetable built with React, TypeScript, Tailwind CSS 4, daisyUI 5, and Vite. It is not an official LBTU product.

The deployed application is entirely static. It has no API server, proxy, database, university login, or direct browser dependency on LBTU CORS support.

## Commands

Requires a current Node.js release supported by Vite 8.

```bash
npm install
npm run data:update
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

Browser checks use a locally installed Google Chrome:

```bash
npm run test:e2e
```

Update only one or several programmes while developing:

```bash
npm run data:update -- --programme G0903
npm run data:update -- --programme G0903,G0907
```

There are no required environment variables and no secrets should be added. A routine `npm run build` reuses the last successful repository snapshot and does not contact LBTU.

## Data Workflow

The updater reads LBTU's public programme directory at <https://lais.lbtu.lv/luis/lsarG.html>. It parses faculty rows, programme codes and names, full-time/part-time columns, academic-period IDs, programme-semester IDs, study-mode IDs, and original source URLs. It then downloads each selected public timetable, discovers group IDs from that exact page, and creates group snapshots where offered.

The HTML is parsed as a DOM with Cheerio. A timetable table is accepted only when recognizable Latvian weekday headings and time rows exist. Each course link starts a separate cell entry. Strict date tokens, ranges, alternating-week labels, lesson types, names, locations, subgroup notes, source notes, and URLs are normalized without guessing unknown values. Error/login/unrecognized pages are errors, not empty schedules; a recognized table containing no entries is a published empty schedule.

The output is:

- `public/data/catalogue.json`: compact source-derived catalogue and snapshot references.
- `public/data/snapshots/*.json`: separate content-versioned timetable files loaded only for the selected programme, semester, mode, and group.

Fetching uses concurrency 2, a 20-second timeout, two retries, a small inter-request delay, and an in-process URL cache. Snapshot files are written before the manifest. If an individual update fails, its prior successful reference, data, source URL, and original fetch timestamp are retained. A failed page is never replaced with an empty timetable. Old content-versioned files are intentionally retained so an older deployed/cached manifest is not left with a missing file.

The retained snapshot was completely regenerated from the Autumn 2026 directory on 2026-09-01 at approximately 23:12 UTC. The generated manifest contains 52 source programmes and all source selections that parsed successfully during that run. Every snapshot carries its own actual upstream `fetchedAt` timestamp; catalogue counts are never hardcoded.

## Freshness And Caching

The in-app **Refresh** button re-downloads `catalogue.json` and the referenced JSON from the currently deployed static origin. It does not scrape LBTU and does not make the university data live. University changes appear only after this workflow succeeds:

```bash
npm run data:update
npm run build
# deploy dist/
```

`public/_headers` supplies a cache policy for hosts that support Netlify-style headers: the manifest must revalidate, while content-versioned snapshots are immutable. Configure equivalent headers on other hosts. The UI displays the selected snapshot's successful source fetch time, not the browser load time.

A future CI job could run the same update, tests, build, and static deployment on a schedule. No scheduled workflow is included or enabled.

## Date Expansion

All source values are treated as Europe/Riga wall-clock values. Date-only calculations use calendar arithmetic independent of the visitor's timezone, and Riga timestamps use `Intl` timezone conversion so seasonal offsets are not hardcoded.

- Explicit dates create only those listed dates.
- Inclusive ranges create entries only on the timetable column's weekday.
- Multiple ranges remain separate and preserve gaps.
- Subgroup numbers are not parsed as dates or week rules.
- Unknown/malformed date rules remain visible under **Dates need checking** and create no guessed occurrences.
- Alternating weeks require a verified period anchor. Autumn 2026 uses Monday 2026-09-07 as university week 1, based on the checked source evidence described in the product requirements. The partial week beginning 2026-08-31 is therefore week 2.

To add another period, add its official directory URL in `scripts/source-config.ts`. Configure `alternatingWeekAnchor` only after verifying the university week numbering against dated LBTU evidence. Without an anchor, alternating entries correctly remain uncertain.

## Preferences And Privacy

Language, theme, programme/period/mode/semester/group, and existing per-context course preferences are stored only in versioned localStorage under `lekcijas.preferences.v1`. Corrupt, old, missing, or blocked storage falls back safely. There is no account or cross-device synchronization. Stored course filtering changes only this app's view and does not register a student for university courses.

Latvian and the daisyUI `light` theme (shown as **White mode**) are the defaults when no preference has been saved. The navbar exposes direct LV/EN buttons and a scrollable daisyUI theme dropdown; changing either does not alter timetable selections.

New visitors receive a one-time theme chooser with live previews. Applying a theme persists `themeIntroSeen` and briefly highlights the navbar theme control; existing version-1 preferences are migrated as already seen so returning users are not interrupted.

## Static Deployment

Deploy only the contents of `dist/` to any static host. No development proxy or runtime Node process is needed. `npm run preview` was used to verify production JSON loading and refresh behavior as plain static files.

The default build targets a domain root. For a subpath deployment, pass the matching Vite base and ensure the host serves that directory:

```bash
npm run build -- --base=/lekcijas/
```

## Known Limitations

- Public programme schedules can contain more classes than a student's registered personal calendar. Course and group filters help, but are not LUIS registration.
- Complete cancellation, rescheduling, and personal-calendar reconciliation have not been verified in the public HTML. The model retains explicit unknown status and source notes but does not invent status colors or claim automatic detection.
- Browser requests directly to LBTU remain deliberately unused because deployed-origin CORS access has not been verified.
- Only the configured Autumn 2026 academic period is currently published. Old URLs are not automatically called current.
- Visual automation covers Chrome at 360px, 390px, and 1440px. Other browser engines were not installed in this environment.

## Verification

The current implementation passed:

- `npm test`: parser, generated-snapshot, recurrence, Riga timezone/DST, storage, and translation tests.
- `npm run lint`: ESLint with the existing React/TypeScript rules.
- `npm run build`: TypeScript project build and Vite production build.
- `npm run test:e2e`: production build served statically in Chrome; real G0907/G0903 snapshot loading, mobile overflow, selection restoration, navbar LV/EN controls, saved themes under OS dark preference, desktop week view, and every configured theme.

Fixtures used by parser tests are sanitized source-shaped HTML. Production data is generated only from the public LBTU pages and is kept separate from test fixtures.
