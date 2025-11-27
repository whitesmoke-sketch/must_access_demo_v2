-- Enable Realtime for notification table
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events

-- Set replica identity to full for complete row data in realtime events
ALTER TABLE notification REPLICA IDENTITY FULL;

-- Add notification table to realtime publication
-- Note: supabase_realtime publication is automatically created by Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE notification;
