#!/usr/bin/env python3
# Data: [Name, Total_Salary, Tiffin, OT, Increment_separate, Bonus, PF_Ded, Total_Ded, Net_Shown]
# Note: Increment is absorbed into Total Salary for some employees (Murad), 
# and deferred (not added) for others (Ummay Hani, Ayesha, Jannatur)
# Formula: Net = Total_Salary + Tiffin + OT + Bonus - PF_Ded - Total_Ded

employees = [
    ("Hasan Mahmud",              0,      0,   0,   0, 0,     0,     0),
    ("Hasina Mohammed",           45000, 525, 200,  0, 0,     0, 45725),
    ("Sadia Sultana Rima",        25000, 475, 200,  0, 0,     0, 25675),
    ("Farida Yesmin Tamanna",     20000, 525, 200,  0, 0,     0, 20725),
    ("Fatema Akter Mili",         25500, 525, 200,  0, 0,     0, 26225),
    ("Shalina Akter Eity",        18000, 525, 200,  0, 0,     0, 18725),
    ("Rabia Sultana Prity",       13000, 200,   0,  0, 0,  6160,  7040),
    ("Afrin Jahan Uzma",          17000, 500,   0,  0, 0,     0, 17500),
    ("Ariful Islam Maruf",        27000, 525, 200,  0, 0,     0, 27725),
    ("Jinat Farhana Chy",         18000, 500, 200,  0, 0,     0, 18700),
    ("Tabassuma Barat Chowdhury", 25000, 525, 200,  0, 0,     0, 25725),
    ("Sumaya Rahman",             19000, 525, 200,  0, 0,     0, 19725),
    ("Warda Siraj",               28000, 475, 200,  0, 0,     0, 28675),
    ("Irfan Hossain",             14000, 500,   0,  0, 0,     0, 14500),
    ("Sanjida Islam",             15000, 525, 200,  0, 0,     0, 15725),
    ("MOHOSHINA SHIFA",           11000, 525, 150,  0, 0,     0, 11675),
    ("Sadia Akter Lubna",         11000, 500, 150,  0, 0,     0, 11650),
    ("Taslima Akter",             14000, 425,   0,  0, 0,   960, 13465),
    ("Samiya Hashem",             11000, 525, 150,  0, 0,     0, 11675),
    ("Humaira Tasnim",            15000, 525,   0,  0, 0,     0, 15525),
    ("Aziza Sultana",             11000, 500, 150,  0, 0,     0, 11650),
    ("Farhana Yesmin",            15000, 500, 150,  3000, 0,  0, 18650),
    ("Kamrun Nahar",              12000, 500,   0,  0, 0,  1300, 11200),
    ("Tashmem Al Faed",           12000, 525,   0,  0, 6000,  0,  6525),
    ("Md Murad Hoshen",           22000, 475, 200,  0, 0,     0, 22675),
    ("Najmul Haque Masum",        16000, 525,   0,  0, 0,     0, 16425),
    ("RAHNUMAN NESA CHOWDHURY",   15000, 525, 150,  0, 0,     0, 15675),
    ("Othora Nausin Jafrin",       7000, 500, 200,  0, 0,     0,  7700),
    ("Md Rahat Chy",              17000, 400,   0,  0, 0,  3000, 14400),
    ("Sania Rahman",              13000, 525, 150,  0, 0,     0, 13675),
    ("Jaharin Subah",             12000, 500,   0,  0, 0,     0, 12500),
    ("Afroza Akter",              13000, 525, 150,  0, 0,     0, 13675),
    ("Ummay Hani Juthi",          18000, 425, 150,  0, 0,     0, 18575),
    ("Tanzina Haque",             12000, 525, 200,  0, 0,     0, 12725),
    ("Tahsina Tarannum",           7000, 525, 200,  0, 0,     0,  7725),
    ("MOHAMMAD ARAFAT UL ALAM",   14000, 525,   0,  0, 0,     0, 14525),
    ("MD Kawser Hussain Rasel",   20000, 525, 200,  0, 0,     0, 20725),
    ("Md. Mainuddin",             15000, 525,   0,  0, 0,     0, 15525),
    ("SUMAIYA NUSRAT PUSHPO",      8000, 525, 150,  0, 0,     0,  8675),
    ("Ismat Tasnia",               8000, 575, 150,  0, 0,     0,  8675),
    ("AYESHA SIDDIKA RUBA",       11000, 475,   0,  0, 0,     0, 11425),
    ("Jannatur Rahman Eshita",    11000, 475,   0,  0, 5500,  0,  5975),
    ("Sultana Yasmin Geeti",      10000, 500, 150,  0, 5000,  0,  5650),
    ("Shaila Parvin",             10000, 525, 150,  0, 5000,  0,  5675),
    ("Boro Nanny",                 5000, 420,   0,  0, 0,     0,  5420),
    ("Rabia Rima Nanny",           6000, 380,   0,  0, 0,     0,  6380),
    ("Moyna Nanny",                5500, 380,   0,  0, 0,     0,  5880),
    ("Rojina Nanny",               5000, 420,   0,  0, 0,     0,  5420),
    ("Sharmin Nanny",              5500, 420,   0,  0, 0,     0,  5920),
    ("Nargis Akter Nanny",         5000, 380,   0,  0, 0,     0,  4980),
]

# Note: for Farhana Yesmin, Bonus=3000 is in column 4 (using as 'bonus')
# For Tashmem Al Faed and others, PF is in column 5
# Let me reorganize: (Name, Total_Sal, Tiffin, OT, Bonus, PF_Ded, Total_Ded, Net_Shown)

employees2 = [
    ("Hasan Mahmud",               0,    0,   0,    0,    0,    0,     0),
    ("Hasina Mohammed",        45000,  525, 200,    0,    0,    0, 45725),
    ("Sadia Sultana Rima",     25000,  475, 200,    0,    0,    0, 25675),
    ("Farida Yesmin Tamanna",  20000,  525, 200,    0,    0,    0, 20725),
    ("Fatema Akter Mili",      25500,  525, 200,    0,    0,    0, 26225),
    ("Shalina Akter Eity",     18000,  525, 200,    0,    0,    0, 18725),
    ("Rabia Sultana Prity",    13000,  200,   0,    0,    0, 6160,  7040),
    ("Afrin Jahan Uzma",       17000,  500,   0,    0,    0,    0, 17500),
    ("Ariful Islam Maruf",     27000,  525, 200,    0,    0,    0, 27725),
    ("Jinat Farhana Chy",      18000,  500, 200,    0,    0,    0, 18700),
    ("Tabassuma Barat Chw.",   25000,  525, 200,    0,    0,    0, 25725),
    ("Sumaya Rahman",          19000,  525, 200,    0,    0,    0, 19725),
    ("Warda Siraj",            28000,  475, 200,    0,    0,    0, 28675),
    ("Irfan Hossain",          14000,  500,   0,    0,    0,    0, 14500),
    ("Sanjida Islam",          15000,  525, 200,    0,    0,    0, 15725),
    ("MOHOSHINA SHIFA",        11000,  525, 150,    0,    0,    0, 11675),
    ("Sadia Akter Lubna",      11000,  500, 150,    0,    0,    0, 11650),
    ("Taslima Akter",          14000,  425,   0,    0,    0,  960, 13465),
    ("Samiya Hashem",          11000,  525, 150,    0,    0,    0, 11675),
    ("Humaira Tasnim",         15000,  525,   0,    0,    0,    0, 15525),
    ("Aziza Sultana",          11000,  500, 150,    0,    0,    0, 11650),
    ("Farhana Yesmin",         15000,  500, 150, 3000,    0,    0, 18650),
    ("Kamrun Nahar",           12000,  500,   0,    0,    0, 1300, 11200),
    ("Tashmem Al Faed",        12000,  525,   0,    0, 6000,    0,  6525),
    ("Md Murad Hoshen",        22000,  475, 200,    0,    0,    0, 22675),
    ("Najmul Haque Masum",     16000,  525,   0,    0,    0,    0, 16425),
    ("RAHNUMAN NESA CHW.",     15000,  525, 150,    0,    0,    0, 15675),
    ("Othora Nausin Jafrin",    7000,  500, 200,    0,    0,    0,  7700),
    ("Md Rahat Chy",           17000,  400,   0,    0,    0, 3000, 14400),
    ("Sania Rahman",           13000,  525, 150,    0,    0,    0, 13675),
    ("Jaharin Subah",          12000,  500,   0,    0,    0,    0, 12500),
    ("Afroza Akter",           13000,  525, 150,    0,    0,    0, 13675),
    ("Ummay Hani Juthi",       18000,  425, 150,    0,    0,    0, 18575),
    ("Tanzina Haque",          12000,  525, 200,    0,    0,    0, 12725),
    ("Tahsina Tarannum",        7000,  525, 200,    0,    0,    0,  7725),
    ("MOHAMMAD ARAFAT UL ALAM",14000,  525,   0,    0,    0,    0, 14525),
    ("MD Kawser Hussain Rasel",20000,  525, 200,    0,    0,    0, 20725),
    ("Md. Mainuddin",          15000,  525,   0,    0,    0,    0, 15525),
    ("SUMAIYA NUSRAT PUSHPO",   8000,  525, 150,    0,    0,    0,  8675),
    ("Ismat Tasnia",            8000,  575, 150,    0,    0,    0,  8675),
    ("AYESHA SIDDIKA RUBA",    11000,  475,   0,    0,    0,    0, 11425),
    ("Jannatur Rahman Eshita", 11000,  475,   0,    0, 5500,    0,  5975),
    ("Sultana Yasmin Geeti",   10000,  500, 150,    0, 5000,    0,  5650),
    ("Shaila Parvin",          10000,  525, 150,    0, 5000,    0,  5675),
    ("Boro Nanny",              5000,  420,   0,    0,    0,    0,  5420),
    ("Rabia Rima Nanny",        6000,  380,   0,    0,    0,    0,  6380),
    ("Moyna Nanny",             5500,  380,   0,    0,    0,    0,  5880),
    ("Rojina Nanny",            5000,  420,   0,    0,    0,    0,  5420),
    ("Sharmin Nanny",           5500,  420,   0,    0,    0,    0,  5920),
    ("Nargis Akter Nanny",      5000,  380,   0,    0,    0,    0,  4980),
]

print(f"{'Name':<30} {'Calc':>8} {'Shown':>8} {'Diff':>8} {'Status'}")
print("-" * 70)

errors = []
total_shown = 0
total_calc = 0

for row in employees2:
    name, total_sal, tiffin, ot, bonus, pf_ded, total_ded, net_shown = row
    calculated = total_sal + tiffin + ot + bonus - pf_ded - total_ded
    diff = calculated - net_shown
    total_shown += net_shown
    total_calc += calculated
    status = "✓" if diff == 0 else f"❌ ERROR"
    print(f"{name:<30} {calculated:>8,} {net_shown:>8,} {diff:>+8,} {status}")
    if diff != 0:
        errors.append((name, calculated, net_shown, diff))

print("-" * 70)
print(f"\n{'Grand Total (Shown):':<30} {total_shown:>8,}")
print(f"{'Grand Total (Calculated):':<30} {total_calc:>8,}")
print(f"{'Difference:':<30} {total_calc - total_shown:>+8,}")
print(f"\n{'='*70}")
print(f"\nERRORS FOUND ({len(errors)}):")
for name, calc, shown, diff in errors:
    direction = "UNDERPAID" if diff > 0 else "OVERPAID"
    print(f"  ❌ {name}: Calculated={calc:,} | Shown={shown:,} | Diff={diff:+,} [{direction}]")
EOF
