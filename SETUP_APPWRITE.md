# Setup Appwrite

## 1. Bikin akun & project
1. Daftar gratis di https://cloud.appwrite.io
2. Create Project, kasih nama misal "GILI"
3. Di Settings project, copy **Project ID**

## 2. Bikin Database + Table
1. Sidebar kiri → Databases → Create Database (nama bebas, misal "gili-db"), copy **Database ID**
2. Di dalam database itu, Create Table, Table ID harus persis **`assets`** (sudah di-hardcode di kode)
3. Tambahin Columns berikut (Table → Columns → Create column, semua tipe String):
   - `nama_file` — String, size 255, required
   - `asset_name` — String, size 255, required
   - `url_lightroom` — String, size 2000, required
   - `type` — String, size 100, required

   Catatan: `created_at`/`updated_at` TIDAK perlu dibikin sebagai column sendiri —
   kode-nya pakai `$createdAt`/`$updatedAt` bawaan Appwrite yang otomatis
   ada di tiap row, jadi gak ada kolom timestamp custom yang perlu di-setup manual.
4. (Opsional) Buat Unique index di column `nama_file` (Length: 191) supaya nama file
   gak bisa dobel kalau ada import ulang.

## 3. Set permissions (PENTING, baca ini)
App ini ga ada sistem login/auth. Supaya app tetap bisa baca/tulis data dari browser
(client-side), di Table → Settings → Permissions, tambahin role **Any** dengan akses
Create, Read, Update, Delete.

⚠️ Catatan keamanan: ini artinya siapapun yang tau URL app-nya bisa ubah/hapus data
asset kamu. Kalau app ini internal aja (ga di-share publik), risikonya kecil. Kalau
nanti mau lebih aman, tambahin Appwrite Auth dan ubah permission jadi role **Users** aja.

## 4. Isi environment variables
Copy `.env.example` jadi `.env.local`, isi 3 value: Project ID, Database ID, dan
endpoint (default-nya udah bener, biasanya gak perlu diubah).

Untuk production, masukin 3 variable yang sama di Vercel → Project Settings →
Environment Variables, lalu redeploy.

## 5. Daftarin domain sebagai Platform (buat CORS)
Di halaman **Overview** project (bukan di Settings) → **Add platform** → pilih **Web**
→ isi hostname domain Vercel kamu. Ulangi untuk tiap domain Vercel yang beda kalau ada
lebih dari satu (production, preview, dst).
