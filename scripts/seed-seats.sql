-- ================================================================
-- 좌석(Seat) 더미 데이터 삽입
-- ================================================================

-- 기존 좌석 데이터 삭제 (필요시)
-- DELETE FROM seat_reservation;
-- DELETE FROM seat;

-- 2층 좌석 (A구역)
INSERT INTO seat (seat_number, floor, area, seat_type, amenities, is_available) VALUES
('A-201', 2, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-202', 2, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-203', 2, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-204', 2, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-205', 2, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-206', 2, 'A구역', 'standing', '{"monitor": true, "usb_port": true, "standing_desk": true}', true),
('A-207', 2, 'A구역', 'standing', '{"monitor": true, "usb_port": true, "standing_desk": true}', true),
('A-208', 2, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true);

-- 2층 좌석 (B구역)
INSERT INTO seat (seat_number, floor, area, seat_type, amenities, is_available) VALUES
('B-201', 2, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('B-202', 2, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('B-203', 2, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('B-204', 2, 'B구역', 'premium', '{"monitor": true, "usb_port": true, "dual_monitor": true}', true),
('B-205', 2, 'B구역', 'premium', '{"monitor": true, "usb_port": true, "dual_monitor": true}', true),
('B-206', 2, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true);

-- 3층 좌석 (A구역)
INSERT INTO seat (seat_number, floor, area, seat_type, amenities, is_available) VALUES
('A-301', 3, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-302', 3, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-303', 3, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-304', 3, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-305', 3, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-306', 3, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true);

-- 3층 좌석 (B구역)
INSERT INTO seat (seat_number, floor, area, seat_type, amenities, is_available) VALUES
('B-301', 3, 'B구역', 'focus', '{"monitor": true, "usb_port": true, "partition": true}', true),
('B-302', 3, 'B구역', 'focus', '{"monitor": true, "usb_port": true, "partition": true}', true),
('B-303', 3, 'B구역', 'focus', '{"monitor": true, "usb_port": true, "partition": true}', true),
('B-304', 3, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('B-305', 3, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true);

-- 4층 좌석 (A구역)
INSERT INTO seat (seat_number, floor, area, seat_type, amenities, is_available) VALUES
('A-401', 4, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-402', 4, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-403', 4, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-404', 4, 'A구역', 'premium', '{"monitor": true, "usb_port": true, "dual_monitor": true}', true),
('A-405', 4, 'A구역', 'premium', '{"monitor": true, "usb_port": true, "dual_monitor": true}', true),
('A-406', 4, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true);

-- 4층 좌석 (B구역) - 일부 점검 중
INSERT INTO seat (seat_number, floor, area, seat_type, amenities, is_available) VALUES
('B-401', 4, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('B-402', 4, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('B-403', 4, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', false), -- 점검 중
('B-404', 4, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('B-405', 4, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', false); -- 점검 중

-- 5층 좌석 (A구역)
INSERT INTO seat (seat_number, floor, area, seat_type, amenities, is_available) VALUES
('A-501', 5, 'A구역', 'executive', '{"monitor": true, "usb_port": true, "dual_monitor": true, "ergonomic_chair": true}', true),
('A-502', 5, 'A구역', 'executive', '{"monitor": true, "usb_port": true, "dual_monitor": true, "ergonomic_chair": true}', true),
('A-503', 5, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('A-504', 5, 'A구역', 'standard', '{"monitor": true, "usb_port": true}', true);

-- 5층 좌석 (B구역)
INSERT INTO seat (seat_number, floor, area, seat_type, amenities, is_available) VALUES
('B-501', 5, 'B구역', 'focus', '{"monitor": true, "usb_port": true, "partition": true}', true),
('B-502', 5, 'B구역', 'focus', '{"monitor": true, "usb_port": true, "partition": true}', true),
('B-503', 5, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true),
('B-504', 5, 'B구역', 'standard', '{"monitor": true, "usb_port": true}', true);

-- ================================================================
-- 확인 쿼리
-- ================================================================
-- SELECT floor, COUNT(*) as seat_count FROM seat GROUP BY floor ORDER BY floor;
-- SELECT * FROM seat WHERE floor = 2 ORDER BY seat_number;
