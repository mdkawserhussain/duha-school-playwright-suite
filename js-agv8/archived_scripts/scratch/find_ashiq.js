const fs = require('fs');
try {
  const content = fs.readFileSync('d:/Rasel/dis-docs/hr/js-agv8/config.json', 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('ashiq')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
} catch (e) {
  console.error(e);
}
