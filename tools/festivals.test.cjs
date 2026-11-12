const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadFestivalLogic } = require("./festival-utils.cjs");
const now = Date.parse("2026-11-12T08:30:00Z");
const api = loadFestivalLogic(now);

test("the offline snapshot matches every name and date in the current CSV", () => {
  const records = api.recordsFromCsv(fs.readFileSync(path.join(__dirname, "../nepali_holidays.csv"), "utf8"));
  assert.equal(records.length, 44);
  assert.equal(JSON.stringify(records), JSON.stringify(api.festivals.map(({name,date,nepaliDate}) => ({name,date,nepaliDate}))));
  assert.ok(records.every(record => /2083/.test(record.nepaliDate)));
});
test("CSV parsing handles quoted newlines, escaped quotes, BOM, and corrected column order", () => {
  const rows = api.parseCsv('\uFEFFDate,Event\r\n"one\nline","say ""hello"""\r\n');
  assert.equal(JSON.stringify(rows), JSON.stringify([["Date","Event"],["one\nline",'say "hello"']]));
  const records = api.recordsFromCsv('Nepali Date,English Date,Event\n"29 Kartik 2083",2026 November 15,"Chhath Parva"');
  assert.equal(records[0].name, "Chhath Parva");
  assert.equal(records[0].date, "2026-11-15");
  assert.throws(() => api.parseCsv('"unfinished'), /Unclosed/);
  assert.throws(() => api.recordsFromCsv("a,b,c\nmissing,invalid,date"), /Incomplete/);
});
test("invalid Gregorian dates cannot roll into another month", () => {
  assert.equal(api.parseEnglishDate("2026 February 30"), "");
  assert.equal(api.parseEnglishDate("2026 March 0"), "");
  assert.equal(api.parseEnglishDate("2026 Unclear 14"), "");
  assert.equal(api.parseEnglishDate("2028 February 29"), "2028-02-29");
});
test("festivals start at Nepal midnight and remain today for the full local day", () => {
  const start = api.startOfFestival("2026-11-15");
  assert.equal(new Date(start).toISOString(), "2026-11-14T18:15:00.000Z");
  assert.equal(api.statusOf({ start }, start - 1), "upcoming");
  assert.equal(api.statusOf({ start }, start), "today");
  assert.equal(api.statusOf({ start }, start + 86_399_999), "today");
  assert.equal(api.statusOf({ start }, start + 86_400_000), "past");
  assert.equal(api.nepalDateKey(start - 1), "2026-11-14");
  assert.equal(api.nepalDateKey(start), "2026-11-15");
});
test("festival metadata follows the name when CSV rows move", () => {
  const reversed = api.enrich([{name:"Chhath Parva",date:"2026-11-15",nepaliDate:"29 Kartik 2083"},{name:"Buddha Jayanti",date:"2026-05-01",nepaliDate:"18 Baishakh 2083"}].reverse());
  assert.equal(reversed.find(item=>item.title==="Chhath Parva").image, "assets/chhath.jpg");
  assert.equal(reversed.find(item=>item.title==="Buddha Jayanti").image, "assets/boudhanath.jpg");
});
test("filters combine status, Nepali month, and secondary observance search", () => {
  api.state.status = "upcoming"; api.state.month = "all"; api.state.search = "";
  const upcoming = api.filteredFestivals();
  assert.ok(upcoming.some(item => item.date === "2026-11-12"));
  assert.ok(upcoming.every(item => item.date >= "2026-11-12"));
  api.state.month = "Kartik"; api.state.search = "Chhath";
  assert.equal(api.filteredFestivals().length, 1);
  api.state.search = "World Pneumonia";
  assert.equal(api.filteredFestivals()[0].title, "Tihar Holiday");
  api.state.status = "past"; api.state.month = "all"; api.state.search = "";
  const past = api.filteredFestivals();
  assert.ok(past.every(item => item.date < "2026-11-12"));
  assert.equal(past[0].date, "2026-11-11");
  api.state.status = "all"; api.state.search = "छठ";
  assert.equal(api.filteredFestivals().length, 1);
});
test("calendar export uses exclusive all-day end dates and folds Unicode at 75 bytes", () => {
  const chhath = api.festivals.find(item => item.title === "Chhath Parva");
  const output = api.buildCalendar([chhath]);
  assert.match(output, /BEGIN:VCALENDAR\r\n/);
  assert.match(output, /DTSTART;VALUE=DATE:20261115\r\nDTEND;VALUE=DATE:20261116/);
  assert.equal((output.match(/BEGIN:VEVENT/g) || []).length, 1);
  const full = api.buildCalendar(api.festivals);
  assert.equal((full.match(/BEGIN:VEVENT/g) || []).length, 44);
  assert.ok(full.split("\r\n").every(line => Buffer.byteLength(line, "utf8") <= 75));
  const unicode = "SUMMARY:" + "छठ पर्व ".repeat(30);
  assert.equal(api.foldIcs(unicode).replace(/\r\n /g, ""), unicode);
});
test("untrusted CSV text is escaped before it enters HTML", () => {
  assert.equal(api.escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});
