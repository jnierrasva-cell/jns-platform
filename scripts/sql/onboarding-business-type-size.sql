-- Additive onboarding fields for multi-niche business typing.
-- Safe to run multiple times.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_type text;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_size text;

COMMENT ON COLUMN organizations.business_type IS
  'User-selected industry type at signup (appointments, coaching, agency, ...); separate from niche kit key';

COMMENT ON COLUMN organizations.business_size IS
  'Team size at signup: solo | 2_5 | 6_20 | 21_plus';
