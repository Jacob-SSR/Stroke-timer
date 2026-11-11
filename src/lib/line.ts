import { summary, type Case } from "./model";
export function lineMessage(c: Case) {
  return summary(c, true).slice(0, 4500);
}
export async function pushLine(c: Case, request: typeof fetch = fetch) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN,
    to = process.env.LINE_TARGET_ID;
  if (!token || !to) throw Error("ยังไม่ได้ตั้งค่ากลุ่ม LINE");
  const response = await request("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text: lineMessage(c) }],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Error(
      "ส่ง LINE ไม่สำเร็จ กรุณาตรวจ token และกลุ่มปลายทางก่อนลองอีกครั้ง",
    );
}
