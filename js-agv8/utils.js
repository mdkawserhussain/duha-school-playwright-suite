// ─── DUHA PAYROLL — SHARED UTILITIES ───────────────────────────────────────
// All common functions used across parse.js, all.js, verify.js, bank2.js, wa.js, wa2.js

/**
 * Normalizes a name for comparison by lowercasing and stripping non-alpha chars.
 */
function normalize(name) {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z]/g, '').trim();
}

/**
 * Converts a time string like "07:49 AM" to minutes since midnight.
 */
function timeToMins(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
  if (!match) return 0;
  let hrs = parseInt(match[1]);
  let mins = parseInt(match[2]);
  let period = match[3] || 'AM';
  if (period === 'PM' && hrs !== 12) hrs += 12;
  if (period === 'AM' && hrs === 12) hrs = 0;
  return hrs * 60 + mins;
}

/**
 * Converts a number to words (South Asian style: Lakh, Crore).
 */
function numberToWords(n) {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : "");
  if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + numberToWords(n%100) : "");
  if (n < 100000) return numberToWords(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + numberToWords(n%1000) : "");
  if (n < 10000000) return numberToWords(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + numberToWords(n%100000) : "");
  return numberToWords(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + numberToWords(n%10000000) : "");
}

/**
 * Finds a staff config entry by name (exact match first, then fuzzy substring).
 * @param {string} empName - Employee name to look up
 * @param {Array} staff - config.staff array
 * @returns {Object} Staff config entry or fallback defaults
 */
function findStaffConfig(empName, staff) {
  const norm = normalize(empName);
  
  // Explicit manual mapping for known shortened/ambiguous biometric names
  const manualMap = {
    "akter": "Taslima Akter",
    "aziza": "Aziza Sultana",
    "afroza": "Afroza Akter",
    "jannaturrahman": "Jannatur Rahman Eshita",
    "rimananny": "Rabia Rima Nanny"
  };
  
  if (manualMap[norm]) {
    const targetName = normalize(manualMap[norm]);
    const found = staff.find(s => normalize(s.name) === targetName);
    if (found) return found;
  }

  // 1. Exact match
  let found = staff.find(s => normalize(s.name) === norm);
  if (found) return found;

  // 2. Fuzzy match (substring)
  found = staff.find(s => {
    const sNorm = normalize(s.name);
    return norm.includes(sNorm) || sNorm.includes(norm);
  });
  return found || null;
}

/**
 * Validates config.json structure. Throws on critical errors, warns on lock.
 */
function validateConfig(config) {
  if (config.locked) {
    console.warn("⚠️  WARNING: config.json is locked. Outputs are for reference only.");
  }
  if (!config.staff || !Array.isArray(config.staff)) {
    throw new Error("config.json missing 'staff' array");
  }
  config.staff.forEach(s => {
    if (!s.name) throw new Error("Staff entry missing name");
    if (typeof s.basic !== 'number') throw new Error(`${s.name}: basic must be a number`);
  });
}

/**
 * Parses a numeric value from a string, stripping non-digit chars.
 */
function getVal(str) {
  if (!str) return 0;
  return parseInt(str.replace(/[^0-9]/g, '') || 0);
}

/**
 * Formats Ab:/Lt:/Lv: log strings into human-readable lines with full dates.
 * @param {string} str - Raw markings string like "Ab:3,10 Lt:5(2m),12(8m) Lv:7"
 * @param {string} monthName - Month name like "April"
 * @param {number} year - Year like 2026
 */
function formatLogs(str, monthName, year) {
  if (!str) return "";
  if (!year) year = 2026;

  const expandDates = (datesStr) => {
    return datesStr.split(',').map(d => {
      const day = d.trim();
      if (!day) return "";
      const match = day.match(/^(\d+)(\(.*\))?$/);
      if (match) {
        const dNum = match[1].padStart(2, '0');
        const suffix = match[2] || "";
        return `${dNum}-${monthName}-${year}${suffix}`;
      }
      return day;
    }).filter(Boolean).join(', ');
  };

  let output = [];
  const abMatch = str.match(/Ab:\s*([^L]*?)(?=Lt:|Lv:|$)/i);
  if (abMatch) output.push(`❌ ABSENT DATES: ${expandDates(abMatch[1])}`);
  const ltMatch = str.match(/Lt:\s*([^A]*?)(?=Ab:|Lv:|$)/i);
  if (ltMatch) output.push(`🕒 LATE DATES: ${expandDates(ltMatch[1])}`);
  const lvMatch = str.match(/Lv:\s*([^A]*?)(?=Ab:|Lt:|$)/i);
  if (lvMatch) output.push(`🍃 LEAVE DATES: ${expandDates(lvMatch[1])}`);

  if (output.length === 0 && str.trim()) return str.trim();
  return output.join('\n');
}

/**
 * Gets Saturdays for a given month.
 */
function getSaturdays(year, month) {
  const saturdays = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 6) saturdays.push(date.getDate());
    date.setDate(date.getDate() + 1);
  }
  return saturdays;
}

/**
 * Gets month name from config.
 */
function getMonthName(config) {
  return new Date(config.year, config.month - 1).toLocaleString('en-US', { month: 'long' });
}

module.exports = {
  normalize,
  timeToMins,
  numberToWords,
  findStaffConfig,
  validateConfig,
  getVal,
  formatLogs,
  getSaturdays,
  getMonthName
};
