-- Optional hiring-manager name, captured on the apply form so the AI cover
-- letter can address them by name ("Dear Ms Patel,") instead of the generic
-- "Dear Hiring Manager," fallback.
alter table requests add column hiring_manager_name text;
