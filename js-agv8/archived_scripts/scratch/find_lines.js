const fs = require('fs');

try {
  const content = fs.readFileSync('d:/Rasel/dis-docs/hr/js-agv8/config.json', 'utf8');
  const lines = content.split('\n');
  const queries = ["Boro", "Nanny", "Moyna", "Rojina", "Sharmin", "Nargis", "Era", "Shifa", "Helal", "Eshita"];
  
  queries.forEach(q => {
    console.log(`--- Searching for: ${q} ---`);
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(q.toLowerCase())) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
      }
    });
  });
} catch (e) {
  console.error(e);
}
