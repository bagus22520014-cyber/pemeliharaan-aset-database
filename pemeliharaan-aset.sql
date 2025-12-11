-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 10, 2025 at 02:53 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pemeliharaan-aset`
--

-- --------------------------------------------------------

--
-- Table structure for table `aset`
--

CREATE TABLE `aset` (
  `id` int(11) NOT NULL,
  `AsetId` varchar(50) DEFAULT NULL,
  `AccurateId` varchar(50) DEFAULT NULL,
  `NamaAset` varchar(255) NOT NULL,
  `Spesifikasi` text DEFAULT NULL,
  `Grup` enum('BANGUNAN','DISTRIBUSI JARINGAN','HEADEND','KENDARAAN','KOMPUTER','PERALATAN & INVENTARIS KANTOR','TANAH') NOT NULL,
  `beban_id` int(11) DEFAULT NULL,
  `departemen_id` int(11) DEFAULT NULL,
  `AkunPerkiraan` enum('1701-01 (Tanah)','1701-02 (Bangunan)','1701-03 (Kendaraan)','1701-04 (Distribusi Jaringan / Headend)','1701-05 (Peralatan & Inventaris Kantor)','1701-06 (Renovasi & Instalasi Listrik)','1701-07 (Perlengkapan & Inventaris IT)') DEFAULT NULL,
  `NilaiAset` int(11) DEFAULT NULL,
  `TglPembelian` date DEFAULT NULL,
  `MasaManfaat` int(11) DEFAULT NULL,
  `StatusAset` enum('aktif','rusak','diperbaiki','dipinjam','dijual') NOT NULL DEFAULT 'aktif',
  `Pengguna` varchar(100) DEFAULT NULL,
  `Lokasi` varchar(255) DEFAULT NULL,
  `Keterangan` text DEFAULT NULL,
  `approval_status` enum('diajukan','disetujui','ditolak') DEFAULT 'diajukan',
  `approval_date` datetime DEFAULT NULL,
  `Gambar` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `beban`
--

CREATE TABLE `beban` (
  `id` int(11) NOT NULL,
  `kode` varchar(50) NOT NULL,
  `aktif` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `beban`
--

INSERT INTO `beban` (`id`, `kode`, `aktif`, `created_at`, `updated_at`) VALUES
(1, 'MLM', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(2, 'BJR-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(3, 'BNT-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(4, 'BTM-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(5, 'GTO-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(6, 'KDR-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(7, 'LMP-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(8, 'MLG-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(9, 'PDG-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(10, 'PKB-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(11, 'PKP-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(12, 'PLB-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(13, 'SBY-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(14, 'SMD-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(15, 'SRG-NET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(16, 'MLMKOB', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(17, 'MLMMET', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(18, 'MLMSDKB', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(19, 'MLMSL', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(20, 'BJR-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(21, 'BNT-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(22, 'BTM-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(23, 'GTO-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(24, 'KDR-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(25, 'LMP-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(26, 'MLG-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(27, 'PDG-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(28, 'PKB-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(29, 'PKP-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(30, 'PLB-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(31, 'SBY-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(32, 'SMD-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25'),
(33, 'SRG-MEDIA', 1, '2025-12-06 09:48:25', '2025-12-06 09:48:25');

-- --------------------------------------------------------

--
-- Table structure for table `departemen`
--

CREATE TABLE `departemen` (
  `id` int(11) NOT NULL,
  `kode` varchar(50) NOT NULL,
  `nama` varchar(200) NOT NULL,
  `aktif` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departemen`
--

INSERT INTO `departemen` (`id`, `kode`, `nama`, `aktif`, `created_at`, `updated_at`) VALUES
(1, 'FAT', 'FAT', 1, '2025-12-06 09:51:16', '2025-12-06 09:51:16'),
(2, 'HRDGA', 'HRD dan GA', 1, '2025-12-06 09:51:16', '2025-12-06 09:51:16'),
(3, 'TEK', 'Teknik', 1, '2025-12-06 09:51:16', '2025-12-06 09:51:16'),
(4, 'SALES', 'Sales dan Marketing', 1, '2025-12-06 09:51:16', '2025-12-06 09:51:16'),
(5, 'LEGAL', 'Legal', 1, '2025-12-06 09:51:16', '2025-12-06 09:51:16'),
(6, 'LOG', 'Logistik', 1, '2025-12-06 09:51:16', '2025-12-06 09:51:16');

-- --------------------------------------------------------

--
-- Table structure for table `dijual`
--

CREATE TABLE `dijual` (
  `id` int(11) NOT NULL,
  `aset_id` int(11) NOT NULL,
  `TglDijual` date NOT NULL,
  `HargaJual` int(11) DEFAULT 0,
  `Pembeli` varchar(100) DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `approval_status` enum('diajukan','disetujui','ditolak') DEFAULT 'diajukan',
  `approval_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dipinjam`
--

CREATE TABLE `dipinjam` (
  `id` int(11) NOT NULL,
  `aset_id` int(11) NOT NULL,
  `Peminjam` varchar(100) NOT NULL,
  `TglPinjam` date NOT NULL,
  `TglKembali` date DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `approval_status` enum('diajukan','disetujui','ditolak') DEFAULT 'diajukan',
  `approval_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mutasi`
--

CREATE TABLE `mutasi` (
  `id` int(11) NOT NULL,
  `aset_id` int(11) NOT NULL,
  `TglMutasi` date NOT NULL,
  `departemen_asal_id` int(11) DEFAULT NULL,
  `departemen_tujuan_id` int(11) DEFAULT NULL,
  `ruangan_asal` varchar(255) DEFAULT NULL,
  `ruangan_tujuan` varchar(255) DEFAULT NULL,
  `alasan` text DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `approval_status` enum('diajukan','disetujui','ditolak') DEFAULT 'diajukan',
  `approval_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `beban` varchar(100) DEFAULT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','success','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `related_aset_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `perbaikan`
--

CREATE TABLE `perbaikan` (
  `id` int(11) NOT NULL,
  `aset_id` int(11) NOT NULL,
  `tanggal_perbaikan` date NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `biaya` decimal(15,2) DEFAULT 0.00,
  `teknisi` varchar(100) DEFAULT NULL,
  `PurchaseOrder` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approval_status` enum('diajukan','disetujui','ditolak') DEFAULT 'diajukan',
  `approval_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `riwayat`
--

CREATE TABLE `riwayat` (
  `id` int(11) NOT NULL,
  `jenis_aksi` varchar(50) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL,
  `aset_id` int(11) DEFAULT NULL,
  `perubahan` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`perubahan`)),
  `tabel_ref` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rusak`
--

CREATE TABLE `rusak` (
  `id` int(11) NOT NULL,
  `aset_id` int(11) NOT NULL,
  `TglRusak` date NOT NULL,
  `Kerusakan` text DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `approval_status` enum('diajukan','disetujui','ditolak') DEFAULT 'diajukan',
  `approval_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `nama` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `beban` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`beban`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `username`, `nama`, `password`, `role`, `beban`) VALUES
(38, 'admin', 'admin', 'admin123', 'admin', '[\"MLM\"]'),
(54, 'user1', 'user1', 'User#1234', 'user', '[\"MLG-MEDIA\",\"MLG-NET\"]');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `aset`
--
ALTER TABLE `aset`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `AsetId` (`AsetId`),
  ADD KEY `idx_beban_id` (`beban_id`),
  ADD KEY `idx_departemen_id` (`departemen_id`);

--
-- Indexes for table `beban`
--
ALTER TABLE `beban`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode` (`kode`),
  ADD KEY `idx_kode` (`kode`),
  ADD KEY `idx_aktif` (`aktif`);

--
-- Indexes for table `departemen`
--
ALTER TABLE `departemen`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode` (`kode`),
  ADD KEY `idx_kode` (`kode`),
  ADD KEY `idx_aktif` (`aktif`);

--
-- Indexes for table `dijual`
--
ALTER TABLE `dijual`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aset_id` (`aset_id`);

--
-- Indexes for table `dipinjam`
--
ALTER TABLE `dipinjam`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aset_id` (`aset_id`);

--
-- Indexes for table `mutasi`
--
ALTER TABLE `mutasi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `aset_id` (`aset_id`),
  ADD KEY `departemen_asal_id` (`departemen_asal_id`),
  ADD KEY `departemen_tujuan_id` (`departemen_tujuan_id`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_beban` (`beban`),
  ADD KEY `idx_read` (`is_read`);

--
-- Indexes for table `perbaikan`
--
ALTER TABLE `perbaikan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aset_id` (`aset_id`);

--
-- Indexes for table `riwayat`
--
ALTER TABLE `riwayat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aset_id` (`aset_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_tabel_ref` (`tabel_ref`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `rusak`
--
ALTER TABLE `rusak`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aset_id` (`aset_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `aset`
--
ALTER TABLE `aset`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `beban`
--
ALTER TABLE `beban`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `departemen`
--
ALTER TABLE `departemen`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `dijual`
--
ALTER TABLE `dijual`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `dipinjam`
--
ALTER TABLE `dipinjam`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `mutasi`
--
ALTER TABLE `mutasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `perbaikan`
--
ALTER TABLE `perbaikan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `riwayat`
--
ALTER TABLE `riwayat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `rusak`
--
ALTER TABLE `rusak`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `aset`
--
ALTER TABLE `aset`
  ADD CONSTRAINT `fk_aset_beban` FOREIGN KEY (`beban_id`) REFERENCES `beban` (`id`),
  ADD CONSTRAINT `fk_aset_departemen` FOREIGN KEY (`departemen_id`) REFERENCES `departemen` (`id`);

--
-- Constraints for table `dijual`
--
ALTER TABLE `dijual`
  ADD CONSTRAINT `fk_dijual_aset` FOREIGN KEY (`aset_id`) REFERENCES `aset` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `dipinjam`
--
ALTER TABLE `dipinjam`
  ADD CONSTRAINT `fk_dipinjam_aset` FOREIGN KEY (`aset_id`) REFERENCES `aset` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `mutasi`
--
ALTER TABLE `mutasi`
  ADD CONSTRAINT `mutasi_ibfk_1` FOREIGN KEY (`aset_id`) REFERENCES `aset` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mutasi_ibfk_2` FOREIGN KEY (`departemen_asal_id`) REFERENCES `departemen` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `mutasi_ibfk_3` FOREIGN KEY (`departemen_tujuan_id`) REFERENCES `departemen` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `perbaikan`
--
ALTER TABLE `perbaikan`
  ADD CONSTRAINT `fk_perbaikan_aset` FOREIGN KEY (`aset_id`) REFERENCES `aset` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `riwayat`
--
ALTER TABLE `riwayat`
  ADD CONSTRAINT `fk_riwayat_aset` FOREIGN KEY (`aset_id`) REFERENCES `aset` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_riwayat_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `rusak`
--
ALTER TABLE `rusak`
  ADD CONSTRAINT `fk_rusak_aset` FOREIGN KEY (`aset_id`) REFERENCES `aset` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
