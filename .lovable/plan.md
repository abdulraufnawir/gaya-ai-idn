## Review jujur sebagai power user

Flow saat ini sebetulnya **sudah lengkap fitur**, tapi **belum smooth untuk power user**. Masalah utamanya adalah **2-step mental model**:

1. Step 1: Generate try-on (model + 1 baju, background apa adanya dari foto model)
2. Step 2: Buka Lookbook → pilih background → generate lagi (1 kredit lagi)

Untuk power user yang tahu persis "saya mau model X pakai gamis Y di pantai", ini **butuh 2 generate × 2 kredit** dan nunggu 2x. Padahal niatnya satu shot.

Selain itu ada beberapa friction kecil:

- **Hijab + Atasan** (umum di market modest fashion) tidak bisa dalam 1 try-on — kategori dipilih tunggal.
- **Background swap baru muncul SETELAH** try-on selesai (di LookbookPanel). Power user sudah tahu mau background apa dari awal.
- **Bulk mode** powerful tapi terkubur di toggle. Visibility rendah.
- **Preset** menyimpan model + kategori, tapi **tidak menyimpan background pilihan** atau "outfit recipe" lengkap.

---

## Rekomendasi: 3 perbaikan flow (urut prioritas)

### 1. "Background dari awal" — All-in-one generate (HIGH IMPACT)

Tambahkan **dropdown / pill selector "Background"** di form utama sebelum tombol Generate, dengan opsi:

- **Pakai background asli foto** (default — gratis, 1 kredit total)
- **Studio Putih / Studio Abu / Bali / Jakarta / Cafe / Pantai / Rooftop** (preset Lookbook yang sudah ada)

Kalau user pilih background non-default, sistem otomatis **chain 2 step di backend dalam 1 klik**:
1. Try-on di kie-ai (1 kredit)
2. Background swap via lookbook-generate (1 kredit)
→ Total 2 kredit, **tapi user cuma sekali klik & sekali nunggu** (progress bar gabungan).

Hasil masuk ke history sebagai 1 project final. Lookbook tetap dipakai untuk generate variasi tambahan **setelah** punya hasil.

### 2. Multi-garment dalam 1 model — Layered try-on (MEDIUM IMPACT)

Ubah single garment slot jadi **slot bertingkat**:

```text
Model: [foto]
Outfit: 
  + Atasan     [foto]   ← optional
  + Bawahan    [foto]   ← optional
  + Hijab      [foto]   ← optional, urut paling akhir
  + Aksesoris  [foto]   ← v2
```

User minimum isi 1 slot. Backend chain try-on per garment secara berurutan (atasan → bawahan → hijab). Tiap slot = 1 kredit.

Use case nyata: jualan **set hijab + gamis** atau **kemeja + celana** — saat ini user harus generate 2x manual dan tidak bisa lihat hasil layered di 1 model.

### 3. "Recipe" preset — simpan resep lengkap (LOW EFFORT, HIGH DELIGHT)

Upgrade `tryon_presets` agar menyimpan:
- model + kategori (sudah ada)
- **+ background preset pilihan**
- **+ pose preset default untuk lookbook**

Sehingga power user yang produksi konten harian bisa:
1. Buka preset "Senin – Gamis Studio Putih + 4 pose"
2. Upload baju
3. Klik Generate → langsung dapat 5 foto siap upload (1 hero + 4 variasi pose)

---

## Yang menurut saya **TIDAK** perlu ditambah dulu

- ❌ Auto-trigger lookbook variasi tiap kali try-on selesai → mahal kredit, tidak semua user mau.
- ❌ Background custom upload → editorial preset sudah cukup untuk 90% use case fashion ID.
- ❌ Real-time preview "ganti background hover" → biaya AI per hover terlalu mahal.

---

## Yang akan diubah secara teknis

**Sprint A — Background-from-start (paling impactful, mulai dari sini):**

- `src/components/VirtualTryOn.tsx`
  - Tambah state `backgroundPreset: string | null` dan UI pill selector di antara kategori dan tombol Generate.
  - Modifikasi `handleProcess`: setelah try-on `completed`, kalau `backgroundPreset !== null`, panggil `lookbook-generate` dengan `variations: [{ type: 'background', key: backgroundPreset }]`, lalu update `activeJob.resultUrl` ke hasil background-swapped.
  - Update progress label: "Step 1/2: Try-on..." → "Step 2/2: Mengganti background..."
  - Update kredit hint di tombol: "Generate (2 kredit)" kalau background dipilih.
- `src/components/LookbookPanel.tsx`
  - Tetap ada untuk generate variasi tambahan, tapi tab "Background" otomatis menandai background yang sudah dipilih di awal sebagai "·dibuat".

**Sprint B — Multi-garment layered:**

- `supabase/functions/kie-ai/index.ts`: tambah action `virtualTryOnLayered` yang menerima array `[{ url, category }]` dan chain output→input.
- `VirtualTryOn.tsx`: ubah single garment block jadi conditional 3-slot (Atasan / Bawahan / Hijab), simpan urutan eksekusi.
- Migration ringan: tambah kolom `metadata.layers` di `projects` untuk audit.

**Sprint C — Recipe preset:**

- Migration: tambah kolom `background_preset text` dan `pose_presets text[]` di `tryon_presets`.
- `TryOnPresets.tsx`: dropdown background + multi-pick pose saat save preset.
- `VirtualTryOn.tsx` `handleApplyPreset`: restore background_preset ke selector baru di Sprint A.

---

## Rekomendasi urutan eksekusi

1. **Sprint A dulu** — paling sedikit perubahan, dampak terbesar (1-klik ke hasil siap-publish).
2. **Sprint C** kemudian — quick win, bangun di atas A.
3. **Sprint B** terakhir — paling kompleks, butuh testing chaining AI.

Approve Sprint A untuk dieksekusi sekarang?