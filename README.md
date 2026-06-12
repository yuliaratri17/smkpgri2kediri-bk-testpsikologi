# SMK PGRI 2 Kediri - Tes Psikologi

File utama:
- `index.html` = beranda + user / tes
- `admin.html` = admin + super admin
- `site.js` = logika aplikasi
- `style.css` = tampilan
- `apps_script.gs` = Google Apps Script untuk Google Sheets

## Deploy ke GitHub Pages
1. Upload semua file ke root repository.
2. Pastikan `index.html` ada di root.
3. Settings → Pages → Deploy from branch → `main` → `/root`.

## Login
- Admin: `admin` / `bkgrida2026`
- Super admin: `bksmkpgri2@gmail.com` / `rayarvian2`

## Google Sheets
1. Buat spreadsheet rekap.
2. Buka Extensions → Apps Script.
3. Tempel `apps_script.gs`.
4. Deploy as Web App.
5. Simpan URL Web App ke `sheetEndpoint`.
6. Simpan URL Spreadsheet ke `sheetUrl`.

## Catatan
- Logout wajib dilakukan dari admin agar sesi tertutup.
- Konten beranda, branding, dan soal bisa diubah dari super admin.
