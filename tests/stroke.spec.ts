import { test, expect } from "@playwright/test";
import path from "node:path";
test("Stroke workflow saves assessment, manual times, follow-up, exports and responsive preview", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  if (process.env.TEST_ACCESS_TOKEN) {
    await page
      .getByLabel("รหัสเข้าใช้งาน", { exact: true })
      .fill(process.env.TEST_ACCESS_TOKEN);
    await page
      .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
      .click();
  }
  await expect(page.locator(".patient-strip")).toBeVisible();
  expect(await page.locator(".timeline-row").count()).toBe(8);
  await page.screenshot({
    path: path.resolve("../Stroke-preview-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.resolve("../Stroke-preview-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "มาถึงก่อนลงทะเบียน", exact: true })
    .click();
  const label = "ทดสอบ Stroke " + Date.now();
  const name = page.getByLabel("ชื่อ / ป้ายกำกับ", { exact: true });
  await name.fill(label);
  await name.blur();
  await expect(
    page.getByRole("heading", { name: label, exact: true }),
  ).toBeVisible();
  const dtx = page
    .locator(".timeline-row")
    .filter({ has: page.getByText("เจาะ DTX", { exact: true }) });
  await dtx.getByRole("button", { name: "บันทึกตอนนี้", exact: true }).click();
  await expect(dtx.getByText("กดเอง", { exact: true })).toBeVisible();
  const dtxValue = page.getByLabel("DTX (mg/dL)", { exact: true });
  await dtxValue.fill("146");
  await dtxValue.blur();
  await expect(dtxValue).toBeEnabled();
  await page.locator(".nihss-panel summary").click();
  const selects = page.locator(".nihss-panel select");
  for (let i = 0; i < 15; i++) {
    await selects.nth(i).selectOption("0");
    await expect(selects.nth(i)).toHaveValue("0");
  }
  await expect(page.getByLabel("NIHSS (0–42)", { exact: true })).toHaveValue(
    "0",
  );
  await expect(page.locator(".nihss-total")).toHaveText("คะแนนรวม 0");
  await page
    .getByRole("button", { name: "บันทึก NIHSS ลงบันทึกอาการ", exact: true })
    .click();
  await expect(page.getByText("NIHSS 0", { exact: true })).toBeVisible();
  await selects.nth(6).selectOption("UN");
  await expect(page.locator(".nihss-total")).toContainText("ยังไม่ครบ");
  await expect(page.getByLabel("NIHSS (0–42)", { exact: true })).toHaveValue(
    "",
  );
  await page.locator(".nihss-panel summary").click();
  await page.getByLabel("GCS Eye", { exact: true }).selectOption("4");
  await expect(page.getByLabel("GCS Eye", { exact: true })).toHaveValue("4");
  await page.getByLabel("GCS Verbal", { exact: true }).selectOption("T");
  await expect(page.getByLabel("GCS Verbal", { exact: true })).toHaveValue("T");
  await page.getByLabel("GCS Motor", { exact: true }).selectOption("6");
  await expect(page.getByLabel("GCS Motor", { exact: true })).toHaveValue("6");
  await expect(page.locator(".gcs-fields legend")).toContainText(
    "รวมคะแนนไม่ได้",
  );
  await page
    .getByRole("button", { name: "บันทึก GCS ลงบันทึกอาการ", exact: true })
    .click();
  await page.getByRole("button", { name: "ปิดเคส", exact: true }).click();
  await page.getByRole("button", { name: "ยืนยันปิดเคส", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "ปิดหน้าต่าง", exact: true }).click();
  await page
    .getByRole("button", { name: "เคสที่ปิดแล้ว", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: label });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "ผลหลังส่งต่อ", exact: true }).click();
  await page
    .getByLabel("ผล CT", { exact: true })
    .selectOption("Ischemic stroke");
  await page
    .getByLabel("ได้ rtPA", { exact: true })
    .selectOption("ไม่ได้ rtPA");
  await expect(
    page.getByLabel("เวลาให้ rtPA (Needle)", { exact: true }),
  ).toBeDisabled();
  await page.getByLabel("สถานะ D/C", { exact: true }).selectOption("Improved");
  await page.getByLabel("mRS ตอน D/C (0–6)", { exact: true }).selectOption("2");
  await page.getByLabel("Barthel Index (0–100)", { exact: true }).fill("80");
  await page
    .getByLabel("เข้าโปรแกรม IMC", { exact: true })
    .selectOption("เข้า IMC");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const state = await (await page.request.get("/api/stroke")).json(),
    c = state.log.find((c: { label: string }) => c.label === label);
  expect(c.assessment.dtxv).toBe("146");
  expect(c.assessment.gcsV).toBe("T");
  expect(c.outcome.mrs).toBe("2");
  for (const action of ["docx", "xlsx", "csv", "pptx"]) {
    const r = await page.request.get(
      `/api/stroke?action=${action}&id=${c.id}&from=&to=`,
    );
    expect(r.ok()).toBe(true);
    expect((await r.body()).length).toBeGreaterThan(50);
  }
  const denied = await page.request.post("/api/stroke", {
    data: { op: "new" },
    headers: { Origin: "https://invalid.example" },
  });
  expect(denied.status()).toBe(403);
  expect(errors).toEqual([]);
});
test("EKG iframe messages require the correct origin, source and case ID", async ({
  page,
}) => {
  await page.goto("/");
  if (process.env.TEST_ACCESS_TOKEN) {
    await page
      .getByLabel("รหัสเข้าใช้งาน", { exact: true })
      .fill(process.env.TEST_ACCESS_TOKEN);
    await page
      .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
      .click();
  }
  await expect(page.locator(".patient-strip")).toBeVisible();
  await page
    .getByRole("button", { name: "อ่าน EKG ด้วย AI", exact: true })
    .click();
  const iframe = page.locator('iframe[title="เครื่องมืออ่าน EKG"]');
  await expect(iframe).toBeVisible();
  const src = await iframe.getAttribute("src");
  expect(src).toContain("/tools/ekg.html?");
  await expect(
    page
      .frameLocator('iframe[title="เครื่องมืออ่าน EKG"]')
      .getByText("เคส Stroke Fast Track", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.postMessage(
      {
        type: "stroke-ekg-result",
        caseId: "fake",
        result: {
          report: "forged",
          impression: ["forged"],
          urgency: "critical",
          model: "fake",
        },
      },
      location.origin,
    ),
  );
  const state = await (await page.request.get("/api/stroke")).json();
  expect(
    state.cases.every((c: { ekgs: unknown[] }) => c.ekgs.length === 0),
  ).toBe(true);
  await page.getByRole("button", { name: "ปิดหน้าต่าง", exact: true }).click();
});
