import { z } from "zod";
import {
  NIH,
  BEFAST,
  outcomeChoices,
  outcomeFields,
  outcomeTimes,
  parseThaiDateTime,
  type Assessment,
} from "./stroke";
const numberText = (max: number, integer = false) =>
  z
    .string()
    .max(20)
    .refine(
      (v) =>
        v === "" ||
        (/^\d+(\.\d+)?$/.test(v) &&
          Number(v) <= max &&
          (!integer || Number.isInteger(Number(v)))),
      `ค่าต้องเป็น${integer ? "จำนวนเต็ม " : ""}0–${max}`,
    );
export const assessmentPatch = z
  .object({
    nihss: numberText(42, true),
    dtxv: numberText(2000),
    sbp: numberText(400),
    dbp: numberText(300),
    age: numberText(130, true),
    sex: z.enum(["", "ชาย", "หญิง"]),
    cc: z.string().trim().max(4000),
    gcsE: z.enum(["", "1", "2", "3", "4"]),
    gcsV: z.enum(["", "1", "2", "3", "4", "5", "T", "A"]),
    gcsM: z.enum(["", "1", "2", "3", "4", "5", "6"]),
    befast: z.array(z.enum(BEFAST.map(([k]) => k))).max(6),
  })
  .partial()
  .strict();
export function validateNihItem(item: string, value: number | "UN" | null) {
  const row = NIH.find((r) => r[0] === item);
  if (
    !row ||
    (value === "UN" && !row[3]) ||
    (typeof value === "number" &&
      (!Number.isInteger(value) || value < 0 || value >= row[2].length))
  )
    throw Error("คะแนน NIHSS รายข้อไม่ถูกต้อง");
  return item as keyof Assessment["nihssItems"];
}
export function validateOutcome(
  value: Record<string, string>,
  door: number | null,
  now: number,
) {
  for (const [key, v] of Object.entries(value)) {
    if (!(key in outcomeFields)) throw Error("ช่องผลหลังส่งต่อไม่ถูกต้อง");
    const choices = outcomeChoices[key as keyof typeof outcomeChoices];
    if (v && choices && !choices.includes(v))
      throw Error("ค่าผลหลังส่งต่อไม่ถูกต้อง");
  }
  if (
    value.barthel &&
    (!/^\d+$/.test(value.barthel) || Number(value.barthel) > 100)
  )
    throw Error("Barthel Index ต้องเป็นจำนวนเต็ม 0–100");
  for (const key of ["dc_date", "imc_date"])
    if (
      value[key] &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value[key]) ||
        Number.isNaN(Date.parse(value[key])) ||
        new Date(value[key] + "T00:00:00Z").toISOString().slice(0, 10) !==
          value[key])
    )
      throw Error("วันที่ไม่ถูกต้อง");
  for (const key of outcomeTimes) {
    if (!value[key]) continue;
    const t = parseThaiDateTime(value[key]);
    if (t === null || t > now + 60000 || (door !== null && t < door))
      throw Error("เวลาผลหลังส่งต่อต้องไม่ก่อน Door-in หรืออยู่ในอนาคต");
  }
  const arrival = parseThaiDateTime(value.arrival),
    needle = parseThaiDateTime(value.needle);
  if (needle !== null && value.rtpa !== "ได้ rtPA")
    throw Error("กรุณาระบุว่าได้ rtPA ก่อนลงเวลา Needle");
  if (arrival !== null && needle !== null && needle < arrival)
    throw Error("Needle ต้องไม่ก่อนถึงโรงพยาบาลปลายทาง");
}
