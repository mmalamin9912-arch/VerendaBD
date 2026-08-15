const fs = require('fs');

let code = fs.readFileSync('src/components/TenantStorefrontView.tsx', 'utf-8');

code = code.replace(
  /\|\| '🎉 Free Nationwide Shipping across Bangladesh on Orders Over ৳2,000!'/g,
  "|| ''"
);

code = code.replace(
  /\|\| 'Eid Ul Adha Special Collection 2026'/g,
  "|| 'Welcome to our Store'"
);

code = code.replace(
  /\|\| 'Discover authentic Jamdani and modern ethnic wear with fast bKash checkout\.'/g,
  "|| 'Discover our new collections.'"
);

fs.writeFileSync('src/components/TenantStorefrontView.tsx', code);
