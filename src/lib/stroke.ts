export const NIH = [
  [
    "1a",
    "1a. ระดับความรู้สึกตัว (LOC)",
    [
      "ตื่นดี",
      "ง่วง ปลุกตื่นง่าย",
      "กระตุ้นซ้ำ/เจ็บจึงตอบสนอง",
      "ไม่ตอบสนอง / reflex เท่านั้น",
    ],
    false,
  ],
  ["1b", "1b. ถามเดือนและอายุ", ["ถูกทั้ง 2", "ถูก 1", "ผิดทั้ง 2"], false],
  [
    "1c",
    "1c. ทำตามสั่ง (ลืม-หลับตา, กำ-แบมือ)",
    ["ได้ทั้ง 2", "ได้ 1", "ไม่ได้ทั้ง 2"],
    false,
  ],
  [
    "2",
    "2. การกลอกตา (Best gaze)",
    ["ปกติ", "อ่อนแรงบางส่วน", "Forced deviation"],
    false,
  ],
  [
    "3",
    "3. ลานสายตา (Visual)",
    ["ปกติ", "สูญเสียบางส่วน", "Hemianopia สมบูรณ์", "บอดทั้ง 2 ข้าง"],
    false,
  ],
  [
    "4",
    "4. ใบหน้าอ่อนแรง",
    ["ปกติ", "เล็กน้อย", "บางส่วน (ใบหน้าส่วนล่าง)", "สมบูรณ์"],
    false,
  ],
  [
    "5a",
    "5a. แขนซ้าย",
    [
      "ไม่ตก 10 วินาที",
      "ตกก่อน 10 วินาที",
      "ต้านแรงโน้มถ่วงได้บ้าง",
      "ต้านแรงโน้มถ่วงไม่ได้",
      "ไม่ขยับ",
    ],
    true,
  ],
  [
    "5b",
    "5b. แขนขวา",
    [
      "ไม่ตก 10 วินาที",
      "ตกก่อน 10 วินาที",
      "ต้านแรงโน้มถ่วงได้บ้าง",
      "ต้านแรงโน้มถ่วงไม่ได้",
      "ไม่ขยับ",
    ],
    true,
  ],
  [
    "6a",
    "6a. ขาซ้าย",
    [
      "ไม่ตก 5 วินาที",
      "ตกก่อน 5 วินาที",
      "ต้านแรงโน้มถ่วงได้บ้าง",
      "ต้านแรงโน้มถ่วงไม่ได้",
      "ไม่ขยับ",
    ],
    true,
  ],
  [
    "6b",
    "6b. ขาขวา",
    [
      "ไม่ตก 5 วินาที",
      "ตกก่อน 5 วินาที",
      "ต้านแรงโน้มถ่วงได้บ้าง",
      "ต้านแรงโน้มถ่วงไม่ได้",
      "ไม่ขยับ",
    ],
    true,
  ],
  ["7", "7. Limb ataxia", ["ไม่มี", "1 แขน/ขา", "2 แขน/ขา"], true],
  [
    "8",
    "8. Sensory",
    ["ปกติ", "ลดลงเล็กน้อย-ปานกลาง", "ลดลงมาก / ไม่รู้สึก"],
    false,
  ],
  [
    "9",
    "9. ภาษา (Best language)",
    [
      "ปกติ",
      "Aphasia เล็กน้อย-ปานกลาง",
      "Aphasia รุนแรง",
      "พูดไม่ได้ / Global aphasia",
    ],
    false,
  ],
  [
    "10",
    "10. Dysarthria",
    ["ปกติ", "เล็กน้อย-ปานกลาง", "รุนแรง ฟังไม่เข้าใจ"],
    true,
  ],
  [
    "11",
    "11. Extinction / Inattention",
    ["ปกติ", "ผิดปกติ 1 ด้าน", "ผิดปกติรุนแรง / >1 ด้าน"],
    false,
  ],
] as const;
export type NihKey = (typeof NIH)[number][0];
export const BEFAST = [
  ["B", "Balance", "เดินเซ ทรงตัวไม่ได้"],
  ["E", "Eyes", "ตามัว เห็นภาพซ้อน"],
  ["F", "Face", "ปากเบี้ยว หน้าเบี้ยว"],
  ["A", "Arm", "แขนขาอ่อนแรงครึ่งซีก ชา"],
  ["S", "Speech", "พูดไม่ชัด พูดไม่ออก"],
  ["T", "Time", "บันทึกเวลาเริ่มอาการ"],
] as const;
export interface Assessment {
  nihss: string;
  nihssItems: Partial<Record<NihKey, number | "UN">>;
  gcsE: string;
  gcsV: string;
  gcsM: string;
  dtxv: string;
  sbp: string;
  dbp: string;
  age: string;
  sex: string;
  cc: string;
  befast: string[];
}
export function blankAssessment(): Assessment {
  return {
    nihss: "",
    nihssItems: {},
    gcsE: "",
    gcsV: "",
    gcsM: "",
    dtxv: "",
    sbp: "",
    dbp: "",
    age: "",
    sex: "",
    cc: "",
    befast: [],
  };
}
export function nihTotal(items: Assessment["nihssItems"]) {
  let subtotal = 0,
    answered = 0,
    un = 0;
  for (const [id] of NIH) {
    const v = items[id];
    if (v === undefined) continue;
    answered++;
    if (v === "UN") un++;
    else subtotal += v;
  }
  return {
    subtotal,
    answered,
    un,
    complete: answered === NIH.length && un === 0,
  };
}
export function gcsNumber(a: Assessment) {
  return [a.gcsE, a.gcsV, a.gcsM].every((v) => /^\d$/.test(v))
    ? Number(a.gcsE) + Number(a.gcsV) + Number(a.gcsM)
    : null;
}
export function gcsText(a: Assessment) {
  if (!a.gcsE && !a.gcsV && !a.gcsM) return "ยังไม่ประเมิน";
  const n = gcsNumber(a);
  return `E${a.gcsE || "?"} V${a.gcsV || "?"} M${a.gcsM || "?"}${n == null ? " · รวมคะแนนไม่ได้" : ` = ${n}`}`;
}
export const outcomeFields = {
  hosp: "โรงพยาบาลปลายทาง",
  arrival: "เวลาถึง รพ.ปลายทาง",
  ct: "ผล CT",
  ct_time: "เวลาทำ CT",
  rtpa: "ได้ rtPA",
  needle: "เวลาให้ rtPA (Needle)",
  no_rtpa: "เหตุที่ไม่ได้ rtPA",
  thrombectomy: "Thrombectomy",
  final_dx: "วินิจฉัยสุดท้าย / ICD-10",
  dc_date: "วันที่ D/C",
  result: "สถานะ D/C",
  mrs: "mRS ตอน D/C (0–6)",
  barthel: "Barthel Index (0–100)",
  imc: "เข้าโปรแกรม IMC",
  imc_date: "วันเริ่ม IMC / รับกลับ",
  imc_place: "ที่ดูแล IMC",
  note: "ข้อมูลตอบกลับจากปลายทาง",
  by: "ผู้บันทึก",
} as const;
export const outcomeChoices: Partial<
  Record<keyof typeof outcomeFields, readonly string[]>
> = {
  ct: [
    "Ischemic stroke",
    "Hemorrhagic (ICH)",
    "SAH",
    "Stroke mimic / ไม่ใช่ Stroke",
    "CT ปกติ (TIA)",
    "ไม่ได้ทำ CT",
  ],
  rtpa: ["ได้ rtPA", "ไม่ได้ rtPA"],
  thrombectomy: ["ทำ", "ไม่ทำ", "ส่งต่อไปทำที่อื่น"],
  no_rtpa: [
    "เกิน 4.5 ชม. / ไม่ทราบเวลา",
    "เลือดออกในสมอง",
    "มีข้อห้ามอื่น",
    "อาการดีขึ้นเร็ว / NIHSS ต่ำ",
    "ญาติ/ผู้ป่วยปฏิเสธ",
    "ไม่ใช่ Stroke",
    "อื่น ๆ",
  ],
  result: [
    "Improved",
    "Not improved",
    "เสียชีวิต",
    "Refer ต่อ",
    "ส่งกลับ รพ.พลับพลาชัย",
    "ไม่สมัครใจอยู่",
  ],
  mrs: ["0", "1", "2", "3", "4", "5", "6"],
  imc: ["เข้า IMC", "ไม่เข้า", "ไม่เข้าเกณฑ์"],
};
export const outcomeTimes = ["arrival", "ct_time", "needle"];
export function parseThaiDateTime(v: string | undefined) {
  if (!v || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) return null;
  const n = Date.parse(v + "+07:00");
  if (!Number.isFinite(n)) return null;
  return new Date(n + 7 * 3600000).toISOString().slice(0, v.length) === v
    ? n
    : null;
}
export function referralMetrics(c: {
  onset: number | null;
  onsetUnknown: boolean;
  times: { door_in: { t: number | null }; door_out: { t: number | null } };
  outcome: Record<string, string>;
}) {
  const o = c.outcome,
    needle = o.rtpa === "ได้ rtPA" ? parseThaiDateTime(o.needle) : null,
    arrival = parseThaiDateTime(o.arrival);
  const diff = (a: number | null, b: number | null) =>
    a !== null && b !== null && b >= a ? (b - a) / 60000 : null;
  return {
    onsetNeedle: diff(c.onsetUnknown ? null : c.onset, needle),
    doorNeedle: diff(c.times.door_in.t, needle),
    receivingDoorNeedle: diff(arrival, needle),
    travel: diff(c.times.door_out.t, arrival),
  };
}
export function outcomeLines(o: Record<string, string>) {
  return Object.entries(outcomeFields)
    .filter(([k]) => o[k])
    .map(([k, label]) => `${label}: ${o[k]}`);
}
