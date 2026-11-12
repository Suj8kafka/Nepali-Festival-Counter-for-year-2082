"""Network-free regression tests for the autonomous calendar refresh."""
import copy
import csv
import hashlib
import io
import json
import re
import sys
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import py as scraper

NOW = datetime(2026, 11, 12, 8, tzinfo=timezone.utc)
FIXTURE = json.loads((Path(__file__).parent / 'fixtures/festivals-2083.json').read_text(encoding='utf-8'))


def payload(year=2083, empty=False):
    months = {}
    if not empty:
        for record in FIXTURE:
            day, name, _ = record['nepaliDate'].split()
            month = scraper.MONTHS.index(name) + 1
            original = date.fromisoformat(record['date'])
            ad = original.replace(year=original.year + year - 2083)
            item = {'yearBs': year, 'monthBs': month, 'dayBs': int(day), 'titleEn': record['name'],
                    'weekdayEn': scraper.WEEKDAYS[ad.weekday()], 'adLabel': f'{scraper.AD_MONTHS[ad.month-1][:3]} {ad.day}, {ad.year}'}
            months.setdefault(month, {'monthBs': month, 'items': []})['items'].append(item)
    return {'page': 'holidays', 'locale': 'en', 'today': {'adKey': '2026-11-12', 'year_bs': year},
            'data': {'year': year, 'months': list(months.values()), 'ld': {'itemListElement': [{} for _ in ([] if empty else FIXTURE)]}}}


def html(data):
    return '<html><script id="hp-bootstrap" type="application/json">' + json.dumps(data) + '</script></html>'


def fetcher(current=None, following=None):
    current = current or payload()
    following = following if following is not None else payload(current['data']['year'] + 1, empty=True)
    return lambda url: html(current if url == scraper.SOURCE else following)


def fallback_payload(year=2083):
    items = []
    for record in scraper.parse_page(html(payload(year))).records:
        day, month, _ = record['nepaliDate'].split()
        items.append({'bs': f'{int(day):02}.{scraper.MONTHS.index(month)+1:02}.{year}',
                      'ad': record['date'], 'event_date': record['date'],
                      'description': json.dumps({'en': record['name']})})
    return items


def fallback_fetcher(current=None, following=None, current_year=2083):
    current = fallback_payload(current_year) if current is None else current
    following = [] if following is None else following
    return lambda url: json.dumps(current if url == f'{scraper.FALLBACK_API}/{current_year}' else following)


class ScraperTests(unittest.TestCase):
    def test_current_source_schema_produces_canonical_dates(self):
        calendar = scraper.parse_page(html(payload()))
        self.assertEqual(calendar.year, 2083)
        self.assertEqual(calendar.records, FIXTURE)
        scraper.validate_calendar(calendar)

    def test_public_json_navigation_has_the_same_validated_dates(self):
        self.assertEqual(scraper.parse_page(json.dumps(payload())).records,FIXTURE)

    def test_missing_or_changed_source_format_fails_closed(self):
        for page in ('<table><tr><td>Unknown format</td></tr></table>', '<script id="hp-bootstrap">invalid JSON</script>', '<script id="hp-bootstrap">[]</script>'):
            with self.assertRaises(scraper.CalendarError):
                scraper.parse_page(page)

    def test_invalid_dates_weekdays_years_and_duplicate_dates_are_rejected(self):
        mutations = [
            lambda p: p['data']['months'][0]['items'][0].update(adLabel='Feb 30, 2026'),
            lambda p: p['data']['months'][0]['items'][0].update(weekdayEn='Friday'),
            lambda p: p['data']['months'][0]['items'][0].update(yearBs=2084),
            lambda p: p['data']['months'][0]['items'][0].update(monthBs=True),
            lambda p: p['data']['months'][0]['items'][0].update(titleEn=None),
            lambda p: p['data']['months'][0]['items'].append(copy.deepcopy(p['data']['months'][0]['items'][0])),
        ]
        for mutate in mutations:
            data = payload()
            mutate(data)
            with self.assertRaises(scraper.CalendarError):
                scraper.parse_page(html(data))
        with self.assertRaises(scraper.CalendarError):
            scraper.parse_page(html(payload(2083)), 2084)

    def test_partial_and_sharply_reduced_calendars_are_rejected(self):
        calendar = scraper.parse_page(html(payload()))
        with self.assertRaises(scraper.CalendarError):
            scraper.validate_calendar(scraper.Calendar(2083, calendar.records[:4], {}))
        with self.assertRaises(scraper.CalendarError):
            scraper.validate_calendar(calendar, calendar.records * 2)

    def test_unpublished_next_year_is_never_guessed(self):
        records, metadata = scraper.prepare_refresh(fetcher(), now=NOW)
        self.assertEqual(records, FIXTURE)
        self.assertEqual(metadata['years'], [2083])
        self.assertFalse(metadata['nextYearAvailable'])

    def test_partial_next_year_does_not_block_current_year_updates(self):
        following = payload(2084)
        following['data']['months'] = following['data']['months'][:1]
        count = sum(len(month['items']) for month in following['data']['months'])
        following['data']['ld']['itemListElement'] = [{} for _ in range(count)]
        records, metadata = scraper.prepare_refresh(fetcher(following=following), now=NOW)
        self.assertEqual(records, FIXTURE)
        self.assertFalse(metadata['nextYearAvailable'])

    def test_published_next_year_is_included(self):
        records, metadata = scraper.prepare_refresh(fetcher(following=payload(2084)), now=NOW)
        self.assertEqual(len(records), len(FIXTURE) * 2)
        self.assertEqual(metadata['years'], [2083, 2084])
        self.assertTrue(metadata['nextYearAvailable'])
        self.assertTrue(records[-1]['nepaliDate'].endswith('2084'))

    def test_disappearing_previously_published_next_year_is_rejected(self):
        previous = scraper.parse_page(html(payload(2084))).records
        with self.assertRaises(scraper.CalendarError):
            scraper.prepare_refresh(fetcher(), previous=previous, now=NOW)

    def test_rollover_uses_the_source_year_and_rejects_a_stale_clock(self):
        current = payload(2084)
        current['today']['adKey'] = '2027-04-14'
        records, metadata = scraper.prepare_refresh(fetcher(current=current), now=datetime(2027, 4, 14, tzinfo=timezone.utc))
        self.assertEqual(metadata['calendarYear'], 2084)
        self.assertEqual(records[0]['nepaliDate'], '1 Baishakh 2084')
        with self.assertRaises(scraper.CalendarError):
            scraper.prepare_refresh(fetcher(), now=datetime(2027, 1, 1, tzinfo=timezone.utc))

    def test_output_csv_snapshot_and_metadata_agree(self):
        records, metadata = scraper.prepare_refresh(fetcher(), now=NOW)
        files = scraper.render_files(records, metadata)
        rows = list(csv.DictReader(io.StringIO(files['nepali_holidays.csv'])))
        self.assertEqual(rows[0]['Nepali Date'], '1 Baishakh 2083')
        self.assertEqual(rows[0]['English Date'], '2026 April 14')
        self.assertEqual(rows[0]['Event'], FIXTURE[0]['name'])
        embedded = json.loads(re.search(r'window\.FESTIVAL_DATA = (\[[\s\S]*?\]);', files['festival-data.js']).group(1))
        self.assertEqual(embedded, records)
        meta = json.loads(files['festival-meta.json'])
        self.assertEqual(meta['csvSha256'], hashlib.sha256(files['nepali_holidays.csv'].encode()).hexdigest())
        self.assertEqual(meta['recordCount'], len(records))

    def test_failed_fetch_or_parse_never_overwrites_saved_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            scraper.refresh(root, fetch=fetcher(), now=NOW)
            before = {p.name: p.read_bytes() for p in root.iterdir()}
            for fetch in (lambda url: '<html>Site temporarily unavailable</html>', lambda url: (_ for _ in ()).throw(scraper.CalendarError('Network unavailable'))):
                with self.assertRaises(scraper.CalendarError):
                    scraper.refresh(root, fetch=fetch, now=NOW)
                self.assertEqual({p.name: p.read_bytes() for p in root.iterdir()}, before)

    def test_future_page_request_failure_does_not_promote_partial_data(self):
        def fetch(url):
            if url != scraper.SOURCE:
                raise scraper.CalendarError('Next year request failed')
            return html(payload())
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(scraper.CalendarError):
                scraper.refresh(root, fetch=fetch, now=NOW)
            self.assertEqual(list(root.iterdir()), [])

    def test_fallback_groups_same_day_events_and_excludes_generic_closures(self):
        items = fallback_payload()
        generic = {**items[0], 'description': json.dumps({'en': 'Public Holiday'})}
        extra = {**items[0], 'description': json.dumps({'en': 'Another same-day festival'})}
        calendar = scraper.parse_fallback_page(json.dumps(items + [generic, extra]), 2083)
        self.assertEqual(len(calendar.records), len(FIXTURE))
        self.assertEqual(calendar.records[0]['name'], FIXTURE[0]['name'] + ' / Another same-day festival')
        records, meta = scraper.prepare_fallback_refresh(fallback_fetcher(), now=NOW)
        self.assertEqual(records, FIXTURE)
        self.assertTrue(meta['fallbackUsed'])
        self.assertEqual(meta['source'], 'Nepali Patro')
        self.assertFalse(meta['nextYearAvailable'])

    def test_fallback_preserves_saved_festivals_and_names(self):
        items = fallback_payload()
        items[0]['description'] = json.dumps({'en': 'Alternate source name'})
        items.pop(5)
        records, meta = scraper.prepare_fallback_refresh(fallback_fetcher(current=items), previous=FIXTURE, now=NOW)
        self.assertEqual(records, FIXTURE)
        self.assertEqual(meta['retainedRecordCount'], len(FIXTURE))
        items[0]['bs'] = '02.01.2083'
        with self.assertRaises(scraper.CalendarError):
            scraper.prepare_fallback_refresh(fallback_fetcher(current=items), previous=FIXTURE, now=NOW)

    def test_fallback_rejects_bad_dates_incomplete_or_stale_editions(self):
        for field, value in (('ad', '2026-02-30'), ('event_date', '2026-04-15'), ('bs', '01.13.2083'), ('description', '{}')):
            items = fallback_payload()
            items[0][field] = value
            with self.assertRaises(scraper.CalendarError):
                scraper.parse_fallback_page(json.dumps(items), 2083)
        with self.assertRaises(scraper.CalendarError):
            scraper.prepare_fallback_refresh(fallback_fetcher(current=fallback_payload()[:3]), now=NOW)
        with self.assertRaises(scraper.CalendarError):
            scraper.prepare_fallback_refresh(fallback_fetcher(), now=datetime(2028, 1, 1, tzinfo=timezone.utc))

    def test_fallback_selects_current_edition_in_january_and_at_new_year(self):
        records, meta = scraper.prepare_fallback_refresh(fallback_fetcher(), now=datetime(2027, 1, 1, tzinfo=timezone.utc))
        self.assertEqual(meta['calendarYear'], 2083)
        records, meta = scraper.prepare_fallback_refresh(fallback_fetcher(current_year=2084), now=datetime(2027, 4, 14, tzinfo=timezone.utc))
        self.assertEqual(meta['calendarYear'], 2084)
        records, meta = scraper.prepare_fallback_refresh(fallback_fetcher(following=fallback_payload(2084)), now=NOW)
        self.assertEqual(meta['years'], [2083, 2084])
        self.assertEqual(len(records), len(FIXTURE) * 2)

    def test_fallback_partial_future_is_skipped_but_known_future_is_not_dropped(self):
        fetch = fallback_fetcher(following=fallback_payload(2084)[:1])
        records, meta = scraper.prepare_fallback_refresh(fetch, now=NOW)
        self.assertEqual(records, FIXTURE)
        self.assertFalse(meta['nextYearAvailable'])
        previous = scraper.parse_page(html(payload(2084))).records
        with self.assertRaises(scraper.CalendarError):
            scraper.prepare_fallback_refresh(fallback_fetcher(), previous=previous, now=NOW)

    def test_primary_is_preferred_and_source_failure_uses_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            meta = scraper.refresh(directory, fetch=fetcher(), now=NOW, fallback_fetch=lambda url: self.fail('Fallback must not run when primary succeeds'))
            self.assertEqual(meta['source'], 'Hamro Patro')
            meta = scraper.refresh(directory, fetch=lambda url: (_ for _ in ()).throw(scraper.CalendarError('HTTP 403')), now=NOW, fallback_fetch=fallback_fetcher())
            self.assertEqual(meta['source'], 'Nepali Patro')
            self.assertEqual(meta['retainedRecordCount'], len(FIXTURE))
            before = {p.name: p.read_bytes() for p in Path(directory).iterdir()}
            with self.assertRaises(scraper.CalendarError):
                scraper.refresh(directory, fetch=lambda url: 'invalid primary', fallback_fetch=lambda url: 'invalid fallback', now=NOW)
            self.assertEqual({p.name: p.read_bytes() for p in Path(directory).iterdir()}, before)


if __name__ == '__main__':
    unittest.main()
