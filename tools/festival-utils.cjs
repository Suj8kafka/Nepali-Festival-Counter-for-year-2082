const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function loadFestivalLogic(now = Date.now()) {
  const root = path.resolve(__dirname, "..");
  const DateForTest = class extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  const context = vm.createContext({ window: {}, Intl, Date: DateForTest, TextEncoder });
  vm.runInContext(fs.readFileSync(path.join(root, "festival-data.js"), "utf8"), context);
  const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const logic = source.slice(0, source.indexOf('document.addEventListener("click"'));
  vm.runInContext(logic + "\nglobalThis.api = { parseCsv, parseEnglishDate, recordsFromCsv, startOfFestival, statusOf, nepalDateKey, enrich, filteredFestivals, buildCalendar, foldIcs, escapeHtml, state, festivals };", context);
  return context.api;
}
module.exports = { loadFestivalLogic };
