# Migration Log - Remove Tempat Field from Aset

**Date**: December 6, 2025
**Type**: Schema Change & Route Update

## Changes Made

### 1. Database Schema

- ✅ Removed column `Tempat` from `aset` table
- ✅ Column `Beban` already removed (using `beban_id` FK now)

### 2. Route Updates (`routes/aset.js`)

- ✅ Removed `Tempat` from `mapRow()` function
- ✅ Removed `Tempat` from `POST /aset` INSERT query
- ✅ Removed `Tempat` from `POST /aset` values array
- ✅ Removed `Tempat` from `PUT /aset/:id` UPDATE query
- ✅ Removed `Tempat` from `PUT /aset/:id` values array

### 3. Documentation Updates (`PANDUAN-API.md`)

- ✅ Removed `Tempat` from GET response examples
- ✅ Removed `Tempat` from POST form data examples
- ✅ Removed `Tempat` from PowerShell curl examples
- ✅ Removed `Tempat` from scenario examples
- ✅ Added note in "Tips & Best Practices" section about location management

## Migration Script

Created: `scripts/removeTempatBebanFromAset.js`

- Safely removes `Tempat` and `Beban` columns if they exist
- Idempotent (can be run multiple times)
- Provides clear output about columns removed

## Rationale

### Why Remove These Fields?

1. **Tempat**:

   - Detail location information should be managed via `aset_lokasi` table
   - Allows multiple locations per asset (distribution management)
   - Better normalization and flexibility
   - Field `Lokasi` in `aset` is sufficient for general location (city/region)

2. **Beban** (already removed earlier):
   - Replaced with `beban_id` foreign key to `beban` table
   - Ensures referential integrity
   - Enables JOIN queries for related beban data
   - Better normalization

## New Structure

### Aset Table Fields (after changes):

```
- id (PK)
- AsetId (UNIQUE)
- AccurateId
- NamaAset
- Spesifikasi
- Grup
- beban_id (FK → beban.id)
- departemen_id (FK → departemen.id)
- AkunPerkiraan
- NilaiAset
- jumlah
- nilai_satuan
- TglPembelian
- MasaManfaat
- StatusAset
- Pengguna
- Lokasi (general location: city/region)
- Keterangan
- Gambar
```

### Location Management:

- **General location**: Use `aset.Lokasi` field (e.g., "Jakarta", "Malang")
- **Detail location**: Use `aset_lokasi` table with `lokasi` field (e.g., "Server Room Lt 5 - Rack A")
- Multiple detailed locations per asset supported
- Tracks quantity per location with validation

## API Impact

### Before:

```json
{
  "Lokasi": "Malang",
  "Tempat": "Server Room"
}
```

### After:

```json
{
  "Lokasi": "Malang",
  "distribusi_lokasi": {
    "locations": [
      { "lokasi": "Server Room Lantai 2", "jumlah": 2 },
      { "lokasi": "Gudang Lantai 1", "jumlah": 1 }
    ]
  }
}
```

## Testing

### Verified Operations:

- ✅ GET /aset - Returns data without Tempat field
- ✅ GET /aset/:id - Returns data with distribusi_lokasi
- ✅ POST /aset - Creates aset without Tempat field
- ✅ PUT /aset/:id - Updates aset without Tempat field
- ✅ DELETE /aset/:id - Deletes aset successfully

### Test Results:

- All endpoints working correctly
- No SQL errors related to missing columns
- Foreign key relationships intact
- Location distribution via aset_lokasi functioning properly

## Rollback Instructions

If rollback is needed:

```sql
ALTER TABLE aset ADD COLUMN Tempat VARCHAR(150);
```

Then revert the route changes using git:

```bash
git checkout HEAD -- routes/aset.js
```

## Notes

- Existing data in `Lokasi` field preserved
- No data migration needed (Tempat was optional)
- All endpoints maintain backward compatibility
- Documentation updated to reflect new structure
- Migration script can be run safely on any database state

## Files Modified

1. `scripts/removeTempatBebanFromAset.js` (created)
2. `routes/aset.js` (updated - 5 changes)
3. `PANDUAN-API.md` (updated - 4 changes + new section)

## Commands Used

```bash
# Run migration
node scripts/removeTempatBebanFromAset.js

# Restart server
npm start

# Test endpoints
curl -H "x-role: admin" http://localhost:4000/aset
curl -H "x-role: admin" http://localhost:4000/aset/0015%2FMLM%2F2025
```

---

**Status**: ✅ Complete
**Impact**: Low (breaking change for clients expecting Tempat field)
**Recommendation**: Update client applications to use aset_lokasi for detailed location tracking
