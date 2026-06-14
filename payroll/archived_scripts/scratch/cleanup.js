const fs = require('fs');
try {
  if (fs.existsSync('d:/Rasel/dis-docs/hr/js-agv8/input/att_may_backup.docx')) {
    fs.unlinkSync('d:/Rasel/dis-docs/hr/js-agv8/input/att_may_backup.docx');
    console.log('Successfully deleted backup.');
  }
} catch (e) {
  console.error(e);
}
