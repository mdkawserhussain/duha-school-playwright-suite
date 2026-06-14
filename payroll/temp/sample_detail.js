const AdmZip = require('adm-zip');

const zip = new AdmZip('samples/bank-sample.docx');
const xml = zip.readAsText('word/document.xml');

// Get table 2 content
const tables = xml.split('<w:tbl>');
if (tables.length >= 3) {
  const tbl2 = tables[2].split('</w:tbl>')[0];
  
  // Get all rows and their text
  const rows = tbl2.split('</w:tr>');
  rows.forEach((row, i) => {
    const texts = (row.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
      .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
      .filter(Boolean);
    if (texts.length > 0) {
      console.log(`Row ${i}: ${JSON.stringify(texts)}`);
    }
  });
  
  // Get column widths
  const gridCols = tbl2.match(/<w:gridCol[^/]*\/>/g) || [];
  console.log('\nColumn widths:', gridCols.map(g => {
    const m = g.match(/w:w="(\d+)"/);
    return m ? parseInt(m[1]) : 0;
  }));
}

// Also check what the header text area looks like before the tables
const beforeFirstTable = xml.split('<w:tbl>')[0];
const headerTexts = (beforeFirstTable.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
  .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
  .filter(Boolean);
console.log('\n=== Header/intro text (before tables) ===');
headerTexts.forEach((t, i) => console.log(`  ${i}: "${t}"`));

// Check text between table 1 and table 2
const betweenTables = tables[1].split('</w:tbl>')[1];
const betweenTexts = (betweenTables.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
  .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
  .filter(Boolean);
console.log('\n=== Text between tables ===');
betweenTexts.forEach((t, i) => console.log(`  ${i}: "${t}"`));

// Check text after table 2
const afterTable2 = tables[2].split('</w:tbl>')[1] || '';
const afterTexts = (afterTable2.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
  .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
  .filter(Boolean);
console.log('\n=== Text after table 2 ===');
afterTexts.forEach((t, i) => console.log(`  ${i}: "${t}"`));
