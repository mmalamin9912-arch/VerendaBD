const fs = require('fs');
const file = process.argv[2];
const a = parseInt(process.argv[3]);
const b = parseInt(process.argv[4]);
const lines = fs.readFileSync(file, 'utf8').split('\n');
for (let i = a; i <= b && i <= lines.length; i++) {
  console.log(String(i).padStart(4, '0') + ': ' + lines[i - 1]);
}
