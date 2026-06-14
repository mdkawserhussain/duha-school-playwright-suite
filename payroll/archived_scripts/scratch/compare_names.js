const fs = require('fs');
const AdmZip = require('d:/Rasel/dis-docs/hr/js-agv8/node_modules/adm-zip');
const { normalize } = require('d:/Rasel/dis-docs/hr/js-agv8/utils');

try {
  const config = JSON.parse(fs.readFileSync('d:/Rasel/dis-docs/hr/js-agv8/config.json', 'utf8'));
  const zip = new AdmZip('d:/Rasel/dis-docs/hr/js-agv8/input/att.docx');
  const xml = zip.readAsText('word/document.xml');
  const rows = xml.split('</w:tr>');
  
  const attNames = [];
  rows.forEach(row => {
    const cells = row.split('</w:tc>');
    if (cells.length < 2) return;
    const nameMatch = cells[1].match(/<w:t>([^<]+)<\/w:t>/g);
    if (!nameMatch) return;
    const rawName = nameMatch.map(m => m.replace(/<\/?w:t>/g, '')).join(' ');
    if (rawName.includes('Name') || !rawName.trim()) return;

    const cleanedName = rawName.replace(/\(.*\)/, '').trim();
    if (!attNames.includes(cleanedName)) {
      attNames.push(cleanedName);
    }
  });

  console.log('--- Names in att.docx ---');
  console.log(JSON.stringify(attNames, null, 2));

  console.log('--- Names in config.json ---');
  const configNames = config.staff.map(s => s.name);
  console.log(JSON.stringify(configNames, null, 2));

  // Find matches, extra in config, extra in att.docx
  const unmatchedInConfig = configNames.filter(cn => !attNames.some(an => normalize(an) === normalize(cn)));
  const unmatchedInAtt = attNames.filter(an => !configNames.some(cn => normalize(cn) === normalize(an)));

  console.log('--- Unmatched in config.json ---');
  console.log(unmatchedInConfig);
  console.log('--- Unmatched in att.docx ---');
  console.log(unmatchedInAtt);
} catch (e) {
  console.error(e);
}
