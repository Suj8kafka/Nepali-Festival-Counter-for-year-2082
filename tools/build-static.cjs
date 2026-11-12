/* Create a static deployment from an explicit public-file allowlist. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, {recursive:true});
const files = ['index.html','styles.css','script.js','parallax.js','visitors.js','festival-data.js','festival-meta.json','nepali_holidays.csv','favi.png'];
for (const file of files) fs.copyFileSync(path.join(root,file),path.join(output,file));
for (const folder of ['assets','archive']) fs.cpSync(path.join(root,folder),path.join(output,folder),{recursive:true});
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log('Static site prepared in dist/.');
