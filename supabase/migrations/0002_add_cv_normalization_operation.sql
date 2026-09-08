-- Adds a new ai_runs operation for the CV-normalization pass (lib/ai/pipeline.ts)
-- that cleans up mechanical copy/paste artifacts (run-on concatenated array
-- items, a stray section heading leaking into a field, etc.) in structured
-- CV data submitted via the "no CV yet" builder form, before it's used for
-- tailoring. Must run as its own statement — PostgreSQL doesn't allow a new
-- enum value to be used in the same transaction that adds it.
alter type ai_operation add value 'cv_normalization';
