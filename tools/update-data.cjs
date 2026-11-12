const fs = require("node:fs");
const path = require("node:path");
const { loadFestivalLogic } = require("./festival-utils.cjs");
const root = path.resolve(__dirname, "..");
const { recordsFromCsv } = loadFestivalLogic();
const records = recordsFromCsv(fs.readFileSync(path.join(root, "nepali_holidays.csv"), "utf8"));
fs.writeFileSync(path.join(root, "festival-data.js"), "// Offline snapshot of nepali_holidays.csv. Dates are maintained in that file.\nwindow.FESTIVAL_DATA = " + JSON.stringify(records, null, 2) + ";\n");
console.log("Updated offline snapshot with " + records.length + " festival dates.");
