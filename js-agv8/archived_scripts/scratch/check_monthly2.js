const fs = require('fs');
const AdmZip = require('d:/Rasel/dis-docs/hr/js-agv8/node_modules/adm-zip');

try {
  if (fs.existsSync('d:/Rasel/dis-docs/hr/js-agv8/input/monthly2.docx')) {
    const zip = new AdmZip('d:/Rasel/dis-docs/hr/js-agv8/input/monthly2.docx');
    const xml = zip.readAsText('word/document.xml');
    console.log('monthly2.docx XML length:', xml.length);
    const textMatches = xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    const texts = textMatches.map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, ''));
    
    console.log('--- Checking for nanny name matches in monthly2.docx ---');
    const queries = ["shahida", "rohima", "boro", "rima", "moyna", "rojina", "sharmin", "nargis"];
    queries.forEach(q => {
      const matches = texts.filter(t => t.toLowerCase().includes(q));
      console.log(`${q}:`, matches);
    });
  } else {
    console.log('monthly2.docx does not exist');
  }
} catch (e) {
  console.error(e);
}
