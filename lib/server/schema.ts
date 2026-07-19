export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TEXT NOT NULL
  );`,
  // Added after users already existed in production - see the activityScore comment below for why this needs its own statement.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS "isOwner" BOOLEAN NOT NULL DEFAULT FALSE;`,
  `CREATE TABLE IF NOT EXISTS food_items (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    "servingSize" DOUBLE PRECISION NOT NULL,
    "servingUnit" TEXT NOT NULL,
    source TEXT NOT NULL,
    "sourceId" TEXT,
    calories DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proteinG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbsG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiberG" DOUBLE PRECISION,
    "sugarG" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    PRIMARY KEY ("userId", id)
  );`,
  `CREATE TABLE IF NOT EXISTS meal_entries (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "foodItemId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    date TEXT NOT NULL,
    servings DOUBLE PRECISION NOT NULL DEFAULT 1,
    notes TEXT,
    "createdAt" TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS meal_entries_user_date_idx ON meal_entries("userId", date);`,
  // Nullable and additive — old rows just have no hour and fall back to displaying "mealType".
  `ALTER TABLE meal_entries ADD COLUMN IF NOT EXISTS "hour" INTEGER;`,
  `CREATE TABLE IF NOT EXISTS user_profile (
    "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    age INTEGER,
    sex TEXT,
    "heightCm" DOUBLE PRECISION,
    "currentWeightKg" DOUBLE PRECISION,
    "targetWeightKg" DOUBLE PRECISION,
    "goalType" TEXT NOT NULL,
    "activityMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS health_connections (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    "providerUserId" TEXT,
    status TEXT NOT NULL,
    scopes TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TEXT,
    "lastSyncedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS health_connections_user_provider_idx ON health_connections("userId", provider);`,
  `CREATE TABLE IF NOT EXISTS health_metrics_daily (
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    provider TEXT NOT NULL,
    steps INTEGER,
    "activeEnergyKcal" DOUBLE PRECISION,
    "totalEnergyKcal" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "sleepMinutes" INTEGER,
    "sleepScore" DOUBLE PRECISION,
    "readinessScore" DOUBLE PRECISION,
    "activityScore" DOUBLE PRECISION,
    "restingHeartRate" DOUBLE PRECISION,
    "hrvMs" DOUBLE PRECISION,
    "spo2Pct" DOUBLE PRECISION,
    workouts INTEGER,
    PRIMARY KEY ("userId", date, provider)
  );`,
  // Added after health_metrics_daily already existed in production - CREATE TABLE above is a
  // no-op there, so the column needs adding explicitly. Safe to run repeatedly.
  `ALTER TABLE health_metrics_daily ADD COLUMN IF NOT EXISTS "activityScore" DOUBLE PRECISION;`,
  `CREATE TABLE IF NOT EXISTS invite_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    label TEXT,
    "createdByUserId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "usedByUserId" TEXT REFERENCES users(id) ON DELETE SET NULL,
    "usedAt" TEXT,
    "revokedAt" TEXT,
    "createdAt" TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS invite_codes_created_by_idx ON invite_codes("createdByUserId");`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL,
    "usedAt" TEXT,
    "createdAt" TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens("userId");`,
  // "weightCiphertext"/"weightSalt"/"weightIv" hold an AES-CBC blob keyed from a passphrase the
  // user chooses on-device and never transmits — the server only ever sees ciphertext, by design.
  `CREATE TABLE IF NOT EXISTS survey_responses (
    "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    "heightCm" DOUBLE PRECISION,
    "weightCiphertext" TEXT,
    "weightSalt" TEXT,
    "weightIv" TEXT,
    movement TEXT,
    goals TEXT,
    "notesHabit" TEXT,
    "notesReviewFrequency" TEXT,
    "notesSystem" TEXT,
    "notesChallenge" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS ai_suggestions_daily (
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    PRIMARY KEY ("userId", date)
  );`,
  `CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    servings DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS recipes_user_idx ON recipes("userId");`,
  // No FK on "foodItemId" — same loose-reference convention as meal_entries.foodItemId, since
  // food_items' primary key is composite ("userId", id) and every read already re-scopes by
  // userId via the join, so a formal FK here wouldn't add real safety.
  `CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id TEXT PRIMARY KEY,
    "recipeId" TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    "foodItemId" TEXT NOT NULL,
    servings DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_idx ON recipe_ingredients("recipeId");`,
  // Nullable and additive — when set, this overrides the BMR/activity-derived calorie target;
  // when null (the default), the goal stays fully computed as before.
  `ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS "calorieOverride" DOUBLE PRECISION;`,
] as const;
