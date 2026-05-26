-- Drop the `facebook` and `github` values from the auth_provider enum.
-- Postgres doesn't support DROP VALUE on enums directly, so we:
--   1. create a new enum with only the values we want,
--   2. swap the column type using the new enum,
--   3. drop the old enum and rename the new one into its place.
--
-- This is safe at this point because the `identities` table is empty
-- (no logins yet). If it ever had rows referencing `facebook` or `github`,
-- this migration would fail at step 2 with "invalid input value for enum",
-- and we'd need to migrate or delete those rows first.

-- 1. Create the new enum.
CREATE TYPE "auth_provider_new" AS ENUM ('google');

-- 2. Swap the column type. The cast goes through text so Postgres doesn't
--    need to know how to convert between the two enum types directly.
ALTER TABLE "identities"
  ALTER COLUMN "provider" TYPE "auth_provider_new"
  USING ("provider"::text::"auth_provider_new");

-- 3. Drop the old enum and rename.
DROP TYPE "auth_provider";
ALTER TYPE "auth_provider_new" RENAME TO "auth_provider";
