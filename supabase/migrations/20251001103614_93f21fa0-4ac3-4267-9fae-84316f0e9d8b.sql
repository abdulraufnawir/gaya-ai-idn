-- Enable realtime updates for projects table
ALTER TABLE projects REPLICA IDENTITY FULL;

-- Add projects table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE projects;