# การตรวจสอบ Stroke Fast Track

ตรวจเมื่อ 11 พฤศจิกายน 2026 โดยใช้ข้อมูลสมมติและฐาน SQLite แยกไว้ในพื้นที่ทดสอบ ไม่แตะข้อมูล STEMI เดิมหรือฐาน HOSxP จริง

| รายการ | ผล |
|---|---|
| TypeScript strict (`npm run typecheck`) | ผ่าน |
| Unit / integration tests (`npm test`) | 29/29 ผ่าน |
| Next.js production build (`npm run build`) | ผ่าน |
| Edge browser tests บน production build | 5/5 ผ่าน |
| จอ 375, 768, 1024, 1440px และตัวอักษร 200% | ผ่าน ไม่ล้นทั้งหน้า |
| Dialog: Tab, Escape และคืน focus | ผ่าน |

## พฤติกรรมที่ตรวจ

- เป้าหมาย 8 ขั้นตอนตรงกับต้นฉบับ Stroke; แยกรหัส ICD Stroke ออกจากรหัสหัวใจ; ค้น ER ตามวันไทยรวมขอบเขตเที่ยงคืนและเลือก VN ย้อนหลัง
- HOSxP hydration ให้เฉพาะเวลา Door, Lab และ Refer; DTX/EKG ต้องกดเอง; manual override เก็บ HOSxP เป็นค่าอ้างอิงและคืนค่าเดิมได้
- NIHSS 15 ข้อ คะแนนสูงสุด 42, คะแนน 0 ที่ประเมินครบ, ช่องว่าง/UN ที่ยังรวมไม่ได้, ตรวจขอบเขตรายข้อ และการบันทึกคะแนนพร้อมตรวจการเพิ่มจากบันทึกก่อนตามเงื่อนไขต้นฉบับ
- GCS ตัวเลขและกรณี T/A/ประเมินไม่ครบ; บันทึก GCS และแสดงข้อความสำคัญตามเงื่อนไขต้นฉบับ; ตรวจขอบเขต NIHSS/DTX/BP และ BE-FAST
- ไม่รับเวลาอนาคตหรือก่อน Door-in; ไม่รับวันที่เลื่อนวันโดยอัตโนมัติ เช่น 30 กุมภาพันธ์; คำนวณเวลาประเทศไทยได้โดยไม่ขึ้นกับ timezone ของเครื่อง
- ผลหลัง Refer: CT, rtPA, การเว้น Needle เมื่อไม่ได้ยา, mRS/Barthel/IMC; คำนวณ Onset→Needle, Door ทั้งสองโรงพยาบาล→Needle และเดินทาง; ไม่รวม Onset ที่ไม่ทราบหรือเวลาเรียงผิดเป็นศูนย์
- เลือกผู้ป่วยจากข้อมูลเซิร์ฟเวอร์ ไม่เชื่อ snapshot ที่ส่งมาจาก client; ปิดเคสเก็บ assessment ที่ถูกต้อง; ลงผลหลังปิด; นำรายการที่เลือกผิดออกพร้อมยืนยันโดยไม่มี history/KPI/คิว Sheet
- SQLite transaction rollback; CSV ป้องกันสูตร และไฟล์ Word/Excel/PowerPoint เป็น Office packages จริง มีข้อมูลเฉพาะ Stroke
- Google Sheets ใช้ mock HTTP ตรวจ JWT signature, token refresh/cache, RAW literal/เลขศูนย์นำหน้า, สร้าง/ขยายแท็บ, schema และ case_id ซ้ำ, upsert แถวเดิม, retry queue, lease ข้าม worker และการแก้ข้อมูลระหว่างส่ง
- LINE ใช้ mock HTTP เท่านั้น ตรวจว่าต้องตั้งค่า, ส่งไป target ที่ตั้งไว้, ใช้สรุปฝั่งเซิร์ฟเวอร์และซ่อนชื่อ/HN, ไม่ส่งข้อความตอบกลับที่อาจมีรายละเอียดภายในมาเป็น error
- Browser workflow ประเมิน NIHSS ครบ 15 ข้อและ UN, GCS แบบใส่ท่อ, กด DTX และกรอกค่า, ปิดเคส, ลงผล CT/D/C/mRS/Barthel/IMC และดาวน์โหลดไฟล์
- ปฏิเสธ POST จาก Origin อื่นและ EKG message จากหน้าต่าง/เคสไม่ถูกต้อง ตรวจ bridge ใน iframe ของ Stroke แล้ว

แก้ accessible label ของช่องผลหลัง Refer หลังพบว่า browser test ระบุช่องไม่ได้ จากนั้นทดสอบ production build และ browser workflow ใหม่ผ่านครบ

## ขอบเขตที่ยังไม่ได้ตรวจจริง

ยังไม่ได้เชื่อม schema/charset/ข้อมูล HOSxP ของโรงพยาบาล, ใช้ Service Account private key จริง, ส่ง LINE จริง หรือเรียก AI server จริง จึงต้องตั้งค่าและตรวจการเชื่อมต่อเหล่านี้ในเครือข่ายของโรงพยาบาล แบบประเมินและเป้าหมายยึดจากไฟล์ต้นฉบับที่ได้รับ ไม่ได้ปรับเป็นแนวทางการรักษาฉบับใหม่

PDF ใช้หน้าพิมพ์ของเบราว์เซอร์ ไม่ใช่บริการแปลง PDF ฝั่งเซิร์ฟเวอร์ ไม่มีการ import ข้อมูล `state.json` ของ PHP อัตโนมัติ ไม่มี GitHub repository หรือ remote ที่สร้างให้ในงานนี้
