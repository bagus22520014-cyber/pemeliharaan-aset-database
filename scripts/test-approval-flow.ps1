# Test script: create + reject and create + approve for transaction tables
# Run with PowerShell in repo root: pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-approval-flow.ps1

$base = 'http://localhost:4000'
$adminH = @{ 'x-role' = 'admin'; 'x-username' = 'admin' }
$userH = @{ 'x-role' = 'user'; 'x-username' = 'user1'; 'x-beban' = 'MLG-NET' }

function Get-FirstAsset {
    try {
        $assets = Invoke-RestMethod -Uri "$base/aset" -Headers $adminH -Method GET
    } catch {
        Write-Error "Failed to GET /aset: $($_)"
        exit 1
    }
    if (-not $assets -or $assets.Count -eq 0) {
        Write-Error "No assets found to run tests against"
        exit 1
    }
    return $assets[0]
}

function Get-AssetStatus($AsetId) {
    try {
        $alist = Invoke-RestMethod -Uri "$base/aset" -Headers $adminH -Method GET
        if ($null -eq $alist) { return $null }
        foreach ($item in $alist) {
            if ($item.AsetId -eq $AsetId) { return $item.StatusAset }
        }
        return $null
    } catch {
        Write-Warning "Could not read asset $($AsetId): $($_)"
        return $null
    }
}

function AssertEqual($a, $b, $message) {
    if ($a -ne $b) {
        Write-Error "Assertion failed: $message - expected '$b' but got '$a'"
        return $false
    }
    Write-Host "OK: $message"
    return $true
}

$asset = Get-FirstAsset
$AsetId = $asset.AsetId
$assetDbId = $asset.id
Write-Host "Using asset: $AsetId (id=$assetDbId)" -ForegroundColor Yellow

$allOk = $true

# Helper to run a create -> reject -> check, then create -> approve -> check
function Run-TableTest($tableName, $createBodyUser, $expectedStatusAfterApprove) {

    Write-Host "\n--- Testing $tableName (reject path) ---" -ForegroundColor Cyan
    $before = Get-AssetStatus $AsetId
    Write-Host "Asset status before: $before"

    # Create as user
    try {
        $createJson = $createBodyUser | ConvertTo-Json -Depth 5
        $res = Invoke-RestMethod -Uri "$base/$tableName" -Method POST -Headers $userH -Body $createJson -ContentType 'application/json'
    } catch {
        Write-Error "Create $tableName as user failed: $($_)"
        return $false
    }

    # extract id robustly from common response shapes
    $id = $null
    if ($res -ne $null) {
        if ($res.id) { $id = $res.id }
        elseif ($res.perbaikan -and $res.perbaikan.id) { $id = $res.perbaikan.id }
        elseif ($res.rusak -and $res.rusak.id) { $id = $res.rusak.id }
        elseif ($res.dijual -and $res.dijual.id) { $id = $res.dijual.id }
        elseif ($res.dipinjam -and $res.dipinjam.id) { $id = $res.dipinjam.id }
        elseif ($res.id -eq $null -and $res.GetType().Name -eq 'Hashtable') { $id = $res['id'] }
    }
    if (-not $id) {
        Write-Error "Could not determine created id for $tableName. Response: $(ConvertTo-Json $res -Depth 5)"
        return $false
    }
    Write-Host "Created $tableName id: $id"
    # Check asset status immediately after creation (to detect unwanted immediate changes)
    $afterCreate = Get-AssetStatus $AsetId
    if ($afterCreate -ne $before) {
        Write-Host "NOTE: Asset status changed after create (before=$before, afterCreate=$afterCreate)"
    }

    # Reject as admin
    try {
        Invoke-RestMethod -Uri "$base/approval/$tableName/$id/reject" -Method POST -Headers $adminH -Body '{}' -ContentType 'application/json' | Out-Null
        Write-Host "Rejected $tableName id $id"
    } catch {
        Write-Error "Reject request failed for $tableName id $($id): $($_)"
        return $false
    }

    Start-Sleep -Seconds 1
    $afterReject = Get-AssetStatus $AsetId
    if ($afterReject -ne $before) {
        Write-Error "$($tableName): Asset Status changed after reject (before=$before, after=$afterReject)"
        return $false
    } else { Write-Host "$($tableName): Asset Status unchanged after reject" }

    # Now create another entry and approve
    Write-Host "\n--- Testing $tableName (approve path) ---" -ForegroundColor Cyan
    try {
        $createJson2 = $createBodyUser | ConvertTo-Json -Depth 5
        $res2 = Invoke-RestMethod -Uri "$base/$tableName" -Method POST -Headers $userH -Body $createJson2 -ContentType 'application/json'
    } catch {
        Write-Error "Create $tableName (for approve) failed: $($_)"
        return $false
    }
    $id2 = $null
    if ($res2.id) { $id2 = $res2.id }
    elseif ($res2.$tableName -and $res2.$tableName.id) { $id2 = $res2.$tableName.id }
    elseif ($res2.perbaikan) { $id2 = $res2.perbaikan.id }
    elseif ($res2.rusak) { $id2 = $res2.rusak.id }
    if (-not $id2) { Write-Error "Could not determine created id for $tableName (approve run)"; return $false }
    Write-Host "Created $tableName id: $id2"

    try {
        Invoke-RestMethod -Uri "$base/approval/$tableName/$id2/approve" -Method POST -Headers $adminH -Body '{}' -ContentType 'application/json' | Out-Null
        Write-Host "Approved $tableName id $id2"
    } catch {
        Write-Error "Approve request failed for $tableName id $($id2): $($_)"
        return $false
    }

    Start-Sleep -Seconds 1
    $afterApprove = Get-AssetStatus $AsetId
    if ($expectedStatusAfterApprove) {
        if ($afterApprove -ne $expectedStatusAfterApprove) {
            Write-Error "$($tableName): Asset Status not updated as expected after approve. Expected='$expectedStatusAfterApprove' Got='$afterApprove'"
            return $false
        } else { Write-Host "$($tableName): Asset Status updated to '$afterApprove' after approve" }
    } else {
        Write-Host "$($tableName): No expected status mapping provided; observed: $afterApprove"
    }

    return $true
}

# Build payloads
$today = (Get-Date).ToString('yyyy-MM-dd')
$perbaikanBody = @{ AsetId = $AsetId; tanggal_perbaikan = $today; deskripsi = 'Test perbaikan'; biaya = 100000; teknisi = 'Tech' }
$rusakBody = @{ AsetId = $AsetId; TglRusak = $today; Kerusakan = 'Test rusak' }
$dipinjamBody = @{ AsetId = $AsetId; peminjam = 'User Loan'; tanggal_pinjam = $today; tanggal_kembali = (Get-Date).AddDays(7).ToString('yyyy-MM-dd') }
$dijualBody = @{ AsetId = $AsetId; tanggal_jual = $today; harga_jual = 500000; pembeli = 'Pembeli Test' }
$mutasiBody = @{ aset_id = $assetDbId; TglMutasi = $today; ruangan_tujuan = 'Ruang Test'; alasan = 'Test mutasi' }

# Run tests
$tests = @(
    @{ table='perbaikan'; body=$perbaikanBody; expect='diperbaiki' },
    @{ table='rusak'; body=$rusakBody; expect='rusak' },
    @{ table='dipinjam'; body=$dipinjamBody; expect='dipinjam' },
    @{ table='dijual'; body=$dijualBody; expect='dijual' },
    @{ table='mutasi'; body=$mutasiBody; expect=$null } # mutasi does not change StatusAset by default in approval mapping
)

foreach ($t in $tests) {
    $ok = Run-TableTest $t.table $t.body $t.expect
    if (-not $ok) { $allOk = $false }
}

Write-Host "\n=== Summary ===" -ForegroundColor Yellow
if ($allOk) { Write-Host "All tests passed" -ForegroundColor Green; exit 0 } else { Write-Host "Some tests failed" -ForegroundColor Red; exit 2 }
