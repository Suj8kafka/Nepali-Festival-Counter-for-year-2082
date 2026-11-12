"""Refresh the static festival calendar from Hamro Patro. Python 3.10+, no packages."""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import sys
import tempfile
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SOURCE = "https://www.hamropatro.com/en/nepali-public-holidays"
ROOT = Path(__file__).resolve().parent
NEPAL = timezone(timedelta(hours=5, minutes=45))
MONTHS = ("Baishakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Paush", "Magh", "Falgun", "Chaitra")
AD_MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

class CalendarError(ValueError):
    """Source data is incomplete or inconsistent; keep the last good calendar."""

class BootstrapParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.active = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == "script" and dict(attrs).get("id") == "hp-bootstrap":
            self.active = True

    def handle_endtag(self, tag):
        if tag == "script":
            self.active = False

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)

@dataclass(frozen=True)
class Calendar:
    year: int
    records: list[dict]
    source_today: dict


def integer(value, label, minimum, maximum):
    if type(value) is not int or not minimum <= value <= maximum:
        raise CalendarError(f"Invalid {label}: {value!r}")
    return value


def parse_ad_date(label):
    match = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", str(label).strip())
    if not match:
        raise CalendarError(f"Invalid Gregorian label: {label!r}")
    month_name, day, year = match.groups()
    matches = [i + 1 for i, name in enumerate(AD_MONTHS) if month_name.lower() in (name.lower(), name[:3].lower())]
    if len(matches) != 1:
        raise CalendarError(f"Unknown Gregorian month: {month_name}")
    try:
        return date(int(year), matches[0], int(day))
    except ValueError as error:
        raise CalendarError(f"Invalid Gregorian date: {label!r}") from error


def parse_page(html, expected_year=None):
    parser = BootstrapParser()
    parser.feed(html)
    content = html if html.lstrip().startswith("{") else "".join(parser.parts)
    if not content:
        raise CalendarError("Hamro Patro holiday data was not found; its page format may have changed.")
    try:
        payload = json.loads(content)
        if payload.get("page") != "holidays" or payload.get("locale") != "en":
            raise CalendarError("The source is not the English holidays page.")
        data = payload["data"]
        year = integer(data["year"], "calendar year", 2000, 2200)
        if expected_year is not None and year != expected_year:
            raise CalendarError(f"Requested {expected_year}, but the source returned {year}.")
        months = data["months"]
        if not isinstance(months, list):
            raise CalendarError("Holiday months must be a list.")
        records = []
        for month in months:
            month_number = integer(month["monthBs"], "month", 1, 12)
            if not isinstance(month["items"], list):
                raise CalendarError("Holiday items must be a list.")
            for item in month["items"]:
                if integer(item["yearBs"], "holiday year", 2000, 2200) != year or integer(item["monthBs"], "holiday month", 1, 12) != month_number:
                    raise CalendarError("Holiday date disagrees with its calendar section.")
                day_bs = integer(item["dayBs"], "Nepali day", 1, 32)
                if not isinstance(item["titleEn"], str):
                    raise CalendarError("Holiday name must be text.")
                event = " ".join(item["titleEn"].split())
                if not event or len(event) > 3000 or "<" in event or ">" in event:
                    raise CalendarError("Holiday name is empty or invalid.")
                ad = parse_ad_date(item["adLabel"])
                if item.get("weekdayEn") != WEEKDAYS[ad.weekday()]:
                    raise CalendarError(f"Weekday/date mismatch for {event}.")
                # Validate the era range; AD dates are read from the source, never calculated from BS.
                if not date(year - 57, 4, 1) <= ad <= date(year - 56, 4, 30):
                    raise CalendarError("Gregorian date falls outside the declared BS year.")
                records.append({"name": event, "date": ad.isoformat(), "nepaliDate": f"{day_bs} {MONTHS[month_number - 1]} {year}"})
        declared = data.get("ld", {}).get("itemListElement")
        if declared is not None and len(declared) != len(records):
            raise CalendarError("Holiday record count disagrees with the source's declared list.")
        records.sort(key=lambda record: (record["date"], record["name"]))
        if len({record["date"] for record in records}) != len(records):
            raise CalendarError("Duplicate holiday dates were returned.")
        return Calendar(year, records, payload.get("today", {}))
    except (KeyError, TypeError, json.JSONDecodeError) as error:
        raise CalendarError(f"Malformed source calendar: {error}") from error


def validate_calendar(calendar, previous=()):
    records = calendar.records
    if not 20 <= len(records) <= 366:
        raise CalendarError(f"Expected a complete calendar, received {len(records)} dates.")
    months = {record["nepaliDate"].split()[1] for record in records}
    if len(months) < 8 or records[0]["nepaliDate"] != f"1 Baishakh {calendar.year}" or "Chaitra" not in months:
        raise CalendarError("Calendar is missing its year boundary or multiple months.")
    if (date.fromisoformat(records[-1]["date"]) - date.fromisoformat(records[0]["date"])).days < 300:
        raise CalendarError("Calendar does not cover a full Nepali year.")
    bs_order = [(MONTHS.index(record["nepaliDate"].split()[1]), int(record["nepaliDate"].split()[0])) for record in records]
    if bs_order != sorted(bs_order):
        raise CalendarError("Nepali date order disagrees with Gregorian date order.")
    old_count = sum(record["nepaliDate"].endswith(f" {calendar.year}") for record in previous)
    if old_count and len(records) < old_count * .75:
        raise CalendarError("More than a quarter of the known dates disappeared; refusing to replace them.")
    return calendar


def fetch_page(url):
    for attempt in range(3):
        try:
            # This is the public JSON navigation request used by Hamro Patro's own client.
            request = Request(url + "?_rsc", headers={"User-Agent": "Utsav-Festival-Calendar/1.0", "Accept": "application/json", "RSC": "1"})
            with urlopen(request, timeout=20) as response:
                if "application/json" not in response.headers.get("Content-Type", ""):
                    raise CalendarError("The source did not return public calendar JSON.")
                content = response.read(3_000_001)
                if len(content) > 3_000_000:
                    raise CalendarError("Source page exceeds the expected size.")
                return content.decode("utf-8")
        except HTTPError as error:
            if error.code not in (408, 429, 500, 502, 503, 504) or attempt == 2:
                raise CalendarError(f"Source request failed: HTTP {error.code}") from error
        except (URLError, TimeoutError, OSError) as error:
            if attempt == 2:
                raise CalendarError(f"Source request failed: {type(error).__name__}") from error
        time.sleep(2 ** attempt)
    raise CalendarError("Source request did not complete.")


def read_previous(directory):
    snapshot = directory / "festival-data.js"
    if not snapshot.exists():
        return []
    text = snapshot.read_text(encoding="utf-8-sig")
    match = re.search(r"window\.FESTIVAL_DATA\s*=\s*(\[[\s\S]*?\]);", text)
    if not match:
        raise CalendarError("The existing offline snapshot cannot be read.")
    return json.loads(match.group(1))


def prepare_refresh(fetch=fetch_page, previous=(), now=None):
    now = now or datetime.now(timezone.utc)
    today = now.astimezone(NEPAL).date()
    current = parse_page(fetch(SOURCE))
    try:
        source_day = date.fromisoformat(current.source_today["adKey"])
        source_year = integer(current.source_today["year_bs"], "current BS year", 2000, 2200)
    except (KeyError, ValueError, TypeError) as error:
        raise CalendarError("The source's current date is missing or invalid.") from error
    if abs((source_day - today).days) > 2 or current.year != source_year:
        raise CalendarError("The rolling source calendar is stale or has the wrong year.")
    validate_calendar(current, previous)
    following = parse_page(fetch(f"{SOURCE}/{current.year + 1}"), current.year + 1)
    calendars = [current]
    following_months = {record["nepaliDate"].split()[1] for record in following.records}
    next_year_available = bool(following.records) and len(following.records) >= 20 and len(following_months) >= 8 and following.records[0]["nepaliDate"] == f"1 Baishakh {following.year}" and "Chaitra" in following_months and (date.fromisoformat(following.records[-1]["date"]) - date.fromisoformat(following.records[0]["date"])).days >= 300
    if next_year_available:
        validate_calendar(following, previous)
        calendars.append(following)
    elif any(record["nepaliDate"].endswith(f" {following.year}") for record in previous):
        raise CalendarError("The previously published next-year calendar disappeared.")
    records = sorted((record for calendar in calendars for record in calendar.records), key=lambda record: record["date"])
    metadata = {
        "source": "Hamro Patro", "sourceUrl": SOURCE,
        "checkedAt": now.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "calendarYear": current.year, "years": [calendar.year for calendar in calendars],
        "recordCount": len(records), "firstDate": records[0]["date"], "lastDate": records[-1]["date"],
        "nextYearAvailable": next_year_available,
    }
    return records, metadata


def render_files(records, metadata):
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, lineterminator="\n")
    writer.writerow(["Nepali Date", "English Date", "Event"])
    for record in records:
        ad = date.fromisoformat(record["date"])
        writer.writerow([record["nepaliDate"], f"{ad.year} {AD_MONTHS[ad.month - 1]} {ad.day}", record["name"]])
    csv_text = stream.getvalue()
    metadata = {**metadata, "csvSha256": hashlib.sha256(csv_text.encode("utf-8")).hexdigest()}
    snapshot = "// Generated by py.py from verified Hamro Patro dates.\nwindow.FESTIVAL_META = " + json.dumps(metadata, ensure_ascii=True, indent=2) + ";\nwindow.FESTIVAL_DATA = " + json.dumps(records, ensure_ascii=True, indent=2) + ";\n"
    return {"nepali_holidays.csv": csv_text, "festival-data.js": snapshot, "festival-meta.json": json.dumps(metadata, ensure_ascii=True, indent=2) + "\n"}


def refresh(directory=ROOT, fetch=fetch_page, now=None):
    directory = Path(directory)
    previous = read_previous(directory)
    records, metadata = prepare_refresh(fetch, previous, now)
    files = render_files(records, metadata)
    directory.mkdir(parents=True, exist_ok=True)
    staged = []
    try:
        # Validate everything and prepare all files before replacing any saved data.
        for filename, content in files.items():
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="", dir=directory, delete=False) as handle:
                handle.write(content)
                staged.append((Path(handle.name), directory / filename))
        for temporary, target in staged:
            os.replace(temporary, target)
    finally:
        for temporary, _ in staged:
            temporary.unlink(missing_ok=True)
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=ROOT)
    args = parser.parse_args()
    try:
        metadata = refresh(args.output_dir)
    except (CalendarError, OSError, ValueError) as error:
        print(f"Calendar refresh failed; saved calendar retained: {error}", file=sys.stderr)
        return 1
    print(f"Verified {metadata['recordCount']} dates for BS {', '.join(map(str, metadata['years']))} from Hamro Patro.")
    if not metadata["nextYearAvailable"]:
        print("Next-year dates are not complete yet; they will be checked again on the next run.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
