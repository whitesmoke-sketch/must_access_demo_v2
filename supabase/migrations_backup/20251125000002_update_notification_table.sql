-- Add is_read boolean column and action_url to notification table
ALTER TABLE notification
ADD COLUMN IF NOT EXISTS is_read BOOLEAN GENERATED ALWAYS AS (read_at IS NOT NULL) STORED,
ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_recipient_read ON notification(recipient_id, is_read);

-- Comment
COMMENT ON COLUMN notification.is_read IS 'Computed column: true if read_at is not null';
COMMENT ON COLUMN notification.action_url IS 'Optional URL to navigate when notification is clicked';
