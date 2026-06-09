const AdmZip = require('adm-zip');
const zip = new AdmZip('samples/bank-sample.docx');
const xml = zip.readAsText('word/document.xml');
const paragraphs = xml.split('<w:p ');
for (let i = 0; i < 25; i++) {
  if (!paragraphs[i]) break;
  const p = paragraphs[i].split('</w:p>')[0];
  const text = (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
  const spacing = p.match(/<w:spacing[^/>]*\/>/) || p.match(/<w:spacing[^>]*>[^<]*<\/w:spacing>/);
  const jc = p.match(/<w:jc[^/>]*\/>/) || p.match(/<w:jc[^>]*>[^<]*<\/w:jc>/);
  console.log(`P ${i}: text='${text}' spacing='${spacing ? spacing[0] : "none"}' jc='${jc ? jc[0] : "none"}'`);
}
