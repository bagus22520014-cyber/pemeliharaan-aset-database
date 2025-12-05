# API Documentation - Pemeliharaan Aset Database

## Base URL

```
http://localhost:4000
```

## Authentication

Most endpoints require authentication via headers or cookies:

- **Headers**: `x-role`, `x-username`, `x-beban`
- **Cookies**: `role`, `username`, `beban`

### Roles

- `admin`: Full access to all resources
- `user`: Limited access based on `beban` (department)

---

## 📦 ASET ENDPOINTS

### 1. Get All Assets

```bash
# Admin - see all assets
curl.exe http://localhost:4000/aset \
  -H "x-role: admin"

# User - see only assets in their beban
curl.exe http://localhost:4000/aset \
  -H "x-role: user" \
  -H "x-beban: MLM"
```

### 2. Get Asset by AsetId

```bash
curl.exe http://localhost:4000/aset/0003%2FMLM%2F2024 \
  -H "x-role: admin"
```

### 3. Create New Asset (with image upload)

```bash
curl.exe -X POST http://localhost:4000/aset \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt \
  -F "AsetId=0004/MLM/2024" \
  -F "NamaAset=Monitor LED 24 inch" \
  -F "Grup=IT" \
  -F "Beban=MLM" \
  -F "Merk=LG" \
  -F "TanggalBeli=2024-12-05" \
  -F "NilaiAset=2500000" \
  -F "Kondisi=Baik" \
  -F "Lokasi=Malang" \
  -F "Tempat=Ruang Server" \
  -F "Pengguna=IT Support" \
  -F "Keterangan=Untuk monitoring server" \
  -F "Gambar=@./monitor.jpg"
```

### 4. Update Asset

```bash
curl.exe -X PUT http://localhost:4000/aset/0004%2FMLM%2F2024 \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt \
  -d "{\"NilaiAset\":2800000,\"Kondisi\":\"Sangat Baik\",\"Keterangan\":\"Updated after inspection\"}"
```

### 5. Update Asset Image Only

```bash
curl.exe -X PUT http://localhost:4000/aset/0004%2FMLM%2F2024/gambar \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt \
  -F "Gambar=@./new-monitor.jpg"
```

### 6. Update Keterangan Only

```bash
curl.exe -X PUT http://localhost:4000/aset/0004%2FMLM%2F2024/keterangan \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt \
  -d "{\"Keterangan\":\"Monitor sudah dipindahkan ke ruang admin\"}"
```

### 7. Delete Asset

```bash
curl.exe -X DELETE http://localhost:4000/aset/0004%2FMLM%2F2024 \
  -H "x-role: admin" \
  -b cookies.txt
```

---

## 🔧 PERBAIKAN ENDPOINTS

### 1. Get All Repairs

```bash
# Admin - see all repairs
curl.exe http://localhost:4000/perbaikan \
  -H "x-role: admin"

# User - see only repairs for assets in their beban
curl.exe http://localhost:4000/perbaikan \
  -H "x-role: user" \
  -H "x-beban: MLM"
```

### 2. Get Repairs by Asset

```bash
curl.exe http://localhost:4000/perbaikan/aset/0003%2FMLM%2F2024 \
  -H "x-role: admin"

# Or with query parameter
curl.exe "http://localhost:4000/perbaikan?asetId=0003/MLM/2024" \
  -H "x-role: admin"
```

### 3. Get Repair by ID

```bash
curl.exe http://localhost:4000/perbaikan/1 \
  -H "x-role: admin"
```

### 4. Create New Repair

```bash
curl.exe -X POST http://localhost:4000/perbaikan \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -H "x-beban: MLM" \
  -b cookies.txt \
  -d "{
    \"AsetId\": \"0003/MLM/2024\",
    \"tanggal\": \"2024-12-05\",
    \"PurchaseOrder\": \"PO-2024-001\",
    \"vendor\": \"Tech Repair Indo\",
    \"bagian\": \"Keyboard Switch Replacement\",
    \"nominal\": 250000
  }"
```

### 5. Update Repair (Admin Only)

```bash
curl.exe -X PUT http://localhost:4000/perbaikan/1 \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt \
  -d "{
    \"vendor\": \"PT Service Indo\",
    \"nominal\": 300000,
    \"bagian\": \"Full keyboard replacement\"
  }"
```

### 6. Delete Repair (Admin Only)

```bash
curl.exe -X DELETE http://localhost:4000/perbaikan/1 \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt
```

---

## 📋 RIWAYAT (AUDIT LOG) ENDPOINTS

### 1. Get All Audit Logs (Admin Only)

```bash
# All logs
curl.exe http://localhost:4000/riwayat \
  -H "x-role: admin"

# With limit
curl.exe "http://localhost:4000/riwayat?limit=20" \
  -H "x-role: admin"
```

### 2. Filter by Table Reference

```bash
# Only aset operations
curl.exe "http://localhost:4000/riwayat?tabel_ref=aset" \
  -H "x-role: admin"

# Only perbaikan operations
curl.exe "http://localhost:4000/riwayat?tabel_ref=perbaikan" \
  -H "x-role: admin"
```

### 3. Filter by User

```bash
# By user_id
curl.exe "http://localhost:4000/riwayat?user_id=38" \
  -H "x-role: admin"

# By username
curl.exe http://localhost:4000/riwayat/user/admin \
  -H "x-role: admin"
```

### 4. Filter by Asset

```bash
# By aset database id
curl.exe "http://localhost:4000/riwayat?aset_id=73" \
  -H "x-role: admin"

# By AsetId (user can access)
curl.exe http://localhost:4000/riwayat/aset/0003%2FMLM%2F2024 \
  -H "x-role: user" \
  -H "x-beban: MLM"
```

### 5. Combined Filters

```bash
curl.exe "http://localhost:4000/riwayat?tabel_ref=perbaikan&limit=10" \
  -H "x-role: admin"
```

---

## 🔔 NOTIFICATION ENDPOINTS

### 1. Get User Notifications

```bash
# All notifications (default limit 50)
curl.exe http://localhost:4000/notification \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt

# Only unread
curl.exe "http://localhost:4000/notification?dibaca=false" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt

# Only read
curl.exe "http://localhost:4000/notification?dibaca=true" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt

# Custom limit
curl.exe "http://localhost:4000/notification?limit=10" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt
```

### 2. Get Unread Count

```bash
curl.exe http://localhost:4000/notification/unread-count \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt
```

### 3. Mark Notification as Read

```bash
curl.exe -X PUT http://localhost:4000/notification/1/read \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt
```

### 4. Mark All Notifications as Read

```bash
curl.exe -X PUT http://localhost:4000/notification/read-all \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt
```

### 5. Delete Notification

```bash
# User can delete their own
curl.exe -X DELETE http://localhost:4000/notification/1 \
  -H "x-role: user" \
  -H "x-username: user1" \
  -b cookies.txt

# Admin can delete any
curl.exe -X DELETE http://localhost:4000/notification/1 \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -b cookies.txt
```

---

## 👤 USER ENDPOINTS

### 1. Login

```bash
curl.exe -X POST http://localhost:4000/user/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin\"}" \
  -c cookies.txt

# Response sets cookies: role, beban, username
```

### 2. Get All Users (Admin Only)

```bash
curl.exe http://localhost:4000/user \
  -H "x-role: admin"
```

### 3. Get User by Username (Admin Only)

```bash
curl.exe http://localhost:4000/user/admin \
  -H "x-role: admin"
```

### 4. Create New User (Admin Only)

```bash
curl.exe -X POST http://localhost:4000/user \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -d "{
    \"username\": \"user_mlm\",
    \"password\": \"password123\",
    \"role\": \"user\",
    \"beban\": [\"MLM\"]
  }"
```

### 5. Update User (Admin Only)

```bash
curl.exe -X PUT http://localhost:4000/user/user_mlm \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -d "{
    \"role\": \"admin\",
    \"beban\": [\"MLM\", \"SRG-NET\"]
  }"
```

### 6. Change Password

```bash
# Admin can change any user's password
curl.exe -X PUT http://localhost:4000/user/user_mlm/password \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -d "{\"newPassword\":\"newpass123\"}"

# User must provide old password
curl.exe -X PUT http://localhost:4000/user/user_mlm/password \
  -H "Content-Type: application/json" \
  -H "x-role: user" \
  -H "x-username: user_mlm" \
  -d "{
    \"oldPassword\": \"password123\",
    \"newPassword\": \"newpass123\"
  }"
```

### 7. Update User Beban (Admin Only)

```bash
curl.exe -X PUT http://localhost:4000/user/user_mlm/beban \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -d "{\"beban\":[\"MLM\",\"SRG-NET\",\"ATM\"]}"
```

### 8. Delete User (Admin Only)

```bash
curl.exe -X DELETE http://localhost:4000/user/user_mlm \
  -H "x-role: admin"
```

---

## 📊 RESPONSE EXAMPLES

### Asset Response

```json
{
  "id": 73,
  "AsetId": "0003/MLM/2024",
  "NamaAset": "Keyboard Mechanical",
  "Grup": "IT",
  "Beban": "MLM",
  "Merk": "Logitech",
  "TanggalBeli": "2024-01-15",
  "NilaiAset": 1500000,
  "Kondisi": "Baik",
  "Lokasi": "Surabaya",
  "Tempat": "Ruang IT",
  "Pengguna": "Bagus Prasetyo",
  "Keterangan": "Keyboard gaming untuk developer",
  "Gambar": "/assets/imgs/keyboard-1234567890.jpg"
}
```

### Perbaikan Response

```json
{
  "id": 1,
  "AsetId": "0003/MLM/2024",
  "tanggal": "2024-12-05",
  "PurchaseOrder": "PO-2024-001",
  "vendor": "Tech Repair Indo",
  "bagian": "Keyboard Switch Replacement",
  "nominal": 250000
}
```

### Riwayat Response

```json
{
  "id": 2,
  "jenis_aksi": "edit",
  "user_id": 38,
  "username": "admin",
  "role": "admin",
  "aset_id": 73,
  "AsetId": "0003/MLM/2024",
  "NamaAset": "Keyboard Mechanical",
  "tabel_ref": "aset",
  "record_id": null,
  "perubahan": {
    "Lokasi": {
      "before": "Malang",
      "after": "Surabaya"
    },
    "NilaiAset": {
      "before": 1200000,
      "after": 1500000
    }
  },
  "waktu": "2024-12-04T16:34:53.000Z"
}
```

### Notification Response

```json
{
  "total": 2,
  "notifications": [
    {
      "id": 1,
      "user_id": null,
      "username": null,
      "beban": "MLM",
      "tipe": "info",
      "judul": "Perbaikan Baru Ditambahkan",
      "pesan": "Perbaikan untuk aset 0003/MLM/2024 telah ditambahkan oleh admin",
      "link": "/perbaikan/1",
      "tabel_ref": "perbaikan",
      "record_id": 1,
      "dibaca": false,
      "waktu_dibuat": "2024-12-05T10:30:00.000Z",
      "waktu_dibaca": null
    },
    {
      "id": 2,
      "user_id": null,
      "username": null,
      "beban": "MLM",
      "tipe": "warning",
      "judul": "Perbaikan Diupdate",
      "pesan": "Perbaikan untuk aset 0003/MLM/2024 telah diupdate oleh admin",
      "link": "/perbaikan/1",
      "tabel_ref": "perbaikan",
      "record_id": 1,
      "dibaca": false,
      "waktu_dibuat": "2024-12-05T11:15:00.000Z",
      "waktu_dibaca": null
    }
  ]
}
```

---

## 🔑 KEY FEATURES

### Audit Logging (Riwayat)

- **Aset Operations**: `input`, `edit`, `delete`
- **Perbaikan Operations**: `perbaikan_input`, `perbaikan_edit`, `perbaikan_delete`
- Stores before/after changes in JSON format
- Tracks user, role, timestamp
- Supports filtering by table, user, asset

### Notifications

- **Types**: `info`, `warning`, `success`, `error`
- **Targeting**: By user_id or beban (department broadcast)
- **Features**: Read/unread status, timestamps, links to related records
- Automatic creation on:
  - New perbaikan added
  - Perbaikan updated
  - Perbaikan deleted

### Access Control

- **Admin**: Full access to all resources
- **User**: Filtered by beban (department)
- **Beban-based filtering**: Users see only assets/repairs for their departments

---

## 🗂️ ENUMS

### Grup (Asset Groups)

`IT`, `GA`, `Kendaraan`, `Lain-lain`

### Beban (Departments)

`MLM`, `SRG-NET`, `ATM`, `BMI`, `AVA`, `SPG`, `CGK`, `BPN`, `LAIN`

### Kondisi (Asset Condition)

`Baik`, `Rusak`, `Hilang`

### Role

`admin`, `user`

### Jenis Aksi (Audit Action Types)

`input`, `edit`, `delete`, `perbaikan_input`, `perbaikan_edit`, `perbaikan_delete`

### Notification Types

`info`, `warning`, `success`, `error`

### Table Reference

`aset`, `perbaikan`, `user`

---

## 📝 NOTES

1. **Image Upload**: Only `image/*` mime types, max 5MB
2. **Cookies**: Login returns cookies that can be reused with `-b cookies.txt`
3. **URL Encoding**: Use `%2F` for `/` in URLs (e.g., `0003%2FMLM%2F2024`)
4. **Timestamps**: All timestamps in ISO 8601 format (UTC)
5. **JSON Columns**: `perubahan` in riwayat table stores change history
6. **Foreign Keys**: ON DELETE CASCADE for data integrity
7. **Beban Broadcast**: Notifications with `user_id=null` go to all users in that beban

---

## 🚀 QUICK START

```bash
# 1. Login
curl.exe -X POST http://localhost:4000/user/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin\"}" \
  -c cookies.txt

# 2. Create asset
curl.exe -X POST http://localhost:4000/aset \
  -b cookies.txt \
  -H "x-username: admin" \
  -F "AsetId=TEST/MLM/2024" \
  -F "NamaAset=Test Asset" \
  -F "Grup=IT" \
  -F "Beban=MLM" \
  -F "NilaiAset=1000000"

# 3. Create repair (triggers notification)
curl.exe -X POST http://localhost:4000/perbaikan \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -H "x-username: admin" \
  -d "{\"AsetId\":\"TEST/MLM/2024\",\"tanggal\":\"2024-12-05\",\"vendor\":\"Vendor Test\",\"nominal\":100000}"

# 4. Check notifications
curl.exe http://localhost:4000/notification \
  -b cookies.txt \
  -H "x-username: admin"

# 5. Check audit log
curl.exe "http://localhost:4000/riwayat?tabel_ref=perbaikan&limit=5" \
  -H "x-role: admin"
```
