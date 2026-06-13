# Design System & UI/UX Specification: NJ Transit Analytics Web

Dokumen ini berisi panduan desain antarmuka (UI) dan pengalaman pengguna (UX) untuk web aplikasi prediksi status dan jadwal kereta. Referensi tata letak utama mengacu pada struktur hero section berbasis komponen interaktif dinamis seperti pada `image_fcfd1b.jpg`.

---

## 1. Filosofi Desain
Aplikasi ini mengusung tema **Simple Minimalist Elegant**. Fokus utama adalah meminimalkan gangguan visual (*cognitive load*) agar pengguna dapat langsung berinteraksi dengan model machine learning (prediksi keterlambatan dan status) secara instan. 

*   **Clean Space:** Penggunaan *padding* dan *margin* yang luas untuk memberikan ruang bernapas pada setiap komponen.
*   **Contextual Glassmorphism:** Mengadopsi elemen kartu transparan dari referensi `image_fcfd1b.jpg` untuk memberikan kesan modern dan kedalaman visual (depth).
*   **High Typography Contrast:** Mengandalkan kontras tipografi yang kuat ketimbang menggunakan ornamen grafis yang ramai.

---

## 2. Palet Warna (Color Palette)

Menggunakan pendekatan warna monokromatik dengan satu warna aksen korporat yang tegas untuk elemen interaktif penting.

| Elemen UI | Jenis Warna | Kode Hex | Implementasi (Tailwind) |
| :--- | :--- | :--- | :--- |
| **Primary/Brand** | Deep Navy | `#0F172A` | `bg-slate-900` |
| **Accent/Action** | Electric Blue | `#2563EB` | `bg-blue-600` |
| **Background** | Pure/Off White | `#F8FAFC` | `bg-slate-50` |
| **Card / Container** | Transparent White | `rgba(255,255,255,0.7)` | `bg-white/70 backdrop-blur-md` |
| **Text Primary** | Dark Slate | `#1E293B` | `text-slate-800` |
| **Text Secondary** | Muted Grey | `#64748B` | `text-slate-500` |

---

## 3. Tipografi (Typography)

Menggunakan kombinasi font sans-serif modern yang bersih dan sangat terbaca pada layar digital.

*   **Font Family:** Inter atau Geist Sans (jika menggunakan lingkungan editor modern).
*   **Heading Utama (Hero Title):** Font-weight `700` (Bold), ukuran `text-4xl` hingga `text-5xl`, tracking `tight`.
*   **Body Text & Label:** Font-weight `400` (Regular) / `500` (Medium), ukuran `text-sm` atau `text-base`.

---

## 4. Tata Letak & Arsitektur Komponen (Layout Structure)

Desain halaman utama mengadopsi arsitektur *Single Page Application* (SPA) dengan fokus utama pada komponen Hero.

### A. Navigation Bar (Minimalist Header)
*   **Sisi Kiri:** Logo NJ Transit Analytics (monokrom).
*   **Sisi Kanan:** Tiga menu navigasi utama (Predictor, Analytics Dashboard, API Docs) dengan teks tipis (`text-slate-600 hover:text-blue-600 transition-colors`).

### B. Hero Section (Referensi: `image_fcfd1b.jpg`)
*   **Background:** Menggunakan gambar stasiun atau pergerakan kereta dengan efek *exposure* rendah dan *overlay* gelap tipis (`bg-black/20`) agar teks di atasnya tetap terbaca jelas (*accessible*).
*   **Headline Teks:** Berada di sisi kiri tengah:
    *   *Title:* "Predicting Efficiency, Enhancing Commutes."
    *   *Subtitle:* "Sistem informasi analitik pintar berbasis Random Forest untuk memprediksi status ketepatan waktu kereta NJ Transit secara real-time."

### C. Widget Prediksi Utama (Interactive Glassmorphic Card)
Terinspirasi langsung dari form pencarian stasiun pada `image_fcfd1b.jpg`, widget ini diletakkan melayang di bagian bawah Hero Section.

Gunakan Icon jangan gunakan logo

```text
+-----------------------------------------------------------------------------------------+
| [Icon] Predict Delay   [Icon] Line Analytics   [Icon] API Status                        |
+-----------------------------------------------------------------------------------------+
| Dari Stasiun (from_id)  | Ke Stasiun (to_id)    | Jalur Kereta (line) | Waktu (actual)   |
| [ Dropdown Select     ] | [ Dropdown Select   ] | [ Dropdown Select ] | [ Time Picker ]  |
+-----------------------------------------------------------------------------------------+
|                                                                    [ BUTTON: PREDICT ]  |
+-----------------------------------------------------------------------------------------+