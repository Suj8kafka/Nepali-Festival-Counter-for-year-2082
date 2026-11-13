/* Create a static deployment from an explicit public-file allowlist. */
const fs = require('node:fs');
const path = require('node:path');
const root = fs.realpathSync(path.resolve(__dirname, '..'));
const output = path.join(root, 'dist');
// Rebuild only the project's own output directory so moved files cannot linger.
if (path.dirname(output) !== root || (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink())) {
  throw new Error('The build output must be a regular dist/ directory inside the project.');
}
fs.rmSync(output, {recursive:true, force:true});
fs.mkdirSync(output, {recursive:true});
const files = ['index.html'];
for (const file of files) fs.copyFileSync(path.join(root,file),path.join(output,file));
for (const folder of ['assets','data','archive']) fs.cpSync(path.join(root,folder),path.join(output,folder),{recursive:true});
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log('Static site prepared in dist/.');
