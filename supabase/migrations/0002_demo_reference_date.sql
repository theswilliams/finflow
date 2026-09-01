-- Demo datasets pin the app's "today" to the end of a complete showcase month.
-- Persist that anchor so a signed-in user who loaded sample data still sees the
-- same full month after a reload.

alter table profiles add column if not exists demo_reference_date date;
