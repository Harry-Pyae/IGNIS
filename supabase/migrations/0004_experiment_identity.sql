-- One campaign/run identity across publications; do not delete or merge conflicting records automatically.
-- Existing duplicates must be reviewed by R1 before this migration can be applied.
create unique index experiments_campaign_test_identity
  on public.experiments (lower(btrim(campaign)), lower(btrim(test_id)));
