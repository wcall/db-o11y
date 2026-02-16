CREATE USER IF NOT EXISTS 'db-o11y'@'%' IDENTIFIED BY 'DBO11y-MySQL';

-- Basic monitoring privileges
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'db-o11y'@'%';
GRANT SELECT ON performance_schema.* TO 'db-o11y'@'%';

-- Grant read access to all schemas for query analysis
GRANT SELECT, SHOW VIEW ON *.* TO 'db-o11y'@'%';

FLUSH PRIVILEGES;

UPDATE performance_schema.setup_actors 
SET ENABLED = 'NO', HISTORY = 'NO' 
WHERE USER = 'db-o11y';

GRANT INSERT, UPDATE ON performance_schema.setup_actors TO 'db-o11y'@'%';

GRANT UPDATE ON performance_schema.setup_consumers TO 'db-o11y'@'%';

-- Enable if disabled
UPDATE performance_schema.setup_consumers 
SET ENABLED = 'YES' 
WHERE NAME = 'events_statements_cpu';

-- Enable if disabled
UPDATE performance_schema.setup_consumers 
SET ENABLED = 'YES' 
WHERE NAME IN ('events_waits_current', 'events_waits_history');
