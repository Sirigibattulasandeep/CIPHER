ALTER TABLE "Finding"
  ADD COLUMN "riskScoreBreakdown" JSONB,
  ADD COLUMN "scoringVersion" TEXT,
  ADD COLUMN "entityKey" TEXT NOT NULL DEFAULT '';
UPDATE "Finding" SET "entityKey" = regexp_replace(lower(trim("affectedEntity")), '\s+', ' ', 'g');
ALTER TABLE "Finding" ALTER COLUMN "entityKey" DROP DEFAULT;

ALTER TABLE "Evidence" ADD COLUMN "protectedRef" TEXT;
ALTER TABLE "RiskAssessment" ADD COLUMN "version" TEXT;
ALTER TABLE "Investigation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OfficialAsset" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Brand_id_organisationId_key" ON "Brand"("id", "organisationId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "OfficialAsset_brandId_type_url_key" ON "OfficialAsset"("brandId", "type", "url");
CREATE INDEX "OfficialAsset_brandId_type_idx" ON "OfficialAsset"("brandId", "type");
DROP INDEX "Brand_organisationId_idx";
CREATE INDEX "Brand_organisationId_industry_idx" ON "Brand"("organisationId", "industry");

ALTER TABLE "Finding" DROP CONSTRAINT "Finding_brandId_fkey";
ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_brandId_organisationId_fkey"
  FOREIGN KEY ("brandId", "organisationId")
  REFERENCES "Brand"("id", "organisationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Finding_organisationId_brandId_status_createdAt_idx"
  ON "Finding"("organisationId", "brandId", "status", "createdAt");
CREATE INDEX "Finding_organisationId_severity_status_idx"
  ON "Finding"("organisationId", "severity", "status");
CREATE INDEX "Finding_organisationId_source_createdAt_idx"
  ON "Finding"("organisationId", "source", "createdAt");
CREATE UNIQUE INDEX "Finding_id_organisationId_key" ON "Finding"("id", "organisationId");
CREATE UNIQUE INDEX "Finding_organisationId_brandId_source_entityKey_key"
  ON "Finding"("organisationId", "brandId", "source", "entityKey");
CREATE UNIQUE INDEX "Investigation_findingId_key" ON "Investigation"("findingId");

CREATE INDEX "MonitoringJob_brandId_status_startedAt_idx" ON "MonitoringJob"("brandId", "status", "startedAt");
CREATE INDEX "Evidence_findingId_capturedAt_idx" ON "Evidence"("findingId", "capturedAt");
CREATE INDEX "Investigation_status_updatedAt_idx" ON "Investigation"("status", "updatedAt");
CREATE INDEX "InvestigationNote_investigationId_createdAt_idx" ON "InvestigationNote"("investigationId", "createdAt");
CREATE INDEX "StatusHistory_findingId_createdAt_idx" ON "StatusHistory"("findingId", "createdAt");
CREATE INDEX "AuditEvent_organisationId_createdAt_idx" ON "AuditEvent"("organisationId", "createdAt");

CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'ANALYST', 'INVESTIGATOR', 'READ_ONLY');
CREATE TABLE "OrganizationMembership" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'ANALYST',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);
INSERT INTO "OrganizationMembership" ("id", "organisationId", "userId", "role", "createdAt")
SELECT 'membership_' || md5("id" || ':' || "organisationId"), "organisationId", "id",
  CASE lower("role")
    WHEN 'owner' THEN 'ADMIN'::"MembershipRole"
    WHEN 'admin' THEN 'ADMIN'::"MembershipRole"
    WHEN 'investigator' THEN 'INVESTIGATOR'::"MembershipRole"
    WHEN 'read_only' THEN 'READ_ONLY'::"MembershipRole"
    ELSE 'ANALYST'::"MembershipRole"
  END, "createdAt"
FROM "User";
ALTER TABLE "User" DROP CONSTRAINT "User_organisationId_fkey";
ALTER TABLE "User" DROP COLUMN "organisationId", DROP COLUMN "role";
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "OrganizationMembership_organisationId_userId_key"
  ON "OrganizationMembership"("organisationId", "userId");
CREATE INDEX "OrganizationMembership_organisationId_role_idx"
  ON "OrganizationMembership"("organisationId", "role");

CREATE TABLE "MonitoringRun" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceMode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
  "recordsAccepted" INTEGER NOT NULL DEFAULT 0,
  "recordsRejected" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "MonitoringRun_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "MonitoringRun" ADD CONSTRAINT "MonitoringRun_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "MonitoringJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "MonitoringRun_jobId_startedAt_idx" ON "MonitoringRun"("jobId", "startedAt");

CREATE TABLE "FalsePositiveFeedback" (
  "id" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FalsePositiveFeedback_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "FalsePositiveFeedback" ADD CONSTRAINT "FalsePositiveFeedback_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "FalsePositiveFeedback_findingId_createdAt_idx" ON "FalsePositiveFeedback"("findingId", "createdAt");

CREATE TABLE "BrandAlias" (
  "id" TEXT NOT NULL, "brandId" TEXT NOT NULL, "value" TEXT NOT NULL,
  "normalized" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandAlias_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BrandKeyword" (
  "id" TEXT NOT NULL, "brandId" TEXT NOT NULL, "value" TEXT NOT NULL,
  "normalized" TEXT NOT NULL, CONSTRAINT "BrandKeyword_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OfficialDomain" (
  "id" TEXT NOT NULL, "brandId" TEXT NOT NULL, "domain" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfficialDomain_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OfficialSocialAccount" (
  "id" TEXT NOT NULL, "brandId" TEXT NOT NULL, "platform" TEXT NOT NULL,
  "handle" TEXT NOT NULL, "profileUrl" TEXT NOT NULL, "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfficialSocialAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OfficialMobileApplication" (
  "id" TEXT NOT NULL, "brandId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "packageId" TEXT NOT NULL, "storeUrl" TEXT, "publisher" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfficialMobileApplication_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BrandAlias" ("id", "brandId", "value", "normalized")
SELECT 'alias_' || md5("id" || ':' || normalized), "id", value, normalized
FROM (
  SELECT DISTINCT ON (b."id", regexp_replace(lower(alias.value), '[^[:alnum:]]', '', 'g'))
    b."id", alias.value, regexp_replace(lower(alias.value), '[^[:alnum:]]', '', 'g') AS normalized
  FROM "Brand" b CROSS JOIN LATERAL jsonb_array_elements_text(b."aliases") AS alias(value)
  WHERE length(regexp_replace(lower(alias.value), '[^[:alnum:]]', '', 'g')) > 0
  ORDER BY b."id", regexp_replace(lower(alias.value), '[^[:alnum:]]', '', 'g'), alias.value
) alias_rows
ON CONFLICT DO NOTHING;
INSERT INTO "BrandKeyword" ("id", "brandId", "value", "normalized")
SELECT 'keyword_' || md5("id" || ':' || normalized), "id", value, normalized
FROM (
  SELECT DISTINCT ON (b."id", regexp_replace(lower(keyword.value), '[^[:alnum:]]', '', 'g'))
    b."id", keyword.value, regexp_replace(lower(keyword.value), '[^[:alnum:]]', '', 'g') AS normalized
  FROM "Brand" b CROSS JOIN LATERAL jsonb_array_elements_text(b."keywords") AS keyword(value)
  WHERE length(regexp_replace(lower(keyword.value), '[^[:alnum:]]', '', 'g')) > 0
  ORDER BY b."id", regexp_replace(lower(keyword.value), '[^[:alnum:]]', '', 'g'), keyword.value
) keyword_rows
ON CONFLICT DO NOTHING;
INSERT INTO "OfficialDomain" ("id", "brandId", "domain")
SELECT 'domain_' || md5("id" || ':' || domain), "id", domain
FROM (
  SELECT DISTINCT ON (b."id", regexp_replace(lower(trim(split_part(split_part(regexp_replace(domain.value, '^https?://', '', 'i'), '/', 1), '?', 1))), '^www\.', ''))
    b."id", regexp_replace(lower(trim(split_part(split_part(regexp_replace(domain.value, '^https?://', '', 'i'), '/', 1), '?', 1))), '^www\.', '') AS domain
  FROM "Brand" b CROSS JOIN LATERAL jsonb_array_elements_text(b."domains") AS domain(value)
  WHERE length(trim(domain.value)) > 0
  ORDER BY b."id", regexp_replace(lower(trim(split_part(split_part(regexp_replace(domain.value, '^https?://', '', 'i'), '/', 1), '?', 1))), '^www\.', '')
) domain_rows
ON CONFLICT DO NOTHING;
INSERT INTO "OfficialSocialAccount" ("id", "brandId", "platform", "handle", "profileUrl")
SELECT 'social_' || md5("id" || ':' || profile), "id", platform,
  CASE WHEN path ~ '^(company|in|user)/' THEN split_part(path, '/', 2) ELSE split_part(path, '/', 1) END,
  profile
FROM (
  SELECT DISTINCT ON (b."id", account.value)
    b."id", account.value AS profile,
    regexp_replace(lower(split_part(regexp_replace(account.value, '^https?://', ''), '/', 1)), '^www\.', '') AS platform,
    trim(both '/' from regexp_replace(account.value, '^https?://[^/]+/', '')) AS path
  FROM "Brand" b CROSS JOIN LATERAL jsonb_array_elements_text(b."socialProfiles") AS account(value)
  WHERE account.value ~ '^https?://[^/]+/.+'
  ORDER BY b."id", account.value
) social_rows
ON CONFLICT DO NOTHING;
INSERT INTO "OfficialMobileApplication" ("id", "brandId", "name", "packageId", "storeUrl", "publisher")
SELECT 'mobile_' || md5("id" || ':' || package_id), "id", name, package_id, store_url, publisher
FROM (
  SELECT DISTINCT ON (b."id", app.value->>'packageId')
    b."id", COALESCE(app.value->>'name', 'Unknown app') AS name, app.value->>'packageId' AS package_id,
    NULLIF(app.value->>'storeUrl', '') AS store_url, NULLIF(app.value->>'publisher', '') AS publisher
  FROM "Brand" b CROSS JOIN LATERAL jsonb_array_elements(b."mobileApplications") AS app(value)
  WHERE NULLIF(app.value->>'packageId', '') IS NOT NULL
  ORDER BY b."id", app.value->>'packageId'
) app_rows
ON CONFLICT DO NOTHING;

ALTER TABLE "BrandAlias" ADD CONSTRAINT "BrandAlias_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandKeyword" ADD CONSTRAINT "BrandKeyword_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficialDomain" ADD CONSTRAINT "OfficialDomain_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficialSocialAccount" ADD CONSTRAINT "OfficialSocialAccount_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficialMobileApplication" ADD CONSTRAINT "OfficialMobileApplication_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "BrandAlias_brandId_normalized_key" ON "BrandAlias"("brandId", "normalized");
CREATE UNIQUE INDEX "BrandKeyword_brandId_normalized_key" ON "BrandKeyword"("brandId", "normalized");
CREATE UNIQUE INDEX "OfficialDomain_brandId_domain_key" ON "OfficialDomain"("brandId", "domain");
CREATE INDEX "OfficialDomain_domain_idx" ON "OfficialDomain"("domain");
CREATE UNIQUE INDEX "OfficialSocialAccount_brandId_profileUrl_key" ON "OfficialSocialAccount"("brandId", "profileUrl");
CREATE INDEX "OfficialSocialAccount_platform_handle_idx" ON "OfficialSocialAccount"("platform", "handle");
CREATE UNIQUE INDEX "OfficialMobileApplication_brandId_packageId_key" ON "OfficialMobileApplication"("brandId", "packageId");
CREATE INDEX "OfficialMobileApplication_packageId_idx" ON "OfficialMobileApplication"("packageId");
