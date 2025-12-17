# Panduan Akses dari Perangkat Lain (Satu Jaringan / IP yang Sama)

Dokumen singkat ini menjelaskan cara membuka API pada perangkat lain di jaringan lokal (mis. laptop/HP lain di Wi‑Fi yang sama).

1. Perubahan kode yang sudah diterapkan

- `index.js` sekarang:
  - Mengikat server ke `0.0.0.0` (mendengarkan semua interface),
  - Mengaktifkan `CORS` (`app.use(cors())`) supaya browser dari perangkat lain dapat mengakses API.

2. Pastikan server berjalan

```powershell
# jalankan server (dijalankan di repo root)
node index.js
```

3. Temukan alamat IP mesin (Windows)

```powershell
ipconfig
# atau, untuk hanya menampilkan IPv4 address:
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.PrefixOrigin -ne 'WellKnown'} | Select-Object IPAddress
```

4. Buka port pada Windows Firewall (jika diperlukan)

```powershell
# buka port TCP 4000 untuk profile Private dan Domain
New-NetFirewallRule -DisplayName "pemeliharaan-aset-api" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4000 -Profile Private,Domain
```

5. Akses dari perangkat lain

- Di perangkat lain pada jaringan yang sama, buka:
  http://<HOST_IP>:4000/
  contoh: `http://192.168.1.42:4000/`

6. Jika akses via browser gagal (CORS)

- `index.js` sudah mengaktifkan CORS global. Untuk membatasi asal, ganti
  `app.use(cors())` dengan opsi origin yang spesifik.

7. Troubleshooting singkat

- Jika `curl` dari perangkat lain gagal: periksa firewall, pastikan server berjalan, dan pastikan IP yang digunakan adalah IP host pada interface jaringan yang sama.
- Jika menggunakan jaringan terpisah (mis. seluler/hotspot), router atau carrier bisa memblok port.

Butuh saya restart server dan tunjukkan IP sekarang supaya Anda bisa langsung coba dari perangkat lain? Saya bisa lakukan itu sekarang.
