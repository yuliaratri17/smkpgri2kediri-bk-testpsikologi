# SMK PGRI 2 Kediri - Tes Psikologi Internal

File dalam paket ini:
- `index.html` → beranda + user
- `admin.html` → admin + super admin
- `style.css` → tampilan
- `app.js` → logika aplikasi
- `apps_script.gs` → Google Apps Script untuk Google Sheets

## Akun admin
- Admin biasa: `admin` / `bkgrida2026`
- Super admin: `bksmkpgri2@gmail.com` / `rayarvian2`

## Google Sheets
1. Buka Google Sheets.
2. Buat spreadsheet baru.
3. Buka `Extensions → Apps Script`.
4. Tempel isi `apps_script.gs`.
5. Deploy sebagai **Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Salin URL web app ke:
   - `sheetEndpoint` di halaman admin
   - `sheetUrl` untuk tombol buka spreadsheet

## GitHub Pages
1. Upload semua file ke repository.
2. Pastikan `index.html` ada di root.
3. Aktifkan GitHub Pages dari branch `main` dan folder `/ (root)`.

## Catatan
- Sesi admin punya auto expire 4 jam.
- Logout wajib untuk keluar ke beranda.
- Pengiriman data memakai antrean lokal supaya lebih tahan ketika jaringan lambat.
