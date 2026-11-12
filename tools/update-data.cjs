const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {loadFestivalLogic}=require('./festival-utils.cjs');
const root=path.resolve(__dirname,'..');
const {recordsFromCsv,validateCalendarRecords}=loadFestivalLogic();
const source=fs.readFileSync(path.join(root,'nepali_holidays.csv'),'utf8').replace(/\r\n/g,'\n');
const records=validateCalendarRecords(recordsFromCsv(source));
const hash=crypto.createHash('sha256').update(source).digest('hex');
const filename=path.join(root,'festival-meta.json');
let metadata=fs.existsSync(filename)?JSON.parse(fs.readFileSync(filename,'utf8')):{};
if(metadata.csvSha256!==hash){
  const years=[...new Set(records.map(record=>Number(record.nepaliDate.match(/20\d\d/)[0])))].sort();
  metadata={source:'Manually maintained calendar',sourceUrl:null,checkedAt:null,calendarYear:years[0],years,recordCount:records.length,firstDate:records[0].date,lastDate:records.at(-1).date,csvSha256:hash};
  fs.writeFileSync(filename,JSON.stringify(metadata,null,2)+'\n');
}
fs.writeFileSync(path.join(root,'festival-data.js'),'// Generated calendar snapshot.\nwindow.FESTIVAL_META = '+JSON.stringify(metadata,null,2)+';\nwindow.FESTIVAL_DATA = '+JSON.stringify(records,null,2)+';\n');
console.log('Updated offline snapshot with '+records.length+' dates.');
