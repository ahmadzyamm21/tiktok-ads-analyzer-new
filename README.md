# TikTok Shop GMV Max & Max ROAS Analyzer

Sebuah aplikasi web single-page (SPA) interaktif premium untuk menganalisis performa iklan TikTok Shop GMV Max dan strategi bidding Max ROAS. Aplikasi ini membantu pengiklan (advertisers) memahami metrik e-commerce TikTok Shop, mensimulasikan bidding Target ROAS, mendiagnosis performa iklan secara otomatis, serta mencetak laporan PDF.

## Fitur Utama

1. **Dashboard Overview**: Ringkasan performa biaya (Spend), omset (GMV), ROAS Aktual vs Target ROAS, total pesanan (Orders), rata-rata nilai pesanan (AOV), Conversion Rate (CVR), CTR, CPC, CPA, dan CPM.
2. **ROAS Simulator**: Kalkulator bidding dinamis untuk mensimulasikan dampak menaikkan/menurunkan Target ROAS terhadap Delivery Laju Budget dan Profitabilitas Bersih berdasarkan Margin Produk Anda.
3. **Batch Analyzer**: Unggah laporan berbentuk file CSV dari TikTok Ads Manager secara drag-and-drop atau input data kampanye secara manual ke dalam tabel perbandingan interaktif.
4. **Pusat Rekomendasi (Shop Diagnostics)**: Diagnosis performa otomatis berdasarkan metrik untuk memberikan langkah taktis perbaikan video kreatif iklan, halaman detail produk (PDP) TikTok Shop, maupun setelan bid ROAS.

## Cara Menggunakan

1. **Buka Aplikasi**:
   Cukup klik dua kali atau buka file `index.html` menggunakan peramban web (browser) modern seperti Google Chrome, Microsoft Edge, atau Firefox.
   
2. **Memuat Data Contoh (Demo)**:
   Klik tombol **"Load Demo Data"** di pojok kanan atas untuk melihat visualisasi grafik, metrik tabel, dan rekomendasi diagnosis langsung terisi dengan data contoh.

3. **Gunakan Simulator**:
   Klik tab **"ROAS Simulator"** di sidebar. Anda dapat menggeser slider *Target ROAS Set* atau mengubah margin, budget, dan metrik lainnya untuk melihat grafik proyeksi laba bersih dan tingkat penyerapan spend.

4. **Batch Analyzer & Upload CSV**:
   Klik tab **"Batch Analyzer"**. Anda bisa menyeret (drag & drop) file ekspor laporan kampanye CSV dari dashboard TikTok Ads Manager Anda langsung ke area dropzone. Sistem akan memetakan kolom secara otomatis (Spend, GMV, Clicks, dll.) dan memprosesnya langsung di browser secara lokal dan aman.

5. **Ekspor & Cetak PDF**:
   Klik tombol **"Export Report"** di pojok kanan atas untuk memformat halaman agar ramah cetak dan membuka dialog pencetakan browser untuk disimpan sebagai file PDF.

## Teknologi

* **Frontend**: HTML5 & CSS3 (Custom styling bertema gelap cyberpunk neon).
* **Charts**: [Chart.js](https://www.chartjs.org/) via CDN.
* **Icons**: [FontAwesome](https://fontawesome.com/) via CDN.
* **Typography**: Outfit Google Font.
* Tanpa dependensi backend & npm, berjalan 100% secara client-side lokal untuk keamanan privasi data iklan Anda.
