import { test } from "node:test";
import assert from "node:assert/strict";
import { blankCase } from "../src/lib/model";
import { pushLine, lineMessage } from "../src/lib/line";
test("LINE requires configuration and only sends the server-built summary to the configured target", async () => {
  const c = blankCase(Date.now());
  c.label = "private patient";
  c.hn = "000123";
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  delete process.env.LINE_TARGET_ID;
  await assert.rejects(pushLine(c), /ยังไม่ได้ตั้งค่า/);
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-only-token";
  process.env.LINE_TARGET_ID = "test-only-group";
  let called = false;
  await pushLine(c, (async (url, init) => {
    called = true;
    assert.equal(String(url), "https://api.line.me/v2/bot/message/push");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.to, "test-only-group");
    assert.equal(body.messages[0].text, lineMessage(c));
    assert(!body.messages[0].text.includes("private patient"));
    assert(!body.messages[0].text.includes("000123"));
    return Response.json({});
  }) as typeof fetch);
  assert(called);
  await assert.rejects(
    pushLine(c, (async () =>
      Response.json(
        { secret: "must not leak" },
        { status: 401 },
      )) as typeof fetch),
    (e) =>
      e instanceof Error &&
      /ส่ง LINE ไม่สำเร็จ/.test(e.message) &&
      !e.message.includes("secret"),
  );
});
