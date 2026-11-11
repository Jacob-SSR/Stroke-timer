"use client";
import {
  outcomeFields,
  outcomeChoices,
  outcomeTimes,
  referralMetrics,
} from "@/lib/stroke";
import type { Case } from "@/lib/model";
export default function StrokeOutcome({
  c,
  value,
  setValue,
}: {
  c: Case;
  value: Record<string, string>;
  setValue: (v: Record<string, string>) => void;
}) {
  const m = referralMetrics({ ...c, outcome: value });
  const update = (key: string, v: string) =>
    setValue({
      ...value,
      [key]: v,
      ...(key === "rtpa" && v !== "ได้ rtPA" ? { needle: "" } : {}),
    });
  return (
    <div className="stroke-outcome wide">
      <div className="notice">
        บันทึกผลที่ได้รับจากโรงพยาบาลปลายทาง · ช่องที่ยังไม่ทราบเว้นว่างได้
      </div>
      <div className="form-grid">
        {Object.entries(outcomeFields).map(([key, label]) => {
          const choices = outcomeChoices[key as keyof typeof outcomeChoices];
          return (
            <label
              className={"field " + (key === "note" ? "wide" : "")}
              key={key}
            >
              {label}
              {choices ? (
                <select
                  aria-label={label}
                  value={value[key] || ""}
                  onChange={(e) => update(key, e.target.value)}
                >
                  <option value="">ยังไม่ทราบ</option>
                  {choices.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              ) : key === "note" ? (
                <textarea
                  aria-label={label}
                  rows={3}
                  value={value[key] || ""}
                  maxLength={4000}
                  onChange={(e) => update(key, e.target.value)}
                />
              ) : (
                <input
                  aria-label={label}
                  type={
                    outcomeTimes.includes(key)
                      ? "datetime-local"
                      : ["dc_date", "imc_date"].includes(key)
                        ? "date"
                        : key === "barthel"
                          ? "number"
                          : "text"
                  }
                  min={key === "barthel" ? 0 : undefined}
                  max={key === "barthel" ? 100 : undefined}
                  step={outcomeTimes.includes(key) ? 1 : undefined}
                  disabled={key === "needle" && value.rtpa !== "ได้ rtPA"}
                  value={value[key] || ""}
                  maxLength={4000}
                  onChange={(e) => update(key, e.target.value)}
                />
              )}
            </label>
          );
        })}
      </div>
      <div className="outcome-metrics" aria-live="polite">
        {(
          [
            ["onsetNeedle", "Onset → Needle"],
            ["doorNeedle", "Door ต้นทาง → Needle"],
            ["receivingDoorNeedle", "Door ปลายทาง → Needle"],
            ["travel", "เวลาเดินทาง"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <b>{m[key] === null ? "—" : `${m[key]!.toFixed(1)} นาที`}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
