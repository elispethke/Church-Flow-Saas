-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateTable: churches (tenant root)
CREATE TABLE "churches" (
    "id"         TEXT        NOT NULL,
    "name"       TEXT        NOT NULL,
    "slug"       TEXT        NOT NULL,
    "email"      TEXT        NOT NULL,
    "phone"      TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "churches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: users
CREATE TABLE "users" (
    "id"            TEXT         NOT NULL,
    "church_id"     TEXT         NOT NULL,
    "first_name"    TEXT         NOT NULL,
    "last_name"     TEXT         NOT NULL,
    "email"         TEXT         NOT NULL,
    "password_hash" TEXT         NOT NULL,
    "status"        "UserStatus" NOT NULL DEFAULT 'PENDING',
    "is_active"     BOOLEAN      NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMPTZ  NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: roles
CREATE TABLE "roles" (
    "id"          TEXT        NOT NULL,
    "church_id"   TEXT        NOT NULL,
    "name"        TEXT        NOT NULL,
    "description" TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: permissions
CREATE TABLE "permissions" (
    "id"          TEXT        NOT NULL,
    "code"        TEXT        NOT NULL,
    "name"        TEXT        NOT NULL,
    "description" TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_roles (junction)
CREATE TABLE "user_roles" (
    "user_id"    TEXT        NOT NULL,
    "role_id"    TEXT        NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable: role_permissions (junction)
CREATE TABLE "role_permissions" (
    "role_id"       TEXT        NOT NULL,
    "permission_id" TEXT        NOT NULL,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable: refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id"         TEXT        NOT NULL,
    "user_id"    TEXT        NOT NULL,
    "token_hash" TEXT        NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- ─── Unique constraints ───────────────────────────────────────────────────────

-- slug globally unique (used for subdomain routing)
CREATE UNIQUE INDEX "churches_slug_key"  ON "churches"("slug");
-- email globally unique per church account
CREATE UNIQUE INDEX "churches_email_key" ON "churches"("email");

-- email unique per tenant (prevents same email in two users of the same church)
CREATE UNIQUE INDEX "users_church_id_email_key" ON "users"("church_id", "email");

-- role name unique per tenant
CREATE UNIQUE INDEX "roles_church_id_name_key" ON "roles"("church_id", "name");

-- permission code globally unique (e.g., "finance.write")
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- token hash globally unique (token reuse detection)
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- ─── Performance indexes ──────────────────────────────────────────────────────

-- churches: slug for URL/subdomain routing lookups
CREATE INDEX "churches_slug_idx" ON "churches"("slug");

-- users: tenant-scoped queries (most common access pattern)
CREATE INDEX "users_church_id_idx" ON "users"("church_id");
-- users: login lookup by email (before knowing churchId)
CREATE INDEX "users_email_idx" ON "users"("email");
-- users: listing active/pending users within a tenant
CREATE INDEX "users_church_id_status_idx" ON "users"("church_id", "status");

-- roles: listing roles within a tenant
CREATE INDEX "roles_church_id_idx" ON "roles"("church_id");

-- refresh_tokens: "revoke all sessions for user" operations
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
-- refresh_tokens: token validation (hot path — called on every authenticated request)
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- ─── Foreign keys ─────────────────────────────────────────────────────────────

ALTER TABLE "users"
    ADD CONSTRAINT "users_church_id_fkey"
    FOREIGN KEY ("church_id") REFERENCES "churches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roles"
    ADD CONSTRAINT "roles_church_id_fkey"
    FOREIGN KEY ("church_id") REFERENCES "churches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
