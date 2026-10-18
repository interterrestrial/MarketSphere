-- Emails are stored lower-cased by the application, but a unique index on the
-- raw column is still case-sensitive. This makes "Buyer@Example.com" and
-- "buyer@example.com" collide at the database level too, so no code path can
-- create two accounts for the same address (account takeover vector).
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));
