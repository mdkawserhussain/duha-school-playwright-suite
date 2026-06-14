const AdmZip = require('adm-zip');
const zip = new AdmZip('samples/bank-sample.docx');
const xml = zip.readAsText('word/document.xml');
const tables = xml.split('<w:tbl>');
const tbl1 = tables[1].split('</w:tbl>')[0];
const rows = tbl1.split('</w:tr>');
const r36 = rows[rows.length - 2];
const cells = r36.split('<w:tc>');
console.log('=== CELL 2 XML ===');
console.log(cells[3].split('</w:tc>')[0]); // 3rd cell index is index 3
