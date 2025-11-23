-- =====================================================
-- Organization Management Complete Implementation
-- =====================================================
-- This migration adds complete support for organization
-- management with approval workflow protection
-- =====================================================

-- =====================================================
-- 1. ADD COLUMNS TO DEPARTMENT TABLE
-- =====================================================

-- Add ordering column for drag-and-drop
ALTER TABLE department
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Add soft delete columns
ALTER TABLE department
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE department
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES employee(id);

-- Add audit trail columns
ALTER TABLE department
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employee(id);

ALTER TABLE department
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employee(id);

-- Add CHECK constraint
ALTER TABLE department
ADD CONSTRAINT check_display_order_non_negative
CHECK (display_order >= 0);

ALTER TABLE department
ADD CONSTRAINT check_name_not_empty
CHECK (LENGTH(TRIM(name)) > 0);

-- =====================================================
-- 2. EXPLICIT FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop existing constraint and recreate with explicit ON DELETE
DO $$
BEGIN
  -- Drop if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employee_department_id_fkey'
  ) THEN
    ALTER TABLE employee DROP CONSTRAINT employee_department_id_fkey;
  END IF;

  -- Add with explicit RESTRICT
  ALTER TABLE employee
  ADD CONSTRAINT employee_department_id_fkey
  FOREIGN KEY (department_id)
  REFERENCES department(id)
  ON DELETE RESTRICT;
END $$;

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Index for parent-order queries (drag-and-drop optimization)
CREATE INDEX IF NOT EXISTS idx_dept_parent_order
ON department(parent_department_id, display_order);

-- Index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_dept_deleted
ON department(deleted_at) WHERE deleted_at IS NULL;

-- Index for parent queries
CREATE INDEX IF NOT EXISTS idx_dept_parent
ON department(parent_department_id) WHERE parent_department_id IS NOT NULL;

-- Indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_dept_created_by
ON department(created_by);

CREATE INDEX IF NOT EXISTS idx_dept_updated_by
ON department(updated_by);

-- =====================================================
-- 4. CREATE AUDIT TRAIL TABLES
-- =====================================================

-- Department change history
CREATE TABLE IF NOT EXISTS department_history (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES employee(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_history_dept
ON department_history(department_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_dept_history_changed_by
ON department_history(changed_by);

-- Employee department transfer history
CREATE TABLE IF NOT EXISTS employee_department_history (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  old_department_id BIGINT REFERENCES department(id),
  new_department_id BIGINT REFERENCES department(id),
  reason TEXT,
  changed_by UUID REFERENCES employee(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_dept_history_emp
ON employee_department_history(employee_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_dept_history_changed_by
ON employee_department_history(changed_by);

-- Approval step changes audit
CREATE TABLE IF NOT EXISTS approval_step_audit (
  id BIGSERIAL PRIMARY KEY,
  approval_step_id UUID NOT NULL,
  old_approver_id UUID REFERENCES employee(id),
  new_approver_id UUID REFERENCES employee(id),
  change_reason TEXT,
  changed_by UUID REFERENCES employee(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_step_audit_step
ON approval_step_audit(approval_step_id, changed_at DESC);

-- =====================================================
-- 5. CREATE APPROVAL SNAPSHOT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS approval_organization_snapshot (
  id BIGSERIAL PRIMARY KEY,
  approval_step_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  department_id BIGINT NOT NULL,
  department_name TEXT NOT NULL,
  department_path TEXT NOT NULL,
  role_id BIGINT NOT NULL,
  role_name TEXT NOT NULL,
  role_level INT NOT NULL,
  manager_id UUID,
  manager_name TEXT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_snapshot_step
ON approval_organization_snapshot(approval_step_id);

CREATE INDEX IF NOT EXISTS idx_approval_snapshot_employee
ON approval_organization_snapshot(employee_id);

-- =====================================================
-- 6. TRIGGER FUNCTIONS
-- =====================================================

-- A. Prevent circular department references
CREATE OR REPLACE FUNCTION prevent_department_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if parent is not changing or is being set to NULL
  IF NEW.parent_department_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if setting parent would create a circular reference
  IF EXISTS (
    WITH RECURSIVE dept_tree AS (
      -- Start from the current department
      SELECT id, parent_department_id
      FROM department
      WHERE id = NEW.id AND deleted_at IS NULL

      UNION ALL

      -- Walk down the tree
      SELECT d.id, d.parent_department_id
      FROM department d
      INNER JOIN dept_tree dt ON d.parent_department_id = dt.id
      WHERE d.deleted_at IS NULL
    )
    SELECT 1
    FROM dept_tree
    WHERE id = NEW.parent_department_id
  ) THEN
    RAISE EXCEPTION 'Circular reference detected: Cannot set department % as parent of department % (would create a loop)',
      NEW.parent_department_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B. Validate department deletion
CREATE OR REPLACE FUNCTION validate_department_deletion()
RETURNS TRIGGER AS $$
DECLARE
  active_employee_count INT;
  child_dept_count INT;
  pending_approval_count INT;
BEGIN
  -- 1. Check for active employees
  SELECT COUNT(*) INTO active_employee_count
  FROM employee
  WHERE department_id = OLD.id
    AND (deleted_at IS NULL OR deleted_at > NOW());

  IF active_employee_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete department "%": % active employee(s) exist. Please reassign employees first.',
      OLD.name, active_employee_count;
  END IF;

  -- 2. Check for child departments
  SELECT COUNT(*) INTO child_dept_count
  FROM department
  WHERE parent_department_id = OLD.id
    AND (deleted_at IS NULL OR deleted_at > NOW());

  IF child_dept_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete department "%": % child department(s) exist. Please delete or move child departments first.',
      OLD.name, child_dept_count;
  END IF;

  -- 3. Check for pending approvals where this department's employees are approvers
  SELECT COUNT(*) INTO pending_approval_count
  FROM approval_step ast
  INNER JOIN employee e ON e.id = ast.approver_id
  WHERE e.department_id = OLD.id
    AND ast.status IN ('pending', 'in_progress')
    AND e.deleted_at IS NULL;

  IF pending_approval_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete department "%": % pending approval(s) exist with approvers from this department. Please complete or reassign approvals first.',
      OLD.name, pending_approval_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- C. Track department changes
CREATE OR REPLACE FUNCTION track_department_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track name changes
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO department_history
      (department_id, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, 'name', OLD.name, NEW.name, NEW.updated_by);
  END IF;

  -- Track code changes
  IF OLD.code IS DISTINCT FROM NEW.code THEN
    INSERT INTO department_history
      (department_id, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, 'code', OLD.code, NEW.code, NEW.updated_by);
  END IF;

  -- Track parent changes
  IF OLD.parent_department_id IS DISTINCT FROM NEW.parent_department_id THEN
    INSERT INTO department_history
      (department_id, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, 'parent_department_id',
       OLD.parent_department_id::TEXT,
       NEW.parent_department_id::TEXT,
       NEW.updated_by);
  END IF;

  -- Track manager changes
  IF OLD.manager_id IS DISTINCT FROM NEW.manager_id THEN
    INSERT INTO department_history
      (department_id, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, 'manager_id',
       OLD.manager_id::TEXT,
       NEW.manager_id::TEXT,
       NEW.updated_by);
  END IF;

  -- Track display_order changes
  IF OLD.display_order IS DISTINCT FROM NEW.display_order THEN
    INSERT INTO department_history
      (department_id, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, 'display_order',
       OLD.display_order::TEXT,
       NEW.display_order::TEXT,
       NEW.updated_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- D. Handle soft delete
CREATE OR REPLACE FUNCTION handle_department_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if being soft deleted (not already deleted)
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Validate deletion constraints
    PERFORM validate_department_deletion();

    -- Record deletion in history
    INSERT INTO department_history
      (department_id, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, 'deleted_at', NULL, NEW.deleted_at::TEXT, NEW.deleted_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- E. Reassign orphaned approvals when approver is deleted
CREATE OR REPLACE FUNCTION reassign_orphaned_approvals()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
  replacement_approver_id UUID;
  dept_manager_id UUID;
  requester_dept_id BIGINT;
BEGIN
  -- Only process if employee is being soft deleted
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN

    -- Find all pending approval steps where this employee is the approver
    FOR r IN
      SELECT
        ast.id as step_id,
        ast.approval_id,
        a.employee_id as requester_id,
        e.department_id as requester_dept_id
      FROM approval_step ast
      INNER JOIN approval a ON a.id = ast.approval_id
      INNER JOIN employee e ON e.id = a.employee_id
      WHERE ast.approver_id = NEW.id
        AND ast.status = 'pending'
    LOOP
      replacement_approver_id := NULL;
      requester_dept_id := r.requester_dept_id;

      -- Strategy 1: Try to get the department manager
      SELECT manager_id INTO dept_manager_id
      FROM department
      WHERE id = requester_dept_id
        AND deleted_at IS NULL
        AND manager_id IS NOT NULL
        AND manager_id != NEW.id;

      IF dept_manager_id IS NOT NULL THEN
        replacement_approver_id := dept_manager_id;
      ELSE
        -- Strategy 2: Try to get parent department manager
        SELECT d.manager_id INTO replacement_approver_id
        FROM department d
        INNER JOIN department child ON child.parent_department_id = d.id
        WHERE child.id = requester_dept_id
          AND d.manager_id IS NOT NULL
          AND d.manager_id != NEW.id
          AND d.deleted_at IS NULL
        LIMIT 1;
      END IF;

      -- If we found a replacement, update the approval step
      IF replacement_approver_id IS NOT NULL THEN
        UPDATE approval_step
        SET approver_id = replacement_approver_id
        WHERE id = r.step_id;

        -- Log the change
        INSERT INTO approval_step_audit
          (approval_step_id, old_approver_id, new_approver_id, change_reason, changed_by)
        VALUES
          (r.step_id, NEW.id, replacement_approver_id,
           'Original approver deleted/deactivated - auto-reassigned to manager',
           NEW.deleted_by);
      ELSE
        -- No replacement found - set to NULL and log
        UPDATE approval_step
        SET approver_id = NULL, status = 'pending'
        WHERE id = r.step_id;

        INSERT INTO approval_step_audit
          (approval_step_id, old_approver_id, new_approver_id, change_reason, changed_by)
        VALUES
          (r.step_id, NEW.id, NULL,
           'Original approver deleted - no suitable replacement found',
           NEW.deleted_by);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- F. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_department_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_prevent_circular_dept_ref ON department;
DROP TRIGGER IF EXISTS trg_validate_dept_deletion ON department;
DROP TRIGGER IF EXISTS trg_track_dept_changes ON department;
DROP TRIGGER IF EXISTS trg_handle_dept_soft_delete ON department;
DROP TRIGGER IF EXISTS trg_reassign_orphaned_approvals ON employee;
DROP TRIGGER IF EXISTS trg_update_dept_timestamp ON department;

-- Create triggers
CREATE TRIGGER trg_prevent_circular_dept_ref
  BEFORE INSERT OR UPDATE ON department
  FOR EACH ROW
  EXECUTE FUNCTION prevent_department_circular_reference();

CREATE TRIGGER trg_validate_dept_deletion
  BEFORE DELETE ON department
  FOR EACH ROW
  EXECUTE FUNCTION validate_department_deletion();

CREATE TRIGGER trg_track_dept_changes
  AFTER UPDATE ON department
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION track_department_changes();

CREATE TRIGGER trg_handle_dept_soft_delete
  BEFORE UPDATE ON department
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION handle_department_soft_delete();

CREATE TRIGGER trg_reassign_orphaned_approvals
  AFTER UPDATE ON employee
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION reassign_orphaned_approvals();

CREATE TRIGGER trg_update_dept_timestamp
  BEFORE UPDATE ON department
  FOR EACH ROW
  EXECUTE FUNCTION update_department_timestamp();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Get department hierarchy path (e.g., "Company > Engineering > Backend")
CREATE OR REPLACE FUNCTION get_department_path(dept_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  path TEXT := '';
  current_id BIGINT := dept_id;
  current_name TEXT;
  loop_count INT := 0;
  max_depth INT := 20;
BEGIN
  -- Prevent infinite loops
  WHILE current_id IS NOT NULL AND loop_count < max_depth LOOP
    SELECT name, parent_department_id
    INTO current_name, current_id
    FROM department
    WHERE id = current_id AND deleted_at IS NULL;

    -- Exit if department not found
    IF current_name IS NULL THEN
      EXIT;
    END IF;

    -- Build path
    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;

    loop_count := loop_count + 1;
  END LOOP;

  RETURN COALESCE(path, '');
END;
$$ LANGUAGE plpgsql STABLE;

-- Get all descendant departments
CREATE OR REPLACE FUNCTION get_department_descendants(dept_id BIGINT)
RETURNS TABLE(
  id BIGINT,
  name TEXT,
  level INT,
  path TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dept_tree AS (
    -- Start node
    SELECT
      d.id,
      d.name,
      d.parent_department_id,
      0 as level
    FROM department d
    WHERE d.id = dept_id AND d.deleted_at IS NULL

    UNION ALL

    -- Recursive part
    SELECT
      d.id,
      d.name,
      d.parent_department_id,
      dt.level + 1
    FROM department d
    INNER JOIN dept_tree dt ON d.parent_department_id = dt.id
    WHERE d.deleted_at IS NULL AND dt.level < 20  -- Prevent infinite recursion
  )
  SELECT
    dt.id,
    dt.name,
    dt.level,
    get_department_path(dt.id) as path
  FROM dept_tree dt
  WHERE dt.id != dept_id
  ORDER BY dt.level, dt.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if department has any descendants
CREATE OR REPLACE FUNCTION department_has_descendants(dept_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM get_department_descendants(dept_id)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 9. CREATE VIEWS
-- =====================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS department_with_stats;

-- Create comprehensive department view with statistics
CREATE VIEW department_with_stats AS
SELECT
  d.id,
  d.name,
  d.code,
  d.parent_department_id,
  d.manager_id,
  d.display_order,
  d.created_at,
  d.updated_at,
  d.created_by,
  d.updated_by,
  d.deleted_at,
  d.deleted_by,
  get_department_path(d.id) as full_path,
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.deleted_at IS NULL
    AND e.status = 'active'
  ) as active_member_count,
  COUNT(DISTINCT child.id) FILTER (
    WHERE child.deleted_at IS NULL
  ) as child_count,
  COALESCE(m.name, '') as manager_name,
  COALESCE(cb.name, '') as created_by_name,
  COALESCE(ub.name, '') as updated_by_name
FROM department d
LEFT JOIN employee e ON e.department_id = d.id
LEFT JOIN department child ON child.parent_department_id = d.id
LEFT JOIN employee m ON m.id = d.manager_id
LEFT JOIN employee cb ON cb.id = d.created_by
LEFT JOIN employee ub ON ub.id = d.updated_by
WHERE d.deleted_at IS NULL
GROUP BY
  d.id, d.name, d.code, d.parent_department_id, d.manager_id,
  d.display_order, d.created_at, d.updated_at, d.created_by,
  d.updated_by, d.deleted_at, d.deleted_by, m.name, cb.name, ub.name;

-- =====================================================
-- 10. UPDATE RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS department_select_all ON department;
DROP POLICY IF EXISTS department_insert_with_permission ON department;
DROP POLICY IF EXISTS department_update_with_permission ON department;
DROP POLICY IF EXISTS department_delete_with_permission ON department;

-- SELECT: All authenticated users can view non-deleted departments
CREATE POLICY department_select_all ON department
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- INSERT: Only users with department:manage permission
CREATE POLICY department_insert_with_permission ON department
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM employee e
      INNER JOIN role_permission rp ON rp.role_id = e.role_id
      INNER JOIN permission p ON p.id = rp.permission_id
      WHERE e.id = auth.uid()
        AND p.code = 'department:manage'
        AND e.deleted_at IS NULL
    )
  );

-- UPDATE: Only users with department:manage permission for non-deleted departments
CREATE POLICY department_update_with_permission ON department
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM employee e
      INNER JOIN role_permission rp ON rp.role_id = e.role_id
      INNER JOIN permission p ON p.id = rp.permission_id
      WHERE e.id = auth.uid()
        AND p.code = 'department:manage'
        AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM employee e
      INNER JOIN role_permission rp ON rp.role_id = e.role_id
      INNER JOIN permission p ON p.id = rp.permission_id
      WHERE e.id = auth.uid()
        AND p.code = 'department:manage'
        AND e.deleted_at IS NULL
    )
  );

-- DELETE: Only users with department:manage permission
-- (Note: In practice, soft delete via UPDATE is preferred)
CREATE POLICY department_delete_with_permission ON department
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM employee e
      INNER JOIN role_permission rp ON rp.role_id = e.role_id
      INNER JOIN permission p ON p.id = rp.permission_id
      WHERE e.id = auth.uid()
        AND p.code = 'department:manage'
        AND e.deleted_at IS NULL
    )
  );

-- RLS for audit tables
ALTER TABLE department_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_department_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_step_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_organization_snapshot ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read audit trails
CREATE POLICY department_history_select ON department_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY employee_dept_history_select ON employee_department_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY approval_step_audit_select ON approval_step_audit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY approval_snapshot_select ON approval_organization_snapshot
  FOR SELECT TO authenticated USING (true);

-- Only system/authorized users can write to audit tables
CREATE POLICY department_history_insert ON department_history
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY employee_dept_history_insert ON employee_department_history
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY approval_step_audit_insert ON approval_step_audit
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY approval_snapshot_insert ON approval_organization_snapshot
  FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- 11. BACKFILL EXISTING DATA
-- =====================================================

-- Set display_order for existing departments
-- Ordered by id within each parent group
DO $$
DECLARE
  r RECORD;
  order_counter INT;
BEGIN
  -- Process each parent group
  FOR r IN (
    SELECT DISTINCT COALESCE(parent_department_id, -1) as parent_id
    FROM department
    WHERE deleted_at IS NULL
    ORDER BY parent_id
  ) LOOP
    order_counter := 0;

    -- Update each department in this group
    UPDATE department
    SET display_order = order_counter + (
      SELECT COUNT(*)
      FROM department d2
      WHERE COALESCE(d2.parent_department_id, -1) = r.parent_id
        AND d2.id < department.id
        AND d2.deleted_at IS NULL
    )
    WHERE COALESCE(parent_department_id, -1) = r.parent_id
      AND deleted_at IS NULL;
  END LOOP;
END $$;

-- =====================================================
-- 12. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE department IS 'Organization departments with hierarchical structure and soft delete support';
COMMENT ON COLUMN department.display_order IS 'Order for display and drag-and-drop sorting within same parent';
COMMENT ON COLUMN department.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN department.deleted_by IS 'Employee who soft deleted this department';
COMMENT ON COLUMN department.created_by IS 'Employee who created this department';
COMMENT ON COLUMN department.updated_by IS 'Employee who last updated this department';

COMMENT ON TABLE department_history IS 'Audit trail for all department changes';
COMMENT ON TABLE employee_department_history IS 'History of employee department transfers';
COMMENT ON TABLE approval_step_audit IS 'Audit trail for approval step changes (e.g., approver reassignment)';
COMMENT ON TABLE approval_organization_snapshot IS 'Snapshot of organization structure at approval creation time';

COMMENT ON FUNCTION get_department_path(BIGINT) IS 'Returns full hierarchical path (e.g., "Company > Engineering > Backend")';
COMMENT ON FUNCTION get_department_descendants(BIGINT) IS 'Returns all descendant departments recursively';
COMMENT ON FUNCTION department_has_descendants(BIGINT) IS 'Check if department has any children';

COMMENT ON VIEW department_with_stats IS 'Department view with member counts and manager names';

COMMENT ON FUNCTION prevent_department_circular_reference() IS 'Trigger function to prevent circular parent-child relationships';
COMMENT ON FUNCTION validate_department_deletion() IS 'Trigger function to validate department can be deleted (no employees, children, or pending approvals)';
COMMENT ON FUNCTION track_department_changes() IS 'Trigger function to record all department field changes to audit table';
COMMENT ON FUNCTION handle_department_soft_delete() IS 'Trigger function to handle soft delete validation and logging';
COMMENT ON FUNCTION reassign_orphaned_approvals() IS 'Trigger function to reassign approvals when approver is deleted';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
