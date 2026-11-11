"use client";
import { BEFAST, NIH, nihTotal, gcsText, type Assessment } from "@/lib/stroke";
import { duration, minutes, type Case } from "@/lib/model";
type Props = {
  c: Case;
  busy: boolean;
  now: number;
  op: (cmd: Record<string, unknown>) => Promise<boolean>;
};
export default function StrokeAssessment({ c, busy, now, op }: Props) {
  const a = c.assessment,
    n = nihTotal(a.nihssItems),
    onset = c.onsetUnknown ? null : c.onset;
  const save = (field: keyof Assessment, value: unknown) =>
    op({ op: "assessment", id: c.id, value: { [field]: value } });
  const input = (
    field: "nihss" | "dtxv" | "sbp" | "dbp" | "age",
    label: string,
    max: number,
  ) => (
    <label className="field" key={field}>
      {label}
      <input
        aria-label={label}
        key={c.id + field + a[field]}
        type="number"
        min="0"
        max={max}
        step={field === "dtxv" ? "any" : "1"}
        defaultValue={a[field]}
        disabled={busy}
        onBlur={(e) => {
          if (e.target.value !== a[field]) void save(field, e.target.value);
        }}
      />
    </label>
  );
  return (
    <div className="stroke-assessment">
      {!c.patient && (
        <div className="form-grid">
          {input("age", "อายุ (ปี)", 130)}
          <label className="field">
            เพศ
            <select
              value={a.sex}
              disabled={busy}
              onChange={(e) => void save("sex", e.target.value)}
            >
              {["", "ชาย", "หญิง"].map((v) => (
                <option key={v} value={v}>
                  {v || "ยังไม่ระบุ"}
                </option>
              ))}
            </select>
          </label>
          <label className="field wide">
            อาการสำคัญ
            <textarea
              key={c.id + a.cc}
              defaultValue={a.cc}
              disabled={busy}
              maxLength={4000}
              onBlur={(e) => {
                if (e.target.value !== a.cc) void save("cc", e.target.value);
              }}
            />
          </label>
        </div>
      )}
      <div className="assessment-heading">
        <h3>ประเมินระบบประสาท</h3>
        <span className="tag">กรอกโดยบุคลากร</span>
      </div>
      {input("nihss", "NIHSS (0–42)", 42)}
      <details className="nihss-panel">
        <summary>
          ประเมิน NIHSS ทีละข้อ <span className="tag">{n.answered}/15 ข้อ</span>
        </summary>
        <p className="field-hint">
          เลือกตามผลตรวจ · UN คือประเมินไม่ได้ คะแนนบางส่วนจะแยกจากคะแนนรวม
        </p>
        <div className="nihss-total" aria-live="polite">
          {n.complete
            ? `คะแนนรวม ${n.subtotal}`
            : `ยังไม่ครบ · คะแนนบางส่วน ${n.subtotal} · UN ${n.un} ข้อ`}
        </div>
        {NIH.map(([id, label, choices, allowUn]) => (
          <label className="field" key={id}>
            {label}
            <select
              aria-label={label}
              disabled={busy}
              value={a.nihssItems[id] ?? ""}
              onChange={(e) =>
                void op({
                  op: "nihss",
                  id: c.id,
                  item: id,
                  value:
                    e.target.value === ""
                      ? null
                      : e.target.value === "UN"
                        ? "UN"
                        : Number(e.target.value),
                })
              }
            >
              <option value="">ยังไม่ประเมิน</option>
              {choices.map((name, score) => (
                <option key={score} value={score}>
                  {score} · {name}
                </option>
              ))}
              {allowUn && <option value="UN">UN · ประเมินไม่ได้</option>}
            </select>
          </label>
        ))}
        <button
          disabled={busy}
          onClick={() => {
            if (confirm("ล้างคะแนน NIHSS ที่ประเมินไว้?"))
              void op({ op: "nihss_reset", id: c.id });
          }}
        >
          ล้างแบบประเมิน NIHSS
        </button>
      </details>
      <button
        className="full"
        disabled={busy}
        onClick={() =>
          void op({ op: "assessment_log", id: c.id, kind: "nihss" })
        }
      >
        บันทึก NIHSS ลงบันทึกอาการ
      </button>
      <fieldset disabled={busy} className="gcs-fields">
        <legend>GCS · {gcsText(a)}</legend>
        {(
          [
            [
              "gcsE",
              "Eye",
              ["4 ลืมตาเอง", "3 เมื่อเรียก", "2 เมื่อเจ็บ", "1 ไม่ลืมตา"],
            ],
            [
              "gcsV",
              "Verbal",
              [
                "5 พูดรู้เรื่อง",
                "4 สับสน",
                "3 พูดเป็นคำ",
                "2 ส่งเสียง",
                "1 ไม่มีเสียง",
                "T ใส่ท่อช่วยหายใจ",
                "A Aphasia",
              ],
            ],
            [
              "gcsM",
              "Motor",
              [
                "6 ทำตามสั่ง",
                "5 ปัดตำแหน่งเจ็บ",
                "4 ชักแขนหนี",
                "3 Decorticate",
                "2 Decerebrate",
                "1 ไม่ขยับ",
              ],
            ],
          ] as const
        ).map(([field, label, choices]) => (
          <label className="field" key={field}>
            {label}
            <select
              aria-label={`GCS ${label}`}
              value={a[field]}
              onChange={(e) => void save(field, e.target.value)}
            >
              <option value="">ยังไม่ประเมิน</option>
              {choices.map((v) => (
                <option key={v} value={v[0]}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button
          onClick={() =>
            void op({ op: "assessment_log", id: c.id, kind: "gcs" })
          }
        >
          บันทึก GCS ลงบันทึกอาการ
        </button>
      </fieldset>
      <div className="form-grid">
        {input("dtxv", "DTX (mg/dL)", 2000)}
        {input("sbp", "BP · SBP (mmHg)", 400)}
        {input("dbp", "BP · DBP (mmHg)", 300)}
      </div>
      <fieldset disabled={busy} className="befast-fields">
        <legend>BE-FAST · อาการที่ตรวจพบ</legend>
        {BEFAST.map(([key, en, th]) => (
          <label className="checkbox" key={key}>
            <input
              type="checkbox"
              checked={a.befast.includes(key)}
              onChange={(e) =>
                void save(
                  "befast",
                  e.target.checked
                    ? [...a.befast, key]
                    : a.befast.filter((v) => v !== key),
                )
              }
            />
            <span>
              <b>
                {key} · {en}
              </b>
              <small>{th}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="stroke-window">
        <h3>ข้อมูลก่อนส่งต่อ</h3>
        <p>
          Onset / LKW → ขณะนี้{" "}
          <b>{onset === null ? "ยังไม่ทราบ" : duration(now - onset)}</b>
        </p>
        <p>
          Onset → Door{" "}
          <b>
            {onset === null
              ? "—"
              : `${minutes(onset, c.times.door_in.t)?.toFixed(0) ?? "—"} นาที`}
          </b>
        </p>
        {onset !== null && (
          <>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="เวลาตั้งแต่ Onset เทียบกับ 4 ชั่วโมง 30 นาที"
              aria-valuemin={0}
              aria-valuemax={270}
              aria-valuenow={Math.min(
                270,
                Math.max(0, Math.floor((now - onset) / 60000)),
              )}
            >
              <div
                style={{
                  width:
                    Math.min(
                      100,
                      Math.max(0, ((now - onset) / (270 * 60000)) * 100),
                    ) + "%",
                }}
              />
            </div>
            <p>
              {now - onset < 270 * 60000
                ? `เหลือ ${duration(270 * 60000 - (now - onset))} ก่อนครบ 4 ชม. 30 นาที`
                : "ผ่าน 4 ชม. 30 นาทีแล้ว"}
            </p>
          </>
        )}
        <p className="field-hint">
          แสดงกรอบเวลา 4.5 ชั่วโมงตามต้นฉบับเพื่อใช้ประสานส่งต่อ การพิจารณา rtPA
          ทำโดยแพทย์ที่ปลายทางหลัง CT ตามแนวทางของโรงพยาบาล
        </p>
      </div>
    </div>
  );
}
