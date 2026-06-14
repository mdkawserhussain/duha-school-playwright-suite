const fs = require('fs');
const { execSync } = require('child_process');

try {
  console.log('backing up May att.docx...');
  if (fs.existsSync('d:/Rasel/dis-docs/hr/js-agv8/input/att.docx')) {
    fs.copyFileSync('d:/Rasel/dis-docs/hr/js-agv8/input/att.docx', 'd:/Rasel/dis-docs/hr/js-agv8/input/att_may_backup.docx');
  }

  console.log('copying attapril.docx to att.docx...');
  fs.copyFileSync('d:/Rasel/dis-docs/hr/js-agv8/input/attapril.docx', 'd:/Rasel/dis-docs/hr/js-agv8/input/att.docx');

  console.log('temporarily changing month to 4 in config.json...');
  const configPath = 'd:/Rasel/dis-docs/hr/js-agv8/config.json';
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const originalMonth = config.month;
  config.month = 4;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

  console.log('running node parse.js...');
  const output = execSync('node parse.js', { cwd: 'd:/Rasel/dis-docs/hr/js-agv8' }).toString();
  console.log(output);

  console.log('restoring config.json month...');
  config.month = originalMonth;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

  console.log('restoring May att.docx...');
  fs.copyFileSync('d:/Rasel/dis-docs/hr/js-agv8/input/att_may_backup.docx', 'd:/Rasel/dis-docs/hr/js-agv8/input/att.docx');
  fs.unlinkSync('d:/Rasel/dis-docs/hr/js-agv8/input/att_may_backup.docx');

  console.log('Done!');
} catch (e) {
  console.error('Error during verification:', e.message);
  if (e.stdout) {
    console.error(e.stdout.toString());
  }
}
