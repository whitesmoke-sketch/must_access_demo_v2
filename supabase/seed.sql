-- ================================================================
-- MUST ACCESS - SEED DATA (DEVELOPMENT/TESTING ONLY)
-- ================================================================
-- Purpose: Documentation for test account creation
-- This file provides information about how to create test accounts
-- for development and testing purposes.
--
-- NOTE: This file does NOT contain actual seed data or INSERT statements.
-- All test account creation should be done through the provided scripts.
-- ================================================================

-- ================================================================
-- TEST ACCOUNT CREATION
-- ================================================================

-- To create test accounts for development and testing, use the TypeScript script:
--
--   scripts/create-test-accounts.ts
--
-- This script will:
-- 1. Create auth.users entries through Supabase Auth
-- 2. Assign appropriate roles and departments
-- 3. Set up test data for leave balances
-- 4. Create sample leave requests and approval flows
--
-- Usage:
--   npx tsx scripts/create-test-accounts.ts
--
-- The script creates the following test accounts:
-- - Admin user (admin level)
-- - HR user (HR level)
-- - Business head user (business_head level)
-- - Department head user (department_head level)
-- - Team leader user (team_leader level)
-- - Regular employee users (employee level)
--
-- Each test account will have:
-- - Valid authentication credentials
-- - Assigned department and role
-- - Initial leave balance
-- - Sample approval relationships

-- ================================================================
-- IMPORTANT NOTES
-- ================================================================

-- 1. NEVER commit actual test passwords or credentials to version control
-- 2. Test accounts should only be created in development/staging environments
-- 3. Production databases should NEVER contain test accounts
-- 4. Always use the provided script rather than manual SQL INSERT statements
-- 5. Test data should be clearly identifiable (e.g., email domains like @test.example.com)

-- ================================================================
-- ADDITIONAL TEST DATA SCRIPTS
-- ================================================================

-- For more comprehensive test data, consider creating additional scripts:
--
-- - scripts/seed-departments.ts       : Create test department structure
-- - scripts/seed-projects.ts          : Create sample projects
-- - scripts/seed-leave-requests.ts    : Create sample leave requests
-- - scripts/seed-equipment.ts         : Create sample equipment records
-- - scripts/seed-visitors.ts          : Create sample visitor records
--
-- These scripts can be run independently or as part of a test suite.

-- ================================================================
-- RESET TEST DATA
-- ================================================================

-- To reset test data in development environment:
--
-- WARNING: This will delete ALL data from the database!
-- Only run this in development/testing environments!
--
-- -- Delete all employee-related data (cascades to most tables)
-- DELETE FROM employee WHERE email LIKE '%@test.example.com';
--
-- -- Reset sequences if needed
-- SELECT setval('department_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM department));
-- SELECT setval('role_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM role));
--
-- After resetting, run the create-test-accounts.ts script again.

-- ================================================================
-- END OF SEED DOCUMENTATION
-- ================================================================
