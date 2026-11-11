import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  NIH,
  blankAssessment,
  nihTotal,
  gcsNumber,
  gcsText,
  referralMetrics,
  parseThaiDateTime,
} from "../src/lib/stroke";
import {
  blankCase,
  defaults,
  metrics,
  summary,
  thaiDate,
} from "../src/lib/model";
import {
  assessmentPatch,
  validateNihItem,
  validateOutcome,
} from "../src/lib/stroke-validation";
process.env.STROKE_DEMO = "true";
process.env.STROKE_DATA_DIR = mkdtempSync(
  path.join(os.tmpdir(), "stroke-core-"),
);
const { operate, snapshot } = await import("../src/lib/service");
const { readState, changeState } = await import("../src/lib/store");
const { hydrate, erList, isStroke } = await import("../src/lib/hosxp");
const { word, powerpoint, xlsx, csv } = await import("../src/lib/export");
test("stroke ICD prefixes include original I60–I64, G45 and G46; no cardiac ICD auto-selection", () => {
  for (const code of [
    "I60.0",
    "I61",
    "I62",
    "I63.9",
    "I64",
    "G45.9",
    "G46.0",
    "J06.9, i63.9",
  ])
    assert(isStroke(code));
  for (const code of ["I21.0", "I22", "J06.9", "R07.4", "XI63"])
    assert(!isStroke(code));
});
test("workflow and targets match the 8 original Stroke steps", () => {
  assert.deepEqual(defaults, {
    md: 10,
    dtx: 10,
    ekg: 20,
    lab_sent: 20,
    consult: 15,
    accept: 20,
    ambu: 25,
    dido: 30,
  });
});
test("NIHSS absent and UN answers cannot masquerade as a complete zero", () => {
  assert.deepEqual(nihTotal({}), {
    subtotal: 0,
    answered: 0,
    un: 0,
    complete: false,
  });
  const items = Object.fromEntries(NIH.map(([id]) => [id, 0]));
  assert.deepEqual(nihTotal(items), {
    subtotal: 0,
    answered: 15,
    un: 0,
    complete: true,
  });
  assert.equal(nihTotal({ ...items, "5a": "UN" }).complete, false);
  assert.equal(
    nihTotal(
      Object.fromEntries(
        NIH.map(([id, , choices]) => [id, choices.length - 1]),
      ),
    ).subtotal,
    42,
  );
  assert.throws(() => validateNihItem("1b", 3));
  assert.throws(() => validateNihItem("1a", "UN"));
  assert.throws(() => validateNihItem("evil", 0));
});
test("GCS T/A and incomplete fields have no numeric total", () => {
  const a = { ...blankAssessment(), gcsE: "4", gcsV: "5", gcsM: "6" };
  assert.equal(gcsNumber(a), 15);
  assert.equal(gcsNumber({ ...a, gcsV: "T" }), null);
  assert.match(gcsText({ ...a, gcsV: "T" }), /รวมคะแนนไม่ได้/);
  assert.equal(gcsNumber({ ...a, gcsE: "" }), null);
  assert(!assessmentPatch.safeParse({ gcsE: "5" }).success);
  assert(!assessmentPatch.safeParse({ nihss: "43" }).success);
  assert(!assessmentPatch.safeParse({ dtxv: "-1" }).success);
  assert(!assessmentPatch.safeParse({ befast: ["X"] }).success);
});
test("Thai timestamps reject calendar rollover and do not depend on host timezone", () => {
  assert.equal(parseThaiDateTime("2026-02-30T10:00"), null);
  assert.equal(parseThaiDateTime("2026-11-09T24:00"), null);
  assert.equal(
    parseThaiDateTime("2026-11-09T10:00"),
    Date.parse("2026-11-09T03:00Z"),
  );
  assert.equal(thaiDate(Date.parse("2026-11-08T18:00Z")), "2026-11-09");
});
test("referral metrics exclude unknown onset, negative travel and no-rtPA cases", () => {
  const c = blankCase(Date.now());
  c.onset = Date.parse("2026-11-09T01:00Z");
  c.times.door_in.t = Date.parse("2026-11-09T02:00Z");
  c.times.door_out.t = Date.parse("2026-11-09T02:30Z");
  c.outcome = {
    rtpa: "ได้ rtPA",
    arrival: "2026-11-09T10:00",
    needle: "2026-11-09T10:20",
  };
  assert.deepEqual(referralMetrics(c), {
    onsetNeedle: 140,
    doorNeedle: 80,
    receivingDoorNeedle: 20,
    travel: 30,
  });
  c.onsetUnknown = true;
  assert.equal(referralMetrics(c).onsetNeedle, null);
  c.outcome.rtpa = "ไม่ได้ rtPA";
  assert.equal(referralMetrics(c).doorNeedle, null);
  c.outcome.arrival = "2026-11-09T09:00";
  assert.equal(referralMetrics(c).travel, null);
});
test("HOSxP hydration never supplies EKG or DTX, manual times override and revert Lab/Refer", async () => {
  const base = Date.now() - 50 * 60000,
    c = blankCase(Date.now());
  c.vn = "DEMO001";
  c.manual = {};
  let [h] = await hydrate([c], await erList(base), base);
  assert.equal(h.times.ekg.t, null);
  assert.equal(h.times.dtx.t, null);
  assert(h.times.lab_sent.t);
  assert(h.times.door_out.hosxp);
  c.manual = {
    dtx: base + 5 * 60000,
    ekg: base + 12 * 60000,
    door_out: base + 45 * 60000,
  };
  [h] = await hydrate([c], await erList(base), base);
  assert.equal(metrics(h).dtx, 5);
  assert.equal(h.times.door_out.src, "manual");
  delete c.manual.door_out;
  [h] = await hydrate([c], await erList(base), base);
  assert.equal(h.times.door_out.src, "hosxp");
});
test("assessment saves and score logs use server data, flag original NIHSS/GCS deterioration", async () => {
  await operate({ op: "new" });
  const id = readState().cases[0].id;
  await operate({
    op: "assessment",
    id,
    value: {
      nihss: "5",
      dtxv: "146",
      gcsE: "4",
      gcsV: "5",
      gcsM: "6",
      befast: ["F", "A", "S"],
    },
  });
  await operate({ op: "assessment_log", id, kind: "nihss" });
  await operate({ op: "assessment_log", id, kind: "gcs" });
  await operate({ op: "assessment", id, value: { nihss: "9", gcsV: "3" } });
  await operate({ op: "assessment_log", id, kind: "nihss" });
  await operate({ op: "assessment_log", id, kind: "gcs" });
  const c = readState().cases.find((c) => c.id === id)!;
  assert(c.notes.slice(-2).every((n) => n.important));
  await assert.rejects(
    operate({ op: "assessment", id, value: { gcsM: "10" } }),
  );
  await operate({ op: "nihss", id, item: "5a", value: "UN" });
  assert.equal(
    readState().cases.find((c) => c.id === id)!.assessment.nihss,
    "",
  );
  await assert.rejects(operate({ op: "nihss", id, item: "1a", value: "UN" }));
});
test("pinning uses authoritative visits, discard leaves no history and suppresses automatic re-add", async () => {
  const s = await snapshot(),
    c = s.cases.find((c) => c.vn === "DEMO001")!;
  assert(c);
  await operate({ op: "discard", id: c.id });
  assert(!(await snapshot()).cases.some((x) => x.vn === c.vn));
  assert(!readState().log.some((x) => x.id === c.id));
  await operate({ op: "pin", vn: "DEMO001", label: "forged" });
  const chosen = (await snapshot()).cases.find((c) => c.vn === "DEMO001")!;
  assert.notEqual(chosen.label, "forged");
  await assert.rejects(operate({ op: "pin", vn: "DEMO001" }), /มีเคส/);
});
test("close retains authoritative assessment and supports stroke follow-up after closing", async () => {
  const c = (await snapshot()).cases.find((c) => c.vn === "DEMO001")!;
  await operate({
    op: "assessment",
    id: c.id,
    value: { nihss: "9", dtxv: "146" },
  });
  await operate({
    op: "close",
    id: c.id,
    snapshot: { assessment: { nihss: "forged" } },
  });
  assert.equal(
    readState().log.find((x) => x.id === c.id)!.assessment.nihss,
    "9",
  );
  await assert.rejects(operate({ op: "discard", id: c.id }), /ปิดแล้ว/);
  await operate({
    op: "outcome",
    id: c.id,
    value: {
      ct: "Ischemic stroke",
      rtpa: "ไม่ได้ rtPA",
      result: "Improved",
      mrs: "2",
      barthel: "80",
      imc: "เข้า IMC",
    },
  });
  assert.equal(readState().log.find((x) => x.id === c.id)!.outcome.mrs, "2");
  await assert.rejects(
    operate({ op: "outcome", id: c.id, value: { barthel: "101" } }),
    /Barthel/,
  );
});
test("outcome rejects impossible intervals and hidden stale Needle values", () => {
  const door = Date.parse("2026-11-09T01:00Z"),
    now = Date.parse("2026-11-09T12:00Z");
  assert.throws(
    () =>
      validateOutcome(
        { rtpa: "ไม่ได้ rtPA", needle: "2026-11-09T12:00" },
        door,
        now,
      ),
    /rtPA/,
  );
  assert.throws(
    () =>
      validateOutcome(
        {
          rtpa: "ได้ rtPA",
          arrival: "2026-11-09T12:30",
          needle: "2026-11-09T12:00",
        },
        door,
        now,
      ),
    /Needle/,
  );
  assert.throws(() =>
    validateOutcome({ arrival: "2026-11-09T07:00" }, door, now),
  );
  assert.throws(() => validateOutcome({ mrs: "7" }, door, now));
  assert.throws(() => validateOutcome({ dc_date: "2026-02-30" }, door, now));
});
test("transaction rollback and timestamp ordering protect shared case data", async () => {
  const revision = readState().revision;
  assert.throws(() =>
    changeState((s) => {
      s.log = [];
      throw Error("rollback");
    }),
  );
  assert.equal(readState().revision, revision);
  await operate({ op: "new" });
  const c = readState().cases[0];
  await assert.rejects(
    operate({ op: "stamp", id: c.id, key: "dtx", t: c.created - 60000 }),
    /Door-in/,
  );
  await assert.rejects(
    operate({ op: "stamp", id: c.id, key: "md", t: Date.now() + 120000 }),
    /อนาคต/,
  );
});
test("Office exports contain Stroke records and no cardiac-only treatment fields", async () => {
  const c = readState().log[0],
    text = summary(c, false),
    data = csv([c]);
  assert.match(text, /NIHSS: 9/);
  assert.match(text, /mRS ตอน D\/C/);
  assert.match(data, /Ischemic stroke/);
  assert(!/Clopidogrel|Killip|Primary PCI|Troponin/.test(data));
  for (const b of [
    await word(c, "refer"),
    await word(c, "rca"),
    await powerpoint(c),
    await xlsx([c], defaults),
  ])
    assert.equal(b.subarray(0, 2).toString(), "PK");
});
