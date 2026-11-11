import type { Case } from "@/lib/model";
import { referralMetrics } from "@/lib/stroke";
export default function OutcomeDashboard({ records }: { records: Case[] }) {
  const counts = (key: string) =>
    Object.entries(
      records.reduce<Record<string, number>>((acc, c) => {
        const v = c.outcome[key] || "ยังไม่ทราบ";
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      }, {}),
    );
  const needles = records
      .map((c) => referralMetrics(c).doorNeedle)
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b),
    n = needles.length;
  const median = n
    ? (needles[Math.floor((n - 1) / 2)] + needles[Math.ceil((n - 1) / 2)]) / 2
    : null;
  return (
    <section className="panel monthly-panel">
      <div className="panel-heading">
        <h2>ผลการรักษาหลัง Refer / D/C</h2>
        <span className="tag">{records.length} เคส</span>
      </div>
      <div className="panel-body outcome-grid">
        {(
          [
            ["ct", "ผล CT"],
            ["rtpa", "การได้รับ rtPA"],
            ["thrombectomy", "Thrombectomy"],
            ["result", "สถานะจำหน่าย"],
            ["imc", "IMC"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <h3>{label}</h3>
            {records.length ? (
              counts(key).map(([name, count]) => (
                <div className="outcome-count" key={name}>
                  <span>{name}</span>
                  <b>{count}</b>
                </div>
              ))
            ) : (
              <p className="muted">ยังไม่มีข้อมูล</p>
            )}
          </div>
        ))}
        <div>
          <h3>Door ต้นทาง → Needle</h3>
          <b>{median === null ? "—" : `${median.toFixed(1)} นาที`}</b>
          <p className="muted">
            ค่ามัธยฐาน · มีเวลาครบ {n} เคส · รวมเฉพาะเคสที่ระบุว่าได้ rtPA
          </p>
        </div>
      </div>
    </section>
  );
}
