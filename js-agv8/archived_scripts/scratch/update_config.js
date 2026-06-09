const fs = require('fs');

const path = 'd:/Rasel/dis-docs/hr/js-agv8/config.json';
let config = JSON.parse(fs.readFileSync(path, 'utf8'));

const nameMap = {
  "Nusrat Jahan Era": "Nusrat Jahan Ira",
  "Mohoshina Shifa": "Mohoshina Shifa Buble",
  "Jannatur Rahman Eshita": "Jannatur Rahman",
  "Ashiq": "Ashik Bhuiyan",
  "Md Helal": "Md Helal Uddin",
  "Boro Nanny": "Shahida",
  "Rabia Rima Nanny": "Rabeya Rima",
  "Moyna Nanny": "Moyna",
  "Rojina Nanny": "Rohima",
  "Sharmin Nanny": "Sharmin",
  "Nargis Akter Nanny": "Nargis Akter"
};

let updatedCount = 0;
config.staff.forEach(member => {
  if (nameMap[member.name]) {
    console.log(`Updating name: "${member.name}" -> "${nameMap[member.name]}"`);
    member.name = nameMap[member.name];
    updatedCount++;
  }
});

fs.writeFileSync(path, JSON.stringify(config, null, 2), 'utf8');
console.log(`Successfully updated ${updatedCount} staff names in config.json.`);
