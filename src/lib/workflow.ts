import {
  metrics,
  thaiDate,
  type Case,
  type State,
  type TimeKey,
} from "./model";

export const stepDetails: Record<Exclude<TimeKey, "door_in">, string> = {
  md: "ซักประวัติ ประเมิน NIHSS · กดเวลาบนจอ",
  dtx: "เจาะใน ER · กดเวลาและกรอกค่า DTX เอง",
  ekg: "EKG ใน ER · กดเวลาทำจริงบนจอ",
  lab_sent: "CBC, PT/INR, BUN/Cr · เวลาสั่ง Lab จาก HOSxP",
  consult: "แจ้ง Stroke Fast Track และประสาน รพ.ปลายทาง",
  accept: "รพ.ปลายทางตอบรับส่งต่อ · กดบนจอ",
  ambu: "พยาบาลและอุปกรณ์ส่งต่อพร้อม · กดบนจอ",
  door_out: "เวลารถออกจริง · เวลาใบ Refer จาก HOSxP ใช้อ้างอิงและแก้ได้",
};
export const symptomPresets = [
  "อาการแย่ลง / NIHSS เพิ่มขึ้น",
  "ซึมลง GCS ลดลง",
  "ชัก",
  "BP > 220/120",
  "BP < 90 / ช็อก",
  "ปวดศีรษะรุนแรง อาเจียน",
  "หายใจไม่ดี / ใส่ท่อช่วยหายใจ",
  "DTX < 70",
  "อาการดีขึ้น",
];
export const delayPresets = [
  "ไม่ทราบ Onset / รอประวัติ",
  "ญาติตัดสินใจช้า",
  "รอประสาน รพ.ปลายทาง",
  "รอรถ Refer",
  "ผู้ป่วยไม่ยินยอม",
  "รอผล Lab",
];
export function dateRange(
  kind: "month" | "previous" | "fiscal" | "all",
  now = Date.now(),
) {
  const today = thaiDate(now),
    [year, month] = today.split("-").map(Number);
  if (kind === "all") return { from: "", to: "" };
  if (kind === "fiscal")
    return { from: `${month >= 10 ? year : year - 1}-10-01`, to: today };
  if (kind === "month") return { from: today.slice(0, 7) + "-01", to: today };
  const end = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
  return { from: end.slice(0, 7) + "-01", to: end };
}
export function clockValue(t: number | null) {
  return t == null ? "" : new Date(t + 7 * 3600000).toISOString().slice(11, 19);
}
// Clock-only editing follows the nearest day to the existing event (or current time).
// The server still checks future times and Door-in ordering.
export function timestampFromClock(value: string, reference: number) {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const [h, m, s = 0] = value.split(":").map(Number);
  if (h > 23 || m > 59 || s > 59) return null;
  const t = Date.parse(
    thaiDate(reference) +
      "T" +
      value +
      (value.length === 5 ? ":00" : "") +
      "+07:00",
  );
  return [t - 86400000, t, t + 86400000].sort(
    (a, b) => Math.abs(a - reference) - Math.abs(b - reference),
  )[0];
}
export function rcaLabel(c: Case, targets: State["targets"]) {
  if (c.rca?.status === "done") return "RCA เสร็จ";
  if (c.rca) return "RCA ร่าง";
  const late = Object.entries(metrics(c)).some(
    ([k, v]) => v != null && v > targets[k as keyof ReturnType<typeof metrics>],
  );
  return late || c.notes.some((n) => n.important) ? "ต้องทำ RCA" : "ทบทวน RCA";
}
