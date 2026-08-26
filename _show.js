const fs = require('fs');
const p = process.argv[2];
const lines = fs.readFileSync(p, 'utf8').split('\n');
const a = parseInt(process.argv[3]);
const b = parseInt(process.argv[4]);
for (let i = a; i <= b && i <= lines.length; i++) {
  console.log(String(i).padStart(4, '0') + ': ' + lines[i - 1]);
}
