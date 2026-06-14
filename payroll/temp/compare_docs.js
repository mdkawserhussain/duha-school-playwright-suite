const AdmZip = require('adm-zip');

function extractStructure(path) {
  const zip = new AdmZip(path);
  const xml = zip.readAsText('word/document.xml');
  
  // Extract all text content in order
  const texts = [];
  const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  matches.forEach(m => {
    const t = m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim();
    if (t) texts.push(t);
  });
  
  // Extract table grid columns (per table)
  const tables = xml.split('<w:tbl>');
  const tableInfo = [];
  for (let i = 1; i < tables.length; i++) {
    const tbl = tables[i].split('</w:tbl>')[0];
    const gridCols = tbl.match(/<w:gridCol[^/]*\/>/g) || [];
    const colWidths = gridCols.map(g => {
      const m = g.match(/w:w="(\d+)"/);
      return m ? parseInt(m[1]) : 0;
    });
    
    // Count rows
    const rowCount = (tbl.match(/<w:tr /g) || tbl.match(/<w:tr>/g) || []).length;
    
    // Extract header row text
    const firstRow = tbl.split('</w:tr>')[0];
    const headerTexts = (firstRow.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
      .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '').trim())
      .filter(Boolean);
    
    // Extract shading fills
    const shadings = new Set();
    (tbl.match(/w:fill="([^"]+)"/g) || []).forEach(m => {
      const fill = m.match(/w:fill="([^"]+)"/)[1];
      if (fill !== 'auto') shadings.add(fill);
    });
    
    tableInfo.push({ colWidths, rowCount, headerTexts, shadings: [...shadings] });
  }
  
  // Page size
  const pageSz = xml.match(/<w:pgSz[^/]*\/>/);
  const pageMargin = xml.match(/<w:pgMar[^/]*\/>/);
  
  // Font sizes used
  const fontSizes = new Set();
  (xml.match(/w:sz w:val="(\d+)"/g) || []).forEach(m => {
    fontSizes.add(m.match(/w:val="(\d+)"/)[1]);
  });
  
  return { texts, tableInfo, pageSz: pageSz?.[0], pageMargin: pageMargin?.[0], fontSizes: [...fontSizes].sort() };
}

console.log('=== SAMPLE (bank-sample.docx) ===');
const sample = extractStructure('samples/bank-sample.docx');
console.log('Page size:', sample.pageSz);
console.log('Page margin:', sample.pageMargin);
console.log('Font sizes used:', sample.fontSizes);
console.log('Number of tables:', sample.tableInfo.length);
sample.tableInfo.forEach((t, i) => {
  console.log(`\nTable ${i + 1}:`);
  console.log('  Column widths:', JSON.stringify(t.colWidths));
  console.log('  Row count:', t.rowCount);
  console.log('  Headers:', JSON.stringify(t.headerTexts));
  console.log('  Shadings:', JSON.stringify(t.shadings));
});
console.log('\nAll text content (first 100):');
sample.texts.slice(0, 100).forEach((t, i) => console.log(`  ${i}: "${t}"`));

console.log('\n\n=== OLD OUTPUT (Bank-Transfer-May-2026.docx) ===');
const old = extractStructure('output/old/Bank-Transfer-May-2026.docx');
console.log('Page size:', old.pageSz);
console.log('Page margin:', old.pageMargin);
console.log('Font sizes used:', old.fontSizes);
console.log('Number of tables:', old.tableInfo.length);
old.tableInfo.forEach((t, i) => {
  console.log(`\nTable ${i + 1}:`);
  console.log('  Column widths:', JSON.stringify(t.colWidths));
  console.log('  Row count:', t.rowCount);
  console.log('  Headers:', JSON.stringify(t.headerTexts));
  console.log('  Shadings:', JSON.stringify(t.shadings));
});
console.log('\nAll text content (first 100):');
old.texts.slice(0, 100).forEach((t, i) => console.log(`  ${i}: "${t}"`));
