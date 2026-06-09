const AdmZip = require('adm-zip');

function extractAllText(path) {
  const zip = new AdmZip(path);
  const xml = zip.readAsText('word/document.xml');
  
  const texts = [];
  const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  matches.forEach(m => {
    const t = m.replace(/<w:t[^>]*>|<\/w:t>/g, '');
    if (t.trim()) texts.push(t.trim());
  });
  return texts;
}

console.log('=== SAMPLE - ALL TEXT ===');
const sampleTexts = extractAllText('samples/bank-sample.docx');
sampleTexts.forEach((t, i) => console.log(`  ${i}: "${t}"`));

console.log('\n=== OLD OUTPUT - ALL TEXT ===');
const oldTexts = extractAllText('output/old/Bank-Transfer-May-2026.docx');
oldTexts.forEach((t, i) => console.log(`  ${i}: "${t}"`));
