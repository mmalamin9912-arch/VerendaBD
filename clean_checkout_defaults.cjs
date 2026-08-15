const fs = require('fs');
let code = fs.readFileSync('src/components/TenantStorefrontView.tsx', 'utf-8');

code = code.replace(
  /const \[custName, setCustName\] = useState\('Sarah Ahmed'\);/g,
  "const [custName, setCustName] = useState('');"
);
code = code.replace(
  /const \[custPhone, setCustPhone\] = useState\('01711000000'\);/g,
  "const [custPhone, setCustPhone] = useState('');"
);
code = code.replace(
  /const \[custAddress, setCustAddress\] = useState\('House 12, Road 4, Gulshan 1'\);/g,
  "const [custAddress, setCustAddress] = useState('');"
);
code = code.replace(
  /const \[custCity, setCustCity\] = useState\('Dhaka'\);/g,
  "const [custCity, setCustCity] = useState('');"
);

fs.writeFileSync('src/components/TenantStorefrontView.tsx', code);
