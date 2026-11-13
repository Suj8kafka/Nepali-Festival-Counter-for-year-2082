const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadFestivalLogic } = require("../tools/festival-utils.cjs");
const now = Date.parse("2026-11-12T08:30:00Z");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/festivals-2083.json"),"utf8"));
const api = loadFestivalLogic(now, fixture);

test("the live snapshot, CSV, and checked metadata agree", () => {
  const live = loadFestivalLogic(now);
  const source = fs.readFileSync(path.join(__dirname,"../data/nepali_holidays.csv"),"utf8");
  const records = live.recordsFromCsv(source);
  live.validateCalendarRecords(records);
  assert.equal(JSON.stringify(records),JSON.stringify(live.festivals.map(({name,date,nepaliDate})=>({name,date,nepaliDate}))));
  if (live.metadata.csvSha256) {
    const crypto = require("node:crypto");
    assert.equal(crypto.createHash("sha256").update(source.replace(/\r\n/g,"\n")).digest("hex"),live.metadata.csvSha256);
    assert.equal(records.length,live.metadata.recordCount);
    assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname,"../data/festival-meta.json"),"utf8"))),JSON.stringify(live.metadata));
  }
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
  assert.equal(reversed.find(item=>item.title==="Chhath Parva").image, "assets/images/chhath.jpg");
  assert.equal(reversed.find(item=>item.title==="Buddha Jayanti").image, "assets/images/boudhanath.jpg");
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

test("countdown components remain exact across second, day, and Nepal midnight boundaries",()=>{
  const start=api.startOfFestival("2026-11-15");
  assert.equal(JSON.stringify(api.countdownValues(start,start-(2*86400+3*3600+4*60+5)*1000)),JSON.stringify({days:2,hours:3,minutes:4,seconds:5}));
  assert.equal(api.countdownValues(start,start-1000).seconds,1);
  assert.equal(api.countdownValues(start,start-999).seconds,0);
  assert.equal(JSON.stringify(api.countdownValues(start,start+1000)),JSON.stringify({days:0,hours:0,minutes:0,seconds:0}));
});

test("an invalid or partial downloaded calendar cannot replace the last good data",()=>{
  assert.throws(()=>api.validateCalendarRecords([]),/incomplete/i);
  assert.throws(()=>api.validateCalendarRecords(fixture.slice(0,3)),/incomplete/i);
  assert.throws(()=>api.validateCalendarRecords(fixture.map((r,i)=>i? r:{...r,date:"2026-02-30"})),/invalid/i);
  assert.throws(()=>api.validateCalendarRecords([...fixture,fixture[0]]),/duplicate/i);
});
