const fs = require('fs');
const AdmZip = require('d:/Rasel/dis-docs/hr/js-agv8/node_modules/adm-zip');

try {
  const zip = new AdmZip('d:/Rasel/dis-docs/hr/js-agv8/input/att.docx');
  const xml = zip.readAsText('word/document.xml');
  console.log('XML length:', xml.length);
  const rows = xml.split('</w:tr>');
  console.log('Total rows split by </w:tr>:', rows.length);
  
  // print first 10 rows' details
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = rows[i].split('</w:tc>');
    console.log(`Row ${i}: cells count = ${cells.length}`);
    if (cells.length > 1) {
      // Print first cell text
      const getCellText = (cell) => (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
      const texts = cells.slice(0, 5).map(getCellText);
      console.log(`  Texts:`, texts);
    }
  }
} catch (e) {
  console.error(e);
}
