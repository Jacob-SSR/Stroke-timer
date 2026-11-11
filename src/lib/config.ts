export const config = {
  demo: process.env.STROKE_DEMO !== "false",
  hospital: process.env.HOSPITAL_NAME || "โรงพยาบาลพลับพลาชัย จังหวัดบุรีรัมย์",
  hospitals: (process.env.REFER_HOSPITALS || "โรงพยาบาลบุรีรัมย์").split("|"),
  accessToken: process.env.STROKE_ACCESS_TOKEN || "",
  autoIcd: (process.env.STROKE_AUTO_ICD || "I60,I61,I62,I63,I64,G45,G46")
    .split(",")
    .filter(Boolean),
  ccKeywords: (
    process.env.STROKE_CC_KEYWORDS ||
    "อ่อนแรง,ปากเบี้ยว,พูดไม่ชัด,พูดไม่ได้,หน้าเบี้ยว,เดินเซ,ตามัว"
  )
    .split(",")
    .filter(Boolean),
  labItems: JSON.parse(
    process.env.HOSXP_LAB_ITEMS ||
      '{"CBC":[],"PT/INR":[],"BUN":[],"Cr":[],"Glucose":[]}',
  ) as Record<string, string[]>,
  sheetEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
  sheetPrivateKey: process.env.GOOGLE_PRIVATE_KEY || "",
  sheetId: process.env.GOOGLE_SHEET_ID || "",
  get sheetEnabled() {
    return !!(this.sheetEmail && this.sheetPrivateKey && this.sheetId);
  },
  sendPii: process.env.GSHEET_SEND_PII === "true",
};
