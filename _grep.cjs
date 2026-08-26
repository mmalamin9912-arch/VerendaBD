const fs = require('fs');
const file = process.argv[2];
const re = new RegExp(process.argv[3], 'i');
const lines = fs.readFileSync(file, 'utf8').split('\n');
lines.forEach((x, i) => { if (re.test(x)) console.log((i + 1) + ': ' + x); });
