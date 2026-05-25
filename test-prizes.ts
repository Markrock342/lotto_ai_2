/**
 * ทดสอบ logic รางวัล + สรุปรายงาน
 * ไม่ต่อ DB เลย — รันได้ทันที
 *
 *   npx tsx test-prizes.ts
 */

import { checkWinsForNumber } from "./src/lib/check-prizes";
import { DEFAULT_RATES } from "./src/lib/rates";
import { parseSlipText } from "./src/lib/parse-slip";

const PASS = "✅";
const FAIL = "❌";

function assert(label: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? PASS : FAIL} ${label}`);
  if (!ok) {
    console.log("   คาดหวัง:", expected);
    console.log("   ได้จริง:", got);
  }
}

// ─── 1. ตรวจรางวัล checkWinsForNumber ────────────────────────────────────────
console.log("\n══════════════════════════════════════");
console.log(" ทดสอบ check-prizes (ผลออก = 1234)");
console.log("══════════════════════════════════════");

const result = { fourDigit: "1234" };
const r = DEFAULT_RATES;

// 4 ตัวตรง
assert("1234 → 4ตัวตรง", checkWinsForNumber("1234", result, r)[0]?.type, "fourStraight");

// 4 ตัวโต๊ด (ตัวอย่างบางชุด)
assert("2134 → 4ตัวโต๊ด", checkWinsForNumber("2134", result, r)[0]?.type, "fourTod");
assert("4321 → 4ตัวโต๊ด", checkWinsForNumber("4321", result, r)[0]?.type, "fourTod");

// 3 ตัวตรง (3 ท้าย = 234)
assert("0234 → 3ตัวตรง", checkWinsForNumber("0234", result, r)[0]?.type, "threeStraight");
assert("9234 → 3ตัวตรง", checkWinsForNumber("9234", result, r)[0]?.type, "threeStraight");

// 3 ตัวโต๊ด (สลับ 234)
assert("0243 → 3ตัวโต๊ด", checkWinsForNumber("0243", result, r)[0]?.type, "threeTod");
assert("0342 → 3ตัวโต๊ด", checkWinsForNumber("0342", result, r)[0]?.type, "threeTod");

// 3 ตัวหน้า (123)
assert("1230 → 3ตัวหน้า", checkWinsForNumber("1230", result, r)[0]?.type, "threeFront");
assert("1239 → 3ตัวหน้า", checkWinsForNumber("1239", result, r)[0]?.type, "threeFront");

// 2 ตัวหน้า (12)
assert("1200 → 2ตัวหน้า", checkWinsForNumber("1200", result, r)[0]?.type, "twoFront");

// 2 ตัวหลัง (34)
assert("0034 → 2ตัวหลัง", checkWinsForNumber("0034", result, r)[0]?.type, "twoBack");
assert("9934 → 2ตัวหลัง", checkWinsForNumber("9934", result, r)[0]?.type, "twoBack");

// ไม่ถูกเลย
assert("5678 → ไม่ถูก", checkWinsForNumber("5678", result, r).length, 0);

// จ่ายสูงกว่าเสมอ (4ตัวตรง > 3ตัวตรง)
assert("1234 จ่าย 4ตัวตรง (highest)", checkWinsForNumber("1234", result, r)[0]?.type, "fourStraight");

// ─── 2. ทดสอบ logic สรุปรายงาน (prizeCategorySummary) ────────────────────────
console.log("\n══════════════════════════════════════");
console.log(" ทดสอบ สรุปรายงานแยกประเภท");
console.log("══════════════════════════════════════");

/** จำลอง prizeCategorySummary จาก bets */
function buildPrizeSummary(bets: { number: string; amount: number }[]) {
  const pad4 = (n: string) => n.replace(/\D/g, "").padStart(4, "0").slice(-4);
  const categories = [
    { key: "fourStraight", label: "4 ตัวตรง",    extract: (n: string) => n },
    { key: "threeStraight", label: "3 ตัวตรง",   extract: (n: string) => n.slice(-3) },
    { key: "threeFront",    label: "3 ตัวหน้า",  extract: (n: string) => n.slice(0, 3) },
    { key: "twoFront",      label: "2 ตัวหน้า",  extract: (n: string) => n.slice(0, 2) },
    { key: "twoBack",       label: "2 ตัวหลัง",  extract: (n: string) => n.slice(-2) },
  ];
  return categories.map(({ key, label, extract }) => {
    const map = new Map<string, { sets: number; amount: number }>();
    for (const b of bets) {
      const num4 = pad4(b.number);
      const digit = extract(num4);
      const existing = map.get(digit) ?? { sets: 0, amount: 0 };
      existing.sets += 1;
      existing.amount += b.amount;
      map.set(digit, existing);
    }
    const rows = Array.from(map.entries())
      .map(([number, data]) => ({ number, ...data }))
      .sort((a, b) => b.sets - a.sets);
    return { key, label, rows, totalSets: bets.length, uniqueNumbers: rows.length };
  });
}

// ชุดทดสอบ: ลูกค้าซื้อ 1234, 1243, 5678
const fakeBets = [
  { number: "1234", amount: 100 },
  { number: "1234", amount: 100 },
  { number: "1243", amount: 50 },
  { number: "5678", amount: 200 },
];

const summary = buildPrizeSummary(fakeBets);
const four = summary.find(s => s.key === "fourStraight")!;
const three = summary.find(s => s.key === "threeStraight")!;
const twoF = summary.find(s => s.key === "twoFront")!;
const twoB = summary.find(s => s.key === "twoBack")!;

// 4ตัวตรง: มี 3 เลข (1234×2, 1243×1, 5678×1)
assert("4ตัวตรง uniqueNumbers = 3", four.uniqueNumbers, 3);
// 3ตัวตรง: 1234→"234", 1243→"243", 5678→"678" → 3 กลุ่ม (234≠243)
assert("3ตัวตรง uniqueNumbers = 3", three.uniqueNumbers, 3);
// 3ตัวตรง: 234 มี 2 ชุด (1234×2), 243 มี 1 ชุด (1243×1)
assert("3ตัวตรง 234 sets = 2", three.rows.find(r => r.number === "234")?.sets, 2);
// 2ตัวหน้า: 12 (1234+1243) = 3 ชุด, 56 = 1 ชุด
assert("2ตัวหน้า 12 sets = 3", twoF.rows.find(r => r.number === "12")?.sets, 3);
// 2ตัวหลัง: 34 (1234×2) = 2 ชุด, 43 (1243) = 1 ชุด, 78 = 1 ชุด
assert("2ตัวหลัง 34 sets = 2", twoB.rows.find(r => r.number === "34")?.sets, 2);

// ─── 3. highlight ผู้ชนะ ─────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════");
console.log(" ทดสอบ highlight เมื่อผลออก = 1234");
console.log("══════════════════════════════════════");

const resultDigits = {
  full:   "1234",
  back3:  "234",
  front3: "123",
  front2: "12",
  back2:  "34",
};

function winDigitForCat(key: string) {
  if (key === "fourStraight")  return resultDigits.full;
  if (key === "threeStraight") return resultDigits.back3;
  if (key === "threeFront")    return resultDigits.front3;
  if (key === "twoFront")      return resultDigits.front2;
  if (key === "twoBack")       return resultDigits.back2;
  return undefined;
}

for (const cat of summary) {
  const winDigit = winDigitForCat(cat.key);
  const winRow = winDigit ? cat.rows.find(r => r.number === winDigit) : undefined;
  const hasBet = !!winRow;
  console.log(`${PASS} ${cat.label}: winDigit=${winDigit}, hasBettors=${hasBet}${hasBet ? ` (${winRow!.sets} ชุด)` : ""}`);
}

// ─── 4. ทดสอบ parse-slip ──────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════");
console.log(" ทดสอบ parse-slip");
console.log("══════════════════════════════════════");

// "1234 100" → 100 มีแค่ 3 หลัก parser คิดว่าเป็นเลขชุดใหม่ (0100)
// ถ้าอยากให้ amount=100 ต้องใช้ "1234 x 100" หรือ "1234=100"
const slip1a = parseSlipText("1234 100\n5678 200", 1);
assert("parse 'เลข เลข' → ได้ 4 entries (แต่ละบรรทัด 2 เลข)", slip1a.entries.length, 4);

// format ถูกต้องที่ใช้ในระบบ: pricePerSet=100 → amount=100 ต่อชุด
const slip1b = parseSlipText("1234\n5678", 100);
assert("parse pricePerSet=100: 2 entries", slip1b.entries.length, 2);
assert("parse: entry[0].number = 1234", slip1b.entries[0].number, "1234");
assert("parse: entry[0].amount = 100", slip1b.entries[0].amount, 100);
assert("parse: entry[1].number = 5678", slip1b.entries[1].number, "5678");
assert("parse: entry[1].amount = 100", slip1b.entries[1].amount, 100);

const slip2 = parseSlipText("= 3\n1234\n5678\n9012", 50);
assert("declared sets x3: 3 เลข × 3 ชุด = 9 entries", slip2.entries.length, 9);

const slip3 = parseSlipText("1234 x 5", 50);
assert("1234 x 5 → 5 entries", slip3.entries.length, 5);

console.log("\n══════════════════════════════════════");
console.log(" ✅ เสร็จสิ้น — ไม่กระทบ DB เลย");
console.log("══════════════════════════════════════\n");
