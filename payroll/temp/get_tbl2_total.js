const AdmZip = require('adm-zip');
const zip = new AdmZip('samples/bank-sample.docx');
const xml = zip.readAsText('word/document.xml');
const tables = xml.split('<w:tbl>');
const tbl2 = tables[2].split('</w:tbl>')[0];
const rows = tbl2.split('</w:tr>');
const totalRow = rows[rows.length - 2];
console.log('=== TABLE 2 TOTAL ROW ===');
const cells = totalRow.split('<w:tc>');
cells.forEach((c, idx) => {
  if (idx === 0) return;
  const tcPr = c.split('</w:tcPr>')[0];
  const text = (c.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
  console.log(`Cell ${idx-1}: text='${text}'\n  tcPr='${tcPr}'`);
});
