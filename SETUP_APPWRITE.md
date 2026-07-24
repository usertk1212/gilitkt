# Setup Appwrite (pengganti Supabase)

## 1. Bikin akun & project
1. Daftar gratis di https://cloud.appwrite.io
2. Create Project, kasih nama misal "GILI"
3. Di Settings project, copy **Project ID**

## 2. Bikin Database + Collection
1. Sidebar kiri → Databases → Create Database (nama bebas, misal "gili-db"), copy **Database ID**
2. Di dalam database itu, Create Collection, nama "assets", copy **Collection ID**
3. Tambahin Attributes berikut (Collection → Attributes → Create attribute):
   - `nama_file` — String, size 255, required
   - `asset_name` — String, size 255, required
   - `url_lightroom` — String, size 2000, required
   - `type` — String, size 100, required
   - `created_at` — String, size 100, optional
   - `updated_at` — String, size 100, optional
4. Buat Index di attribute `nama_file` (type: key) supaya query pencarian by filename cepat.

## 3. Set permissions (PENTING, baca ini)
App ini ga ada sistem login/auth. Supaya app tetap bisa baca/tulis data dari browser (client-side, kayak Supabase anon key kemarin), di Collection → Settings → Permissions, tambahin role **Any** dengan akses Create, Read, Update, Delete.

⚠️ Catatan keamanan: ini artinya siapapun yang tau URL app-nya bisa ubah/hapus data asset kamu, sama persis kayak setup Supabase lama kamu yang pakai anon key tanpa RLS. Kalau app ini internal aja (ga di-share publik), risikonya kecil. Kalau nanti mau lebih aman, tambahin Appwrite Auth dan ubah permission jadi role **Users** aja.

## 4. Isi environment variables
Copy `.env.example` jadi `.env.local`, isi 4 value di atas (Project ID, Database ID, Collection ID, endpoint default udah bener).

Untuk production, masukin 4 variable yang sama di Vercel → Project Settings → Environment Variables.

## 5. Migrasi data lama (opsional)
Kalau project Supabase lama kamu masih bisa diakses (belum kehapus beneran), export data assets-nya ke CSV lewat Supabase dashboard (Table Editor → assets → Export), lalu import manual satu-satu lewat form "Add Asset" di app, atau minta bantuan Claude buat bikin script import CSV → Appwrite.
