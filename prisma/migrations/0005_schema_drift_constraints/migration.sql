ALTER TABLE "Investigation" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResponseAction" ADD CONSTRAINT "ResponseAction_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
