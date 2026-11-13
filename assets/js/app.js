/* Utsav: buildless festival discovery, using the project's own CSV. */
"use strict";

const DAY = 86_400_000;
const NEPAL_ZONE = "Asia/Kathmandu";
const MONTHS = ["Baishakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Paush", "Magh", "Falgun", "Chaitra"];
const $ = (id) => document.getElementById(id);
const icon = (name, extra = "") => '<svg class="icon ' + extra + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const clean = (value) => String(value ?? "").replace(/\uFEFF/g, "").replace(/\s+/g, " ").trim();
const clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone: NEPAL_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: NEPAL_ZONE, day: "numeric", month: "short", year: "numeric" });
const longDateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: NEPAL_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });

const CATALOG = [
  { match: /Chhath/i, title: "Chhath Parva", native: "छठ पर्व", image: "assets/images/chhath.jpg", alt: "An offering to the setting sun during Chhath", category: "TRADITION & TOGETHERNESS", art: "sun", description: "A moment of gratitude, golden skies, and families gathered by the water.", note: "Gratitude, devotion, and the golden sun." },
  { match: /Guru Nanak/i, title: "Guru Nanak Jayanti", native: "गुरु नानक जयन्ती", category: "FAITH & REFLECTION", art: "sun", description: "A day for kindness, reflection, and a shared sense of togetherness." },
  { match: /Yomari/i, title: "Yomari Punhi", native: "योमरी पुन्हि", category: "CULTURE & COMMUNITY", art: "food", description: "Familiar flavors, shared tables, and traditions passed from one generation to the next." },
  { match: /^Udhauli/i, title: "Udhauli Parva", native: "उधौली पर्व", category: "CULTURE & COMMUNITY", art: "community", description: "A celebration of belonging, community, and our connection to the land." },
  { match: /Christmas/i, title: "Christmas Day", native: "क्रिसमस", category: "JOY & TOGETHERNESS", art: "snow", description: "Warm wishes, bright lights, and time with the people who feel like home." },
  { match: /^Tamu/i, title: "Tamu Lhosar", native: "तमु ल्होसार", image: "assets/images/boudhanath.jpg", alt: "Prayer flags around Boudhanath Stupa", category: "NEW BEGINNINGS", art: "snow", description: "A fresh beginning, a familiar gathering, and another year of possibilities." },
  { match: /^Sonam/i, title: "Sonam Lhochhar", native: "सोनाम ल्होछार", category: "NEW BEGINNINGS", art: "snow", description: "Welcoming a new year with community, color, and a little extra joy." },
  { match: /^Gyalpo/i, title: "Gyalpo Lhosar", native: "ग्याल्पो ल्होसार", category: "NEW BEGINNINGS", art: "snow", description: "A celebration of new beginnings and the traditions that bring us together." },
  { match: /Disabled Persons/i, title: "International Day of Persons with Disabilities", category: "COMMUNITY & AWARENESS", art: "community", description: "A reminder to build a more welcoming, accessible world for everyone." },
  { match: /^Buddha/i, title: "Buddha Jayanti", native: "बुद्ध जयन्ती", image: "assets/images/boudhanath.jpg", alt: "Boudhanath Stupa beneath colorful prayer flags", category: "FAITH & REFLECTION", art: "sun", description: "A moment to slow down, reflect, and make space for peace and compassion." },
  { match: /^Mesh|Nepali New Year/i, title: "Nepali New Year", native: "नेपाली नयाँ वर्ष", category: "NEW BEGINNINGS", art: "colors", description: "New hopes, fresh beginnings, and a whole year of celebrations ahead." },
  { match: /^Bakar/i, title: "Bakar Eid", native: "बकर इद", category: "FAITH & FAMILY", art: "community", description: "A time to gather, share, and celebrate the bonds that connect us." },
  { match: /^Republic/i, title: "Republic Day", native: "गणतन्त्र दिवस", category: "NATIONAL OBSERVANCE", art: "colors", description: "A day to reflect on our shared journey and the country we call home." },
  { match: /^Bhoto/i, title: "Bhoto Jatra", native: "भोटो जात्रा", category: "CULTURE & COMMUNITY", art: "colors", description: "Living traditions and the unmistakable spirit of a community coming together." },
  { match: /^Janai/i, title: "Janai Poornima", native: "जनै पूर्णिमा", category: "FAITH & FAMILY", art: "lights", description: "A celebration of cherished bonds and the rituals that connect generations." },
  { match: /^Gaijatra/i, title: "Gai Jatra", native: "गाई जात्रा", category: "CULTURE & COMMUNITY", art: "colors", description: "Remembering loved ones through the shared stories and traditions of a community." },
  { match: /^Shree Krishna/i, title: "Krishna Janmashtami", native: "कृष्ण जन्माष्टमी", category: "FAITH & DEVOTION", art: "sun", description: "A day of devotion, familiar melodies, and celebrations close to the heart." },
  { match: /^Haritalika/i, title: "Haritalika Teej", native: "हरितालिका तीज", category: "CULTURE & CONNECTION", art: "colors", description: "Songs, color, and the joy of gathering with the people who know you best." },
  { match: /^Sambidhan/i, title: "Constitution Day", native: "संविधान दिवस", category: "NATIONAL OBSERVANCE", art: "community", description: "A moment to reflect on our country and the future we share." },
  { match: /^Indra/i, title: "Indra Jatra", native: "इन्द्र जात्रा", image: "assets/images/indra-jatra.jpg", alt: "Indra Jatra celebrations in Kathmandu", category: "CULTURE & COMMUNITY", art: "colors", description: "The streets come alive with the energy of a tradition shared across generations." },
  { match: /Jitiya/i, title: "Jitiya Parva", native: "जितिया पर्व", category: "FAITH & FAMILY", art: "lights", description: "A celebration of care, devotion, and the strength of family bonds." },
  { match: /^Ghatasth/i, title: "Ghatasthapana", native: "घटस्थापना", category: "DASHAIN", art: "community", description: "The anticipation begins. A season of family, familiar rituals, and coming home." },
  { match: /^Fulpati/i, title: "Fulpati", native: "फूलपाती", category: "DASHAIN", art: "community", description: "Festive days, familiar faces, and the growing warmth of Dashain." },
  { match: /Maha Ashtami/i, title: "Maha Ashtami", native: "महा अष्टमी", category: "DASHAIN", art: "lights", description: "A moment of devotion in the heart of the Dashain celebrations." },
  { match: /^Maha Nawami/i, title: "Maha Nawami", native: "महा नवमी", category: "DASHAIN", art: "lights", description: "Cherished rituals and the joy of a celebration shared with family." },
  { match: /^Bijaya/i, title: "Bijaya Dashami", native: "विजया दशमी", category: "DASHAIN", art: "colors", description: "Blessings, tika, and the beautiful feeling of finding your way home." },
  { match: /^Papakunsa/i, title: "Papankusha Ekadashi", native: "पापाङ्कुशा एकादशी", category: "FAITH & REFLECTION", art: "sun", description: "A quiet space for devotion and reflection amid the festive season." },
  { match: /^Dashain Holiday/i, title: "Dashain Holiday", native: "दशैं बिदा", category: "DASHAIN", art: "community", description: "A little more time for family, long conversations, and the comfort of home." },
  { match: /^Laxmi/i, title: "Laxmi Pooja", native: "लक्ष्मी पूजा", category: "TIHAR", art: "lights", description: "A warm glow in every window and a little more light in every home." },
  { match: /^Gobardan/i, title: "Govardhan & Mha Puja", native: "गोवर्धन तथा म्हः पूजा", category: "TIHAR", art: "lights", description: "A day for gratitude, renewal, and celebrating the connections we cherish." },
  { match: /^Bhai Tika/i, title: "Bhai Tika", native: "भाइ टीका", category: "TIHAR", art: "colors", description: "Flowers, blessings, and the special bond between brothers and sisters." },
  { match: /^Tihar Holiday/i, title: "Tihar Holiday", native: "तिहार बिदा", category: "FESTIVAL OF LIGHTS", art: "lights", description: "Keep the lights glowing a little longer. Make time for the people you love." },
  { match: /^Prithivi/i, title: "Prithvi Jayanti", native: "पृथ्वी जयन्ती", category: "NATIONAL OBSERVANCE", art: "community", description: "Reflecting on Nepal’s history and our shared sense of belonging." },
  { match: /^Makar/i, title: "Maghe Sankranti", native: "माघे सङ्क्रान्ति", category: "SEASONS & TRADITIONS", art: "sun", description: "Winter sunshine, comforting flavors, and a warm gathering around the table." },
  { match: /^Sahid/i, title: "Martyrs’ Day", native: "शहीद दिवस", category: "NATIONAL OBSERVANCE", art: "community", description: "A day of remembrance, respect, and reflection on those who came before us." },
  { match: /^Basanta/i, title: "Saraswati Pooja", native: "सरस्वती पूजा", category: "FAITH & LEARNING", art: "sun", description: "A celebration of learning, creativity, and the promise of new possibilities." },
  { match: /^Prajatantra/i, title: "Democracy Day", native: "प्रजातन्त्र दिवस", category: "NATIONAL OBSERVANCE", art: "community", description: "Remembering a shared journey and looking toward the future together." },
  { match: /^Maha.?Shivaratri/i, title: "Maha Shivaratri", native: "महाशिवरात्रि", category: "FAITH & DEVOTION", art: "lights", description: "An evening of devotion and the quiet glow of a tradition held close." },
  { match: /Women.s Day/i, title: "International Women’s Day", category: "COMMUNITY & AWARENESS", art: "colors", description: "Celebrating the women who shape our communities, our stories, and our future." },
  { match: /^Fagu Poornima \(Terai\)/i, title: "Holi in the Terai", native: "तराईमा होली", image: "assets/images/holi.jpg", alt: "People celebrating Holi with colorful powder", category: "FESTIVAL OF COLORS", art: "colors", description: "Another day to fill the air with color and make memories together." },
  { match: /^Fagu/i, title: "Holi", native: "होली", image: "assets/images/holi.jpg", alt: "A joyful Holi celebration in Nepal", category: "FESTIVAL OF COLORS", art: "colors", description: "A splash of color, a familiar smile, and a whole lot of joy." },
  { match: /^Ghode/i, title: "Ghode Jatra", native: "घोडे जात्रा", category: "CULTURE & COMMUNITY", art: "colors", description: "A day to enjoy the energy and living traditions of the Kathmandu Valley." }
];

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  const source = String(text).replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index], next = source[index + 1];
    if (char === '"' && inQuotes && next === '"') { cell += '"'; index += 1; }
    else if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => clean(value))) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  if (inQuotes) throw new Error("Unclosed quoted CSV field.");
  row.push(cell);
  if (row.some((value) => clean(value))) rows.push(row);
  return rows;
}

function parseEnglishDate(value) {
  const match = clean(value).match(/^(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})$/);
  if (!match) return "";
  const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const month = months.indexOf(match[2].toLowerCase());
  if (month < 0) return "";
  const date = new Date(Date.UTC(Number(match[1]), month, Number(match[3])));
  if (date.getUTCMonth() !== month || date.getUTCDate() !== Number(match[3])) return "";
  return date.toISOString().slice(0, 10);
}

function recordsFromCsv(text) {
  const rows = parseCsv(text);
  // The source scraper's headers are shifted. Identify fields by content so
  // both its historical export and a corrected CSV retain the right dates.
  const records = rows.slice(1).map((row) => {
    const englishCell = row.find((cell) => parseEnglishDate(cell));
    const nepaliCell = row.find((cell) => /\d+\s+[A-Za-z]+\s+20\d\d/.test(clean(cell)) && !parseEnglishDate(cell));
    const eventCell = row.find((cell) => cell !== englishCell && cell !== nepaliCell);
    if (!englishCell || !nepaliCell || !eventCell) throw new Error("Incomplete festival CSV row.");
    return {
      name: clean(eventCell.split(/\r?\n/)[0]),
      date: parseEnglishDate(englishCell),
      nepaliDate: clean((nepaliCell.match(/\(([^)]+)\)/) || [])[1] || nepaliCell),
    };
  });
  if (!records.length) throw new Error("No festival dates found.");
  return records;
}

function validateCalendarRecords(records) {
  if (!Array.isArray(records) || records.length < 20 || records.length > 1000) throw new Error("Incomplete calendar.");
  const seen = new Set();
  for (const record of records) {
    const parts = String(record.date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = parts && new Date(Date.UTC(Number(parts[1]),Number(parts[2])-1,Number(parts[3])));
    if (!parts || date.toISOString().slice(0,10)!==record.date || !clean(record.name) || !/^\d{1,2} [A-Za-z]+ 20\d{2}$/.test(record.nepaliDate)) throw new Error("Invalid festival record.");
    if (seen.has(record.date)) throw new Error("Duplicate festival date.");
    seen.add(record.date);
  }
  return records;
}
function countdownValues(start, now = Date.now()) {
  const diff = Math.max(0,start-now);
  return {days:Math.floor(diff/DAY),hours:Math.floor(diff/3_600_000)%24,minutes:Math.floor(diff/60_000)%60,seconds:Math.floor(diff/1_000)%60};
}

function startOfFestival(date) { return Date.parse(date + "T00:00:00+05:45"); }
function statusOf(festival, now = Date.now()) {
  return now < festival.start ? "upcoming" : now < festival.start + DAY ? "today" : "past";
}
function nepalDateKey(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: NEPAL_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type).value;
  return part("year") + "-" + part("month") + "-" + part("day");
}
function enrich(records) {
  return records.map((record) => {
    const metadata = CATALOG.find((item) => item.match.test(record.name)) || {
      title: record.name.split("/")[0].trim(), category: "NEPALI OBSERVANCE", art: "community",
      description: "A date to pause, come together, and keep a cherished tradition close.",
    };
    const month = MONTHS.find((item) => new RegExp("\\b" + item + "\\b", "i").test(record.nepaliDate)) || "";
    return { ...record, ...metadata, id: record.date + "-" + record.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), month, start: startOfFestival(record.date) };
  }).filter((item) => item.name && Number.isFinite(item.start)).sort((a, b) => a.start - b.start);
}

let festivals = enrich(window.FESTIVAL_DATA || []);
let featuredFestival = null;
let festivalMeta = window.FESTIVAL_META || {};
let calendarLoading = false;
let lastCalendarCheck = 0;
let activeDay = nepalDateKey();
const state = { status: "upcoming", month: "all", search: "", view: "grid", limit: 6, calendar: activeDay.slice(0, 7) };
let toastTimeout;

function filteredFestivals() {
  const needle = state.search.toLowerCase().trim();
  const filtered = festivals.filter((festival) => {
    const status = statusOf(festival);
    return (state.status === "all" || (state.status === "past" ? status === "past" : status !== "past")) &&
      (state.month === "all" || festival.month === state.month) &&
      (!needle || [festival.name, festival.title, festival.native, festival.nepaliDate].join(" ").toLowerCase().includes(needle));
  });
  return state.status === "past" ? filtered.reverse() : filtered;
}

function artwork(festival) {
  const drawings = {
    food: '<path d="M27 12c-3 15-15 22-15 37 0 23 31 23 31 0 0-15-13-22-16-37Zm27 9c-2 12-12 18-12 30 0 19 26 19 26 0 0-12-11-18-14-30Z" fill="currentColor" opacity=".18"/><path d="M27 12c-3 15-15 22-15 37 0 23 31 23 31 0 0-15-13-22-16-37Zm27 9c-2 12-12 18-12 30 0 19 26 19 26 0 0-12-11-18-14-30ZM26 33c-5 9-8 15-6 23M8 73h65" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    lights: '<path d="M17 49c4 23 42 23 46 0H17Z" fill="currentColor" opacity=".22"/><path d="M17 49c4 23 42 23 46 0H17Zm0 0q23-12 46 0M40 45c-14-10-3-18 0-29 4 11 15 19 0 29Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M23 65h34M29 71h22M40 8V3M17 27l-7-4m53 4 7-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    sun: '<circle cx="40" cy="40" r="17" fill="currentColor" opacity=".16"/><circle cx="40" cy="40" r="17" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M40 14V5m0 70v-9M14 40H5m70 0h-9M22 22l-7-7m50 50-7-7M22 58l-7 7m50-50-7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    community: '<circle cx="40" cy="27" r="10" fill="currentColor" opacity=".2"/><circle cx="40" cy="27" r="10" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M21 65V55a19 19 0 0 1 38 0v10M17 31a8 8 0 0 0 0 16M63 31a8 8 0 0 1 0 16M14 53c-8 2-10 7-10 12m62-12c8 2 10 7 10 12M31 65h18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    colors: '<path d="M40 9c15 0 8 18 8 18s17-6 22 7-14 15-14 15 14 12 4 22-20-7-20-7-10 17-20 7 4-22 4-22-19-2-14-15 22-7 22-7S25 9 40 9Z" fill="currentColor" opacity=".15"/><path d="M40 9c15 0 8 18 8 18s17-6 22 7-14 15-14 15 14 12 4 22-20-7-20-7-10 17-20 7 4-22 4-22-19-2-14-15 22-7 22-7S25 9 40 9Z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="40" cy="42" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    snow: '<path d="M40 7v66M11 23l58 34M11 57l58-34M31 13l9 8 9-8M31 67l9-8 9 8M12 35l12-3-3-12m47 25-12 3 3 12M12 45l12 3-3 12m47-25-12-3 3-12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  return '<div class="artwork artwork-' + festival.art + '" aria-hidden="true"><svg class="artwork-symbol" viewBox="0 0 80 80">' + (drawings[festival.art] || drawings.community) + '</svg><span class="artwork-word">' + escapeHtml(festival.native || "Together, we celebrate.") + '</span></div>';
}

function renderCard(festival) {
  const status = statusOf(festival);
  const date = new Date(festival.start);
  const day = new Intl.DateTimeFormat("en", { timeZone: NEPAL_ZONE, day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("en", { timeZone: NEPAL_ZONE, month: "short" }).format(date).toUpperCase();
  const title = escapeHtml(festival.title), id = escapeHtml(festival.id);
  return '<article class="festival-card' + (status === "today" ? ' is-today' : '') + '">' +
    '<time class="card-date-stamp" datetime="' + festival.date + '" aria-label="' + escapeHtml(dateFormat.format(date)) + '"><strong>' + day + '</strong><span>' + month + ' ' + festival.date.slice(0, 4) + '</span></time>' +
    '<div class="card-copy"><h3 class="card-title"><button data-festival="' + id + '">' + title + '</button></h3>' +
    '<p class="card-nepali-date">' + escapeHtml(festival.nepaliDate) + '<span class="card-category">' + escapeHtml(festival.category) + '</span></p></div>' +
    '<div class="card-bottom"><span class="card-countdown ' + status + '">' + icon("sun") + '<strong data-countdown-date="' + festival.date + '"></strong></span>' +
    '<button class="card-arrow" data-festival="' + id + '" aria-label="View ' + title + ' details">' + icon("arrow") + '</button></div></article>';
}

function setSelected(elements, predicate) {
  elements.forEach((element) => {
    const selected = predicate(element);
    element.classList.toggle("selected", selected);
    element.setAttribute("aria-pressed", String(selected));
  });
}

function renderMonths() {
  const available = new Set(festivals.filter((festival) => {
    const status = statusOf(festival);
    return state.status === "all" || (state.status === "past" ? status === "past" : status !== "past");
  }).map((festival) => festival.month));
  if (state.month !== "all" && !available.has(state.month)) state.month = "all";
  $("month-filters").innerHTML = '<button class="month-button" data-month="all">All months</button>' +
    MONTHS.filter((month) => available.has(month)).map((month) => '<button class="month-button" data-month="' + month + '">' + month + '</button>').join("");
  setSelected(document.querySelectorAll(".month-button"), (button) => button.dataset.month === state.month);
}

function render() {
  renderMonths();
  const results = filteredFestivals();
  const isCalendar = state.view === "calendar";
  $("festivals").hidden = isCalendar || results.length === 0;
  $("calendar-panel").hidden = !isCalendar || results.length === 0;
  $("empty-state").hidden = results.length > 0;
  $("result-count").textContent = results.length + (results.length === 1 ? " festival" : " festivals");
  $("festivals").innerHTML = results.slice(0, state.limit).map(renderCard).join("");
  $("load-more-row").hidden = isCalendar || results.length <= state.limit;
  $("shown-count").textContent = "Showing " + Math.min(results.length, state.limit) + " of " + results.length + " celebrations";
  setSelected(document.querySelectorAll(".filter-tab"), (button) => button.dataset.status === state.status);
  setSelected(document.querySelectorAll(".view-toggle button"), (button) => button.id === state.view + "-view-button");
  $("nav-festivals").classList.toggle("active", !isCalendar && state.status !== "past");
  $("nav-past").classList.toggle("active", !isCalendar && state.status === "past");
  document.querySelector(".list-labels").hidden = isCalendar || results.length === 0;
  $("nav-calendar").classList.toggle("active", isCalendar);
  if (isCalendar && results.length) renderCalendar(results);
  updateCountdown();
}

function alignCalendar() {
  const results = filteredFestivals();
  if (results.length && !results.some((festival) => festival.date.startsWith(state.calendar))) {
    state.calendar = results[0].date.slice(0, 7);
  }
}

function renderCalendar(results) {
  const [year, month] = state.calendar.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const firstDay = date.getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  $("calendar-month").textContent = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long", year: "numeric" }).format(date);
  const minimum = festivals[0]?.date.slice(0, 7), maximum = festivals.at(-1)?.date.slice(0, 7);
  $("previous-month").disabled = state.calendar <= minimum;
  $("next-month").disabled = state.calendar >= maximum;
  const cells = Array.from({ length: firstDay }, () => '<div class="calendar-day blank" aria-hidden="true"></div>');
  for (let day = 1; day <= days; day += 1) {
    const key = state.calendar + "-" + String(day).padStart(2, "0");
    const events = results.filter((festival) => festival.date === key);
    cells.push('<div class="calendar-day' + (key === activeDay ? ' is-today' : '') + '"><span class="calendar-day-number"' + (key === activeDay ? ' aria-current="date"' : '') + '>' + day + '</span>' +
      events.map((festival) => '<button class="calendar-event ' + statusOf(festival) + '" data-festival="' + escapeHtml(festival.id) + '" aria-label="' + escapeHtml(festival.title + ", " + dateFormat.format(festival.start)) + '">' + escapeHtml(festival.title) + '</button>').join("") + '</div>');
  }
  while (cells.length % 7) cells.push('<div class="calendar-day blank" aria-hidden="true"></div>');
  $("calendar-grid").innerHTML = cells.join("");
}

function changeCalendarMonth(amount) {
  const [year, month] = state.calendar.split("-").map(Number);
  state.calendar = new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 7);
  render();
}

function updateOverview() {
  const remaining = festivals.filter((festival) => statusOf(festival) !== "past").length;
  $("total-festivals").textContent = festivals.length;
  $("remaining-festivals").textContent = remaining;
  $("upcoming-count").textContent = remaining;
  $("past-count").textContent = festivals.length - remaining;
  if (festivals.length) {
    const newYear = festivals.filter(festival => /^1 Baishakh /.test(festival.nepaliDate) && festival.start <= Date.now()).at(-1);
    const bsYear = (newYear || festivals[0]).nepaliDate.match(/\b20\d\d\b/)?.[0] || "";
    document.querySelectorAll("[data-bs-year]").forEach((element) => { element.textContent = bsYear; });
    $("year-range").textContent = festivals[0].date.slice(0, 4) + " — " + festivals.at(-1).date.slice(0, 4);
  }
  const checked = Date.parse(festivalMeta.checkedAt || "");
  $("calendar-source").hidden = !Number.isFinite(checked);
  if (Number.isFinite(checked)) {
    const source = festivalMeta.source === "Nepali Patro" ? {name:"Nepali Patro",url:"https://nepalipatro.com.np/en/government-holiday"} : {name:"Hamro Patro",url:"https://www.hamropatro.com/en/nepali-public-holidays"};
    $("calendar-source").innerHTML = 'Calendar checked ' + escapeHtml(dateFormat.format(checked)) + ' &middot; Source: <a href="' + source.url + '" target="_blank" rel="noopener noreferrer">' + source.name + '</a>' + (festivalMeta.retainedRecordCount ? ' &middot; Includes saved festival entries.' : '');
  }
  if (!remaining && festivals.length) {
    $("data-note").textContent = "You’ve reached the end of this calendar. Browse the year’s celebrations; upcoming dates will appear when the festival calendar is updated.";
    $("data-note").hidden = false;
  }
}

function renderFeatured() {
  featuredFestival = festivals.find((festival) => statusOf(festival) === "upcoming") ||
    festivals.find((festival) => statusOf(festival) === "today") || festivals.at(-1);
  if (!featuredFestival) { $("featured").hidden = true; return; }
  const festival = featuredFestival;
  const status = statusOf(festival);
  $("featured-label").textContent = status === "past" ? "A YEAR OF CELEBRATIONS" : status === "today" ? "CELEBRATING TODAY" : "THE NEXT CELEBRATION";
  $("featured-name").textContent = festival.title;
  document.querySelector(".featured-copy").dataset.titleSize = festival.title.length > 32 ? "long" : festival.title.length > 18 ? "medium" : "short";
  $("featured-date").textContent = dateFormat.format(festival.start);
  $("featured-nepali-date").textContent = festival.nepaliDate;
  $("featured-native").textContent = festival.native || "साथमा मनाऔं";
  $("hero-countdown").setAttribute("aria-label", "Time until " + festival.title);
  $("hero-countdown").hidden = status === "past";
  document.querySelector(".countdown-side").hidden = status === "past";
  $("countdown-note").textContent = status === "today" ? "Celebrating today, until midnight in Nepal." : "Counting down to midnight in Nepal.";
}

function updateCountdown() {
  const now = Date.now();
  $("nepal-clock").textContent = clockFormat.format(now);
  $("nepal-clock").dateTime = new Date(now).toISOString();
  if (featuredFestival) {
    const values = countdownValues(featuredFestival.start, now);
    Object.entries(values).forEach(([key, value]) => { $("count-" + key).textContent = String(value).padStart(2, "0"); });
  }
  document.querySelectorAll("[data-countdown-date]").forEach((element) => {
    const start = startOfFestival(element.dataset.countdownDate);
    const status = statusOf({ start }, now);
    element.textContent = status === "today" ? "Celebrating today" : status === "past" ? Math.floor((now - start) / DAY) + (Math.floor((now - start) / DAY) === 1 ? " day ago" : " days ago") : "In " + Math.ceil((start - now) / DAY) + (Math.ceil((start - now) / DAY) === 1 ? " day" : " days");
    element.parentElement.classList.toggle("today", status === "today");
    element.parentElement.classList.toggle("past", status === "past");
  });
  const nextDay = nepalDateKey(now);
  if (nextDay !== activeDay) {
    activeDay = nextDay;
    updateOverview(); renderFeatured(); render();
  }
}

function showFestival(id) {
  const festival = festivals.find((item) => item.id === id);
  if (!festival) return;
  const visual = festival.image ? '<img class="dialog-image" src="' + festival.image + '" alt="' + escapeHtml(festival.alt) + '"/>' : '<div class="dialog-artwork">' + artwork(festival) + '</div>';
  const observances = festival.name.split("/").map(clean).filter(Boolean);
  $("dialog-content").innerHTML = visual + '<div class="dialog-copy"><p class="eyebrow">' + escapeHtml(festival.category) + '</p><h2 id="dialog-title">' + escapeHtml(festival.title) + '</h2>' +
    '<p class="dialog-date">' + escapeHtml(longDateFormat.format(festival.start)) + '<br/>' + escapeHtml(festival.nepaliDate) + '</p><p>' + escapeHtml(festival.description) + '</p>' +
    '<div class="dialog-observances"><h3>Also on this day</h3><p>' + observances.map(escapeHtml).join(" · ") + '</p></div>' +
    '<div class="dialog-actions"><button class="button button-primary" data-save="' + escapeHtml(festival.id) + '">' + icon("calendar") + ' Save the date</button><button class="button button-outline" data-share="' + escapeHtml(festival.id) + '">Copy festival details</button></div></div>';
  $("festival-dialog").showModal();
}

function showAboutCalendar() {
  const years = [...new Set(festivals.map(festival=>festival.nepaliDate.match(/20\d\d/)?.[0]).filter(Boolean))].join(" / ");
  const gregorian = festivals[0].date.slice(0,4) + "-" + festivals.at(-1).date.slice(0,4);
  $("dialog-content").innerHTML = '<div class="dialog-copy dialog-info-copy"><p class="eyebrow">A LITTLE ABOUT UTSAV</p><h2 id="dialog-title">A calendar to keep us connected.</h2><p>Utsav brings together the festival dates in this project’s Nepali holiday calendar. The current edition covers ' + escapeHtml(years) + ' BS (' + escapeHtml(gregorian) + '), including cultural celebrations and national observances.</p><p>Countdowns begin at midnight in Nepal (Asia/Kathmandu, UTC +5:45). A festival is marked as “Celebrating today” for the full day in Nepal, wherever you’re visiting from.</p><p>Save the date downloads an all-day .ics event for your calendar app. Download calendar includes every date in this edition.</p><p>Dates come from the project’s <a href="data/nepali_holidays.csv" download>festival CSV</a>. Observance dates and local practices can vary; check local announcements when planning.</p><p class="photo-credits">Photography: <a href="https://www.bittiyapost.com/news/2025/10/27/19760" target="_blank" rel="noopener noreferrer">Chhath · Bittiya Post</a>; <a href="https://nepaltraveller.com/sidetrack/7-little-known-facts-about-buddhist-prayer-flags" target="_blank" rel="noopener noreferrer">Boudhanath · Nepal Traveller</a>; Holi · The Himalayan Times; Indra Jatra · Above the Himalaya.</p></div>';
  $("festival-dialog").showModal();
}

function escapeIcs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function foldIcs(line) {
  // RFC 5545 limits lines to 75 octets, including the continuation space.
  const encoder = new TextEncoder();
  let folded = "", current = "", length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) { folded += current + "\r\n"; current = " "; length = 1; }
    current += character; length += bytes;
  }
  return folded + current;
}
function buildCalendar(records) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Utsav//Nepali Festival Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Utsav - Nepali Festivals"];
  records.forEach((festival) => {
    const nextDate = new Date(Date.parse(festival.date + "T00:00:00Z") + DAY).toISOString().slice(0, 10);
    lines.push("BEGIN:VEVENT", "UID:" + festival.id + "@utsav.local", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + festival.date.replace(/-/g, ""), "DTEND;VALUE=DATE:" + nextDate.replace(/-/g, ""), "SUMMARY:" + escapeIcs(festival.title), "DESCRIPTION:" + escapeIcs(festival.nepaliDate + "\n" + festival.name + "\n" + festival.description), "TRANSP:TRANSPARENT", "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(foldIcs).join("\r\n") + "\r\n";
}
function downloadCalendar(records, filename) {
  if (!records.length) return;
  const url = URL.createObjectURL(new Blob([buildCalendar(records)], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  showToast(records.length === 1 ? "Your festival date is ready to add to your calendar." : "Your festival calendar has been downloaded.");
}
function showToast(message) {
  clearTimeout(toastTimeout);
  $("toast").textContent = message; $("toast").hidden = false;
  toastTimeout = setTimeout(() => { $("toast").hidden = true; }, 4_000);
}

async function copyFestival(festival) {
  const text = festival.title + " — " + dateFormat.format(festival.start) + " (" + festival.nepaliDate + ")\n" + festival.name;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Festival details copied.");
  } catch {
    const field = document.createElement("textarea");
    field.value = text; field.setAttribute("readonly", ""); field.style.position = "fixed"; field.style.opacity = "0";
    $("dialog-content").appendChild(field); field.select();
    const copied = document.execCommand("copy"); field.remove();
    showToast(copied ? "Festival details copied." : "Copy isn’t available in this browser.");
  }
}

function setView(view) { state.view = view; alignCalendar(); render(); }
function resetFilters() {
  state.status = "upcoming"; state.month = "all"; state.search = ""; state.limit = 6;
  $("festival-search").value = ""; alignCalendar(); render();
}
document.addEventListener("click", (event) => {
  const details = event.target.closest("[data-festival]");
  if (details) showFestival(details.dataset.festival);
  const status = event.target.closest("[data-status]");
  if (status) { state.status = status.dataset.status; state.month = "all"; state.limit = 6; alignCalendar(); render(); }
  const month = event.target.closest("[data-month]");
  if (month) { state.month = month.dataset.month; state.limit = 6; alignCalendar(); render(); }
  const save = event.target.closest("[data-save]");
  if (save) {
    const festival = festivals.find((item) => item.id === save.dataset.save);
    if (festival) downloadCalendar([festival], festival.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".ics");
  }
  const share = event.target.closest("[data-share]");
  if (share) {
    const festival = festivals.find((item) => item.id === share.dataset.share);
    if (festival) copyFestival(festival);
  }
});
$("festival-search").addEventListener("input", (event) => { state.search = event.target.value; state.limit = 6; alignCalendar(); render(); });
$("grid-view-button").addEventListener("click", () => setView("grid"));
$("calendar-view-button").addEventListener("click", () => setView("calendar"));
$("nav-calendar").addEventListener("click", () => setView("calendar"));
$("nav-festivals").addEventListener("click", () => { resetFilters(); setView("grid"); });
$("nav-past").addEventListener("click", () => {
  state.status = "past"; state.month = "all"; state.search = ""; state.limit = 6;
  $("festival-search").value = ""; setView("grid");
});
$("previous-month").addEventListener("click", () => changeCalendarMonth(-1));
$("next-month").addEventListener("click", () => changeCalendarMonth(1));
$("load-more").addEventListener("click", () => { state.limit += 6; render(); });
$("reset-filters").addEventListener("click", resetFilters);
$("featured-details").addEventListener("click", () => { if (featuredFestival) showFestival(featuredFestival.id); });
$("featured-save").addEventListener("click", () => { if (featuredFestival) downloadCalendar([featuredFestival], "utsav-" + featuredFestival.date + ".ics"); });
$("export-calendar").addEventListener("click", () => downloadCalendar(festivals, "utsav-nepali-festivals.ics"));
$("about-calendar").addEventListener("click", showAboutCalendar);
$("close-dialog").addEventListener("click", () => $("festival-dialog").close());
$("festival-dialog").addEventListener("click", (event) => { if (event.target === $("festival-dialog")) { const bounds = event.target.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close(); } });

function updateLocalVisits() {
  try {
    let count = Number.parseInt(localStorage.getItem("visitCount"), 10);
    if (!Number.isFinite(count) || count < 0) count = 0;
    if (!sessionStorage.getItem("sessionVisited")) {
      count += 1; localStorage.setItem("visitCount", String(count)); sessionStorage.setItem("sessionVisited", "true");
    }
    $("visitCount").textContent = count;
  } catch { $("visitCount").textContent = "1"; }
}

async function loadFestivalsFromCsv() {
  if (location.protocol === "file:" || calendarLoading) return;
  calendarLoading = true;
  lastCalendarCheck = Date.now();
  try {
    const [response, metadataResponse] = await Promise.all([
      fetch("data/nepali_holidays.csv", {cache:"no-store", signal:AbortSignal.timeout(8_000)}),
      fetch("data/festival-meta.json", {cache:"no-store", signal:AbortSignal.timeout(8_000)}).catch(()=>null),
    ]);
    if (!response.ok) throw new Error("Festival CSV unavailable.");
    const records = validateCalendarRecords(recordsFromCsv(await response.text()));
    let metadata = festivalMeta;
    if (metadataResponse?.ok) {
      metadata = await metadataResponse.json();
      if (metadata.recordCount !== records.length) throw new Error("Calendar metadata does not match its dates.");
    }
    festivals = enrich(records);
    festivalMeta = metadata;
    $("data-note").hidden = true;
    alignCalendar(); updateOverview(); renderFeatured(); render();
  } catch {
    $("data-note").textContent = "Showing the saved festival calendar. Live calendar updates are temporarily unavailable.";
    $("data-note").hidden = false;
  } finally { calendarLoading = false; }
}

document.addEventListener("visibilitychange",()=>{
  if (!document.hidden) {
    updateCountdown();
    if (Date.now()-lastCalendarCheck >= 15*60_000) loadFestivalsFromCsv();
  }
});
setInterval(loadFestivalsFromCsv,6*60*60_000);

updateLocalVisits();
updateOverview();
renderFeatured();
render();
setInterval(updateCountdown, 1_000);
loadFestivalsFromCsv();
