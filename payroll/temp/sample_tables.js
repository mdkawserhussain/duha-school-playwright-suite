const AdmZip = require('adm-zip');

const zip = new AdmZip('samples/bank-sample.docx');
const xml = zip.readAsText('word/document.xml');

// Get table 1 content 
const tables = xml.split('<w:tbl>');
const tbl1 = tables[1].split('</w:tbl>')[0];

// Get last few rows
const rows = tbl1.split('</w:tr>');
console.log('Table 1 has', rows.length, 'segments (rows + trailing)');

// Check last 3 rows
for (let i = Math.max(0, rows.length - 4); i < rows.length; i++) {
  const texts = (rows[i].match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
    .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
    .filter(Boolean);
  if (texts.length > 0) {
    console.log(`Row ${i}: ${JSON.stringify(texts)}`);
  }
  
  // Check for column span
  const spans = rows[i].match(/<w:gridSpan[^/]*\/>/g) || [];
  if (spans.length > 0) console.log(`  Spans: ${JSON.stringify(spans)}`);
}

// Table 2 structure - check header row
const tbl2 = tables[2].split('</w:tbl>')[0];
const tbl2Rows = tbl2.split('</w:tr>');
console.log('\nTable 2 has', tbl2Rows.length, 'segments');

// First row = header
const hdr = tbl2Rows[0];
const hdrTexts = (hdr.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
  .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
  .filter(Boolean);
console.log('Table 2 Header texts:', JSON.stringify(hdrTexts));

// Check cells in header row
const hdrCells = hdr.split('</w:tc>');
console.log('Table 2 Header cell count:', hdrCells.length);

// Check the last row (total row)
const lastRow = tbl2Rows[tbl2Rows.length - 2]; // -2 because last segment is trailing
const lastTexts = (lastRow.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
  .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
  .filter(Boolean);
console.log('Table 2 Last row:', JSON.stringify(lastTexts));

// Check for "In words" location - between table 1 and table 2 or inside table 1?
// Search where "In words" appears in the full XML
const inWordsIdx = xml.indexOf('In words');
const table1End = xml.indexOf('</w:tbl>');
const table2Start = xml.indexOf('<w:tbl>', table1End + 1);
console.log('\n"In words" at position:', inWordsIdx);
console.log('Table 1 ends at:', table1End);
console.log('Table 2 starts at:', table2Start);
console.log('Is "In words" inside table 1?', inWordsIdx < table1End);
console.log('Is "In words" between tables?', inWordsIdx > table1End && inWordsIdx < table2Start);

// Check for "Total" in table 1
const totalIdx = xml.indexOf('>Total<');
console.log('\n"Total" at position:', totalIdx);
console.log('Is "Total" inside table 1?', totalIdx < table1End);

// Check columns in table 2 - SL, Name, Amount columns
// The sample table 2 has: SL, Name, (empty columns?), Amount
// Let's check first data row cells 
const dataRow = tbl2Rows[1];
const dataCells = dataRow.split('</w:tc>');
console.log('\nTable 2 first data row cell count:', dataCells.length);
dataCells.forEach((cell, ci) => {
  const t = (cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
    .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
    .filter(Boolean);
  if (t.length > 0) console.log(`  Cell ${ci}: ${JSON.stringify(t)}`);
});
