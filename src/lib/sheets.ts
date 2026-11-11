import { config } from "./config";
import { changeState, readState } from "./store";
import {
  metrics,
  thaiDate,
  thaiTime,
  minutes,
  type Case,
  type TimeKey,
} from "./model";
import { gcsText } from "./stroke";
import { randomUUID } from "node:crypto";
import { GoogleSheetsClient } from "./google-sheets";
export function sheetRow(c: Case) {
  const m = metrics(c),
    targets = readState().targets;
  const wall = (t: number | null) =>
    t === null
      ? ""
      : new Date(t + 7 * 3600000).toISOString().slice(0, 19).replace("T", " ");
  const time = (key: TimeKey) => wall(c.times[key].t);
  const safeOutcome = Object.fromEntries(
    Object.entries(c.outcome).filter(
      ([k]) => !["note", "by", "hosp", "final_dx", "imc_place"].includes(k),
    ),
  );
  return {
    case_id: c.id,
    วันที่: thaiDate(c.times.door_in.t ?? c.created),
    HN: c.hn,
    VN: c.vn,
    ผู้ป่วย: config.sendPii ? c.label : "",
    สิทธิการรักษา: c.patient?.pttype || "",
    NIHSS: c.assessment.nihss,
    GCS: gcsText(c.assessment),
    "Onset / LKW": c.onsetUnknown ? "" : wall(c.onset),
    แนวทาง: c.path,
    "Door-in": time("door_in"),
    EKG: time("ekg"),
    แพทย์ตรวจ: time("md"),
    DTX: time("dtx"),
    "Door-out": time("door_out"),
    ส่งต่อ: c.dest,
    "Door→แพทย์ (นาที)": m.md,
    "Door→ประสาน (นาที)": m.consult,
    "DIDO (นาที)": m.dido,
    "Onset→Door (นาที)": c.onsetUnknown
      ? null
      : minutes(c.onset, c.times.door_in.t),
    "ผล Lab": c.labs.map((l) => l.name + ": " + (l.result || "")).join("; "),
    แพทย์ผ่านเป้า: m.md === null ? "" : m.md <= targets.md ? "ผ่าน" : "ไม่ผ่าน",
    ประสานผ่านเป้า:
      m.consult === null
        ? ""
        : m.consult <= targets.consult
          ? "ผ่าน"
          : "ไม่ผ่าน",
    "DIDO ผ่านเป้า":
      m.dido === null ? "" : m.dido <= targets.dido ? "ผ่าน" : "ไม่ผ่าน",
    "อาการเปลี่ยนแปลง / หมายเหตุ": config.sendPii
      ? c.notes.map((n) => thaiTime(n.t) + " " + n.text).join("; ")
      : "",
    "RCA สถานะ": c.rca?.status || "",
    ระดับความรุนแรง: c.rca?.severity || "",
    ปัจจัยที่เกี่ยวข้อง: c.rca ? Object.values(c.rca.factors).join("; ") : "",
    สาเหตุราก: config.sendPii ? c.rca?.root || "" : "",
    มาตรการแก้ไข: c.rca?.actions.map((a) => a.text).join("; ") || "",
    "วินิจฉัยสุดท้าย (ปลายทาง)": c.outcome.final_dx || "",
    rtPA: c.outcome.rtpa || "",
    ผลการรักษา: c.outcome.result || "",
    รายละเอียดผลหลังส่งต่อ: JSON.stringify({
      ...safeOutcome,
      ...(config.sendPii ? c.outcome : {}),
      DTX: c.assessment.dtxv,
      BP: c.assessment.sbp + "/" + c.assessment.dbp,
      BEFAST: c.assessment.befast,
    }),
  };
}
const client = new GoogleSheetsClient({
  email: config.sheetEmail,
  privateKey: config.sheetPrivateKey,
  id: config.sheetId,
});
let flushing = false;
export async function flushSheets(force = false) {
  if (!config.sheetEnabled || flushing) return;
  flushing = true;
  const lease = randomUUID();
  try {
    const job = changeState((s) => {
      if (
        !s.pending.length ||
        (s.gsLease && s.gsLease.until > Date.now()) ||
        (!force && Date.now() - s.gsLastTry < 60000)
      )
        return null;
      s.gsLastTry = Date.now();
      s.gsLease = { token: lease, until: Date.now() + 120000 };
      return s.log.filter((c) => s.pending.includes(c.id)).slice(0, 20);
    });
    if (!job?.length) return;
    const saved = await client.upsert(job.map(sheetRow));
    changeState((s) => {
      if (s.gsLease?.token !== lease) return;
      s.pending = s.pending.filter((id) => {
        const current = s.log.find((c) => c.id === id),
          sent = job.find((c) => c.id === id);
        return (
          !saved.includes(id) ||
          JSON.stringify(current) !== JSON.stringify(sent)
        );
      });
      s.gsError = "";
    });
  } catch (e) {
    changeState((s) => {
      if (s.gsLease?.token === lease)
        s.gsError = e instanceof Error ? e.message : "ส่งข้อมูลไม่สำเร็จ";
    });
  } finally {
    changeState((s) => {
      if (s.gsLease?.token === lease) delete s.gsLease;
    });
    flushing = false;
  }
}
