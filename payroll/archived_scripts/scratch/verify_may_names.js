const fs = require('fs');
const AdmZip = require('d:/Rasel/dis-docs/hr/js-agv8/node_modules/adm-zip');
const { normalize, findStaffConfig } = require('d:/Rasel/dis-docs/hr/js-agv8/utils');

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

  const parsedNames = attNames.map(normalize);
  const configNames = config.staff.map(s => s.name);
  const normalizedConfigNames = configNames.map(normalize);

  const missingFromAtt = config.staff.filter(s => {
    const sNorm = normalize(s.name);
    // Ignore Shaila Parvin and Md Rahat Chy as they are known missing
    if (s.name === "Shaila Parvin" || s.name === "Md Rahat Chy") return false;
    return !parsedNames.some(pn => pn === sNorm || pn.includes(sNorm) || sNorm.includes(pn));
  });

  const unmatchedInAtt = attNames.filter(an => {
    if (an.includes('May')) return false; // Ignore dates
    const anNorm = normalize(an);
    return !normalizedConfigNames.some(cn => cn === anNorm || cn.includes(anNorm) || anNorm.includes(cn));
  });

  console.log('--- Missing from att.docx (ignoring Shaila Parvin and Md Rahat Chy) ---');
  console.log(missingFromAtt.map(s => s.name));

  console.log('--- Unmatched in att.docx (ignoring date headers) ---');
  console.log(unmatchedInAtt);

  if (missingFromAtt.length === 0 && unmatchedInAtt.length === 0) {
    console.log('✅ Success: All names map perfectly between config.json and att.docx!');
  } else {
    console.log('❌ Error: Mismatches found.');
  }

} catch (e) {
  console.error(e);
}
