ALTER TABLE "JobApplication"
  ADD COLUMN "normalizedCompany" TEXT,
  ADD COLUMN "normalizedRole" TEXT;

UPDATE "JobApplication"
SET
  "normalizedCompany" = NULLIF(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(trim(COALESCE("company", ''))), '[[:punct:]]+', ' ', 'g'),
        '\s+(inc|llc|ltd|corp|corporation|company|co)$',
        '',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    ),
    ''
  ),
  "normalizedRole" = NULLIF(
    regexp_replace(
      regexp_replace(lower(trim(COALESCE("role", ''))), '[[:punct:]]+', ' ', 'g'),
      '\s+',
      ' ',
      'g'
    ),
    ''
  );

CREATE INDEX "JobApplication_userId_normalizedCompany_normalizedRole_idx"
  ON "JobApplication"("userId", "normalizedCompany", "normalizedRole");
