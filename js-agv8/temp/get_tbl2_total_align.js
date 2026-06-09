const AdmZip = require('adm-zip');
const zip = new AdmZip('samples/bank-sample.docx');
const xml = zip.readAsText('word/document.xml');
const tables = xml.split('<w:tbl>');
const tbl2 = tables[2].split('</w:tbl>')[0];
const rows = tbl2.split('</w:tr>');
const totalRow = rows[rows.length - 2];
const cells = totalRow.split('<w:tc>');
console.log(cells[2].split('</w:tc>')[0]); // 2nd tc element is Cell 1
