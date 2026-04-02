# Asel Travel Office UI (Demo)

واجهة ويب حديثة لإدارة مكتب السياحة والسفر (نسخة تجريبية) — مرتبطة مع API الموجود داخل مشروع `travel-office-demo`.

## التشغيل

### 1) شغّل الـ API (Backend)
داخل مجلد `travel-office-demo`:

```bash
npm i
npm run dev
# API: http://localhost:3000
```

### 2) شغّل الواجهة (Frontend)
داخل هذا المجلد:

```bash
npm i
npm run dev
# UI: http://localhost:5173
```

> ملاحظة مهمة: نفس الشيء للواجهة — لا تنقل `node_modules` بين أنظمة تشغيل مختلفة.
> (Vite/Esbuild يعتمدوا على ملفات Native). الأفضل دائماً تشغيل `npm i` على نفس الجهاز/السيرفر.

> الواجهة تستخدم Proxy تلقائي (`/api`) لتجنب مشاكل CORS أثناء التطوير.

## حسابات تجريبية
- Employee: `employee@demo.local`
- Visa Admin: `visa@demo.local`
- Accounting: `acc@demo.local`

كلمة المرور: `admin123`

---

## صفحات موجودة
- Dashboard
- Visa Requests List
- Visa Details
- Offices / Vendors / Accounts (قائمة بسيطة)

## ملاحظة
الواجهة تعتمد على Endpoints إضافية باسم:
- `GET /meta/accounts`
- `GET /meta/offices`
- `GET /meta/vendors`

إذا كان الـ API عندك قديم، رح أرسل لك كود patch صغير لإضافتهم.
