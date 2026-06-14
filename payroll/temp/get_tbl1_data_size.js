const AdmZip = require('adm-zip');
const zip = new AdmZip('samples/bank-sample.docx');
const xml = zip.readAsText('word/document.xml');
const tables = xml.split('<w:tbl>');
const tbl1 = tables[1].split('</w:tbl>')[0];
const rows = tbl1.split('</w:tr>');
const dataRow = rows[1];
const cells = dataRow.split('<w:tc>');
console.log('=== TABLE 1 DATA ROW CELL 1 XML ===');
console.log(cells[2].split('</w:tc>')[0]); // Cell 1
