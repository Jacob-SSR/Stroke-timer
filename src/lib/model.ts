import {
  blankAssessment,
  gcsText,
  outcomeLines,
  type Assessment,
} from "./stroke";
export const steps = [
  ["md", "แพทย์ตรวจผู้ป่วย", 10],
  ["dtx", "เจาะ DTX", 10],
  ["ekg", "EKG 12 lead", 20],
  ["lab_sent", "ส่ง Lab", 20],
  ["consult", "โทรประสาน รพ.ปลายทาง", 15],
  ["accept", "รพ.ปลายทางรับ Refer", 20],
  ["ambu", "รถ Refer พร้อม", 25],
  ["door_out", "รถออกจาก รพ. (Door-out)", 30],
] as const;
export type TimeKey = "door_in" | (typeof steps)[number][0];
export type TargetKey = Exclude<TimeKey, "door_in" | "door_out"> | "dido";
export const defaults: Record<TargetKey, number> = {
  md: 10,
  dtx: 10,
  ekg: 20,
  lab_sent: 20,
  consult: 15,
  accept: 20,
  ambu: 25,
  dido: 30,
};
export interface Lab {
  name: string;
  ordered: number | null;
  reported: number | null;
  result: string | null;
}
export interface Patient {
  vn: string;
  hn: string;
  name: string;
  age: number | null;
  sex: string;
  door_in: number;
  cc: string;
  dx: string;
  stroke: boolean;
  suspect: boolean;
  hpi: string;
  pmh: string;
  address: string;
  pttype: string;
}
export interface TimeValue {
  t: number | null;
  hosxp: number | null;
  src: "manual" | "hosxp" | null;
}
export interface RcaAction {
  text: string;
  strength: string;
  owner: string;
  due: string;
  status: string;
}
export interface Rca {
  status: "draft" | "done";
  severity: string;
  date: string;
  summary: string;
  root: string;
  team: string;
  cdp: string;
  voices: string;
  factors: Record<string, string>;
  whys: string[];
  actions: RcaAction[];
}
export interface Ekg {
  t: number;
  report: string;
  impression: string[];
  urgency: string;
  model: string;
  confirmed: number | null;
}
export interface Case {
  id: string;
  vn: string | null;
  hn: string;
  label: string;
  created: number;
  closed?: number;
  manual: Partial<Record<TimeKey, number>>;
  times: Record<TimeKey, TimeValue>;
  labs: Lab[];
  patient?: Patient;
  onset: number | null;
  onsetUnknown: boolean;
  arrive: string;
  path: string;
  dest: string;
  assessment: Assessment;
  notes: { id: string; t: number; text: string; important: boolean }[];
  refer: Record<string, string>;
  outcome: Record<string, string>;
  rca?: Rca;
  ekgs: Ekg[];
}
export interface State {
  cases: Case[];
  log: Case[];
  dismissed: string[];
  targets: Record<TargetKey, number>;
  demoBase: number;
  pending: string[];
  gsError: string;
  gsLastTry: number;
  gsLease?: { token: string; until: number };
  revision: number;
}
export interface Snapshot extends State {
  labNames: string[];
  demo: boolean;
  serverNow: number;
  hospital: string;
  hospitals: string[];
  sheetEnabled: boolean;
  lineEnabled: boolean;
}
export function blankCase(now: number): Case {
  return {
    id: crypto.randomUUID(),
    vn: null,
    hn: "",
    label: "ผู้ป่วยยังไม่ลงทะเบียน",
    created: now,
    manual: { door_in: now },
    times: Object.fromEntries(
      ["door_in", ...steps.map((s) => s[0])].map((k) => [
        k,
        { t: null, hosxp: null, src: null },
      ]),
    ) as Case["times"],
    labs: [],
    onset: null,
    onsetUnknown: false,
    arrive: "มาเอง",
    path: "refer",
    dest: "",
    assessment: blankAssessment(),
    notes: [],
    refer: {},
    outcome: {},
    ekgs: [],
  };
}
export function minutes(
  start: number | null | undefined,
  end: number | null | undefined,
) {
  return start != null && end != null && end >= start
    ? (end - start) / 60000
    : null;
}
export function metrics(c: Case) {
  const d = c.times.door_in.t;
  return {
    md: minutes(d, c.times.md.t),
    dtx: minutes(d, c.times.dtx.t),
    consult: minutes(d, c.times.consult.t),
    dido: minutes(d, c.times.door_out.t),
  };
}
export function duration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
}
export function thaiTime(t: number | null | undefined, date = false) {
  return t == null
    ? "—"
    : new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        ...(date ? { day: "2-digit", month: "short", year: "numeric" } : {}),
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(t);
}
export function thaiDate(t: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(t);
}
export function inRange(c: Case, from: string, to: string) {
  const d = thaiDate(c.times.door_in.t ?? c.created);
  return (!from || d >= from) && (!to || d <= to);
}
export function summary(c: Case, hide = true) {
  return [
    `STROKE Fast Track`,
    hide ? "ผู้ป่วย (ปกปิดชื่อ / HN)" : `${c.label} · HN ${c.hn}`,
    `อายุ ${c.patient?.age ?? (c.assessment.age || "—")} ปี · ${c.patient?.sex || c.assessment.sex}`,
    `อาการ: ${c.patient?.cc || c.assessment.cc || "—"}`,
    `Onset / LKW: ${c.onsetUnknown ? "ไม่ทราบ" : thaiTime(c.onset, true)}`,
    `Door-in: ${thaiTime(c.times.door_in.t, true)}`,
    ...steps.map(([k, n]) => `${n}: ${thaiTime(c.times[k].t)}`),
    `NIHSS: ${c.assessment.nihss || "ยังไม่ประเมิน"} · GCS: ${gcsText(c.assessment)}`,
    `DTX: ${c.assessment.dtxv || "—"} mg/dL · BP: ${c.assessment.sbp || "—"}/${c.assessment.dbp || "—"} mmHg`,
    `BE-FAST: ${c.assessment.befast.join(", ") || "ยังไม่ระบุ"}`,
    `ปลายทาง: ${c.dest || "—"}`,
    ...c.labs.map((l) => `${l.name}: ${l.result || "รอผล"}`),
    ...outcomeLines(c.outcome),
    ...c.ekgs.map(
      (e) =>
        `EKG ${e.confirmed ? "แพทย์ยืนยัน" : "AI รอยืนยัน"}: ${e.impression.join("; ")}`,
    ),
    ...c.notes.map(
      (n) => `${thaiTime(n.t)} ${n.important ? "[สำคัญ] " : ""}${n.text}`,
    ),
  ].join("\n");
}
