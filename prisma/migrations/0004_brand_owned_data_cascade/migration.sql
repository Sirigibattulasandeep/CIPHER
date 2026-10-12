ALTER TABLE "OfficialAsset" DROP CONSTRAINT "OfficialAsset_brandId_fkey";
ALTER TABLE "OfficialAsset" ADD CONSTRAINT "OfficialAsset_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitoringConfiguration" DROP CONSTRAINT "MonitoringConfiguration_brandId_fkey";
ALTER TABLE "MonitoringConfiguration" ADD CONSTRAINT "MonitoringConfiguration_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonitoringJob" ADD CONSTRAINT "MonitoringJob_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
