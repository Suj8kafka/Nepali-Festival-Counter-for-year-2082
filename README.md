# Utsav — Nepali Festival Countdown

A responsive festival calendar for Nepal, redesigned from the original Nepali Festival Counter. Festival dates are checked against Hamro Patro and updated automatically. The current edition and any complete published next-year edition are included.

## Run locally

Requires Node.js 18 or newer. There are no packages to install and no build step.

~~~sh
npm start
~~~

Open **http://127.0.0.1:4173**. You can also open index.html directly; it uses the bundled festival snapshot instead of fetching the CSV.

## Features

- An illustrated Kathmandu landscape with seven artwork layers and dedicated mobile compositions: sky, snowy Himalayas, green forest ridges, concrete neighborhoods, Newar pagodas, a white stupa, and foreground trees. A shared page-aligned camera keeps the skyline against its supporting hills. Sky, mountains, and distant hills have pronounced eased depth movement. The near ridge uses a separate low depth so the skyline remains grounded against it. The scene stays clipped explicitly to the hero. Neighborhoods, temples, and the foreground form one local ground plane and scroll together with the document, preserving their alignment. Hidden mobile/desktop variants are skipped, and the animation loop stops when settled or offscreen. The document keeps native scrolling.
- The next festival and live countdown sit immediately below the parallax landscape in a contrasting plum section. The calendar uses warm ivory, charcoal, vermilion, and marigold, independently of the natural landscape colors.
- Manrope for festival names and controls, Barlow Condensed for the landscape title and countdown, and Noto Sans Devanagari for Nepali text. Main and secondary festival text are checked for at least 4.5:1 contrast.
- A dated festival list with upcoming and past counts, newest-first past dates, and time remaining or days elapsed.
- A motion toggle and automatic respect for the system reduced-motion setting.
- Nepal time throughout, regardless of the visitor’s timezone. Festivals stay marked as happening today until the next midnight in Nepal.
- Search across festival names, Nepali names, and other observances on the same day.
- Upcoming, all, and past filters, plus Nepali month filters.
- Festival lists and a navigable Gregorian calendar with Nepali dates in event details.
- Individual and complete calendar downloads in the standard .ics format.
- Keyboard accessible festival dialogs, responsive layouts, and reduced-motion support.
- An offline snapshot that matches the current CSV.
- A prominent total visits count, existing session visit counts, and Firebase statistics shared with the original site. The last successful total is cached for offline use. Statistics load independently and cannot prevent the site from working.

## Automatic date updates

The GitHub Actions workflow in [.github/workflows/calendar.yml](.github/workflows/calendar.yml) runs daily at **19:37 UTC / 01:22 Nepal time** and can also be run from the repository's Actions tab. It:

1. Runs the scraper regression tests.
2. Fetches Hamro Patro's English public holidays page and checks the next-year page.
3. Validates Gregorian dates, weekdays, Nepali year/month/day fields, complete-year coverage, and unexpected data loss.
4. Updates nepali_holidays.csv, festival-data.js, and festival-meta.json together.
5. Runs the JavaScript/date tests and commits the verified data and last-checked timestamp.
6. Publishes the same verified files to GitHub Pages in the same workflow run.

The last step is explicit: a commit made with GITHUB_TOKEN does not trigger a separate push workflow. Daily successful metadata commits also keep the repository active between changes to the holiday dates. GitHub can delay scheduled jobs; this is a daily refresh, not a real-time source connection.

The site needs no server, database, secret API key, or computer left running. It checks the static CSV when opened, every six hours while open, and when returning to an old tab. Countdown calculations use midnight in Nepal, independent of the visitor's timezone. If the source is unavailable or malformed, no updated data is committed or deployed and the last good site remains online. The source/last-checked date is shown below the calendar. Check the Actions tab for a failed refresh.

Next-year dates are included only after Hamro Patro publishes a complete calendar. An empty next-year page is expected and is checked again the following day. Year badges and calendar descriptions come from the data. No lunar dates or future festival dates are guessed.

## Run a refresh locally

Python 3.10 or newer is required for the scraper. It uses only the Python standard library.

~~~sh
python py.py
npm test
npm run build
~~~

On Windows, use py py.py or the project's virtual-environment Python if python is not on PATH. npm run update:calendar is an alias for python py.py. npm run update:data is retained for deliberately maintained CSV edits; manually edited data is no longer labelled as checked against Hamro Patro until a successful scrape replaces it.

The historical CSV parser also accepts the original shifted columns. Source presentation is configured in CATALOG in script.js. Image source notes are in assets/README.md.

## Verify

~~~sh
npm run check
npm test
python -m unittest discover -s tools -p test_scraper.py -v
npm run test:browser
npm run build
~~~

The browser check needs Node.js 22 or newer, npm start running and an installed Chrome or Edge. Set CHROME_PATH for a browser in a different location, or UTSAV_TEST_URL for another preview address. It tests the UI and parallax with a fixed reference date, checks city-to-hill alignment across the scroll and opaque terrain beneath the skyline, blocks analytics and visitor writes, checks mobile widths, and saves screenshots and calendar downloads under the ignored .artifacts directory.

## Project files

- index.html — page structure and metadata.
- styles.css — the Utsav design and responsive layouts.
- script.js — CSV parsing, date logic, discovery, dialogs, and calendar export.
- festival-data.js — generated offline snapshot.
- visitors.js — optional existing Firebase visitor integration.
- nepali_holidays.csv — maintained festival dates.
- tools/ — dependency-free development and verification utilities.
- py.py — validated Hamro Patro scraper and atomic file preparation.
- festival-meta.json — source, checked timestamp, coverage, and CSV checksum.
- .github/workflows/calendar.yml — daily refresh, validation, and Pages deployment.
- tools/build-static.cjs — explicit allowlist for public deployment files.

The separate figma.html and z.html drafts are not part of the festival application.

## Original site archive

The footer's **Archived** link opens archive/index.html. This snapshot preserves the original red design and its script, dates, logo, and favicon from Git commit 8512d91, with a return link to the current site. Both versions use the existing Firebase visitors collection.
