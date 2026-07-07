-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesCode" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "spottedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Photo_userId_speciesCode_idx" ON "Photo"("userId", "speciesCode");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_speciesCode_fkey" FOREIGN KEY ("userId", "speciesCode") REFERENCES "Sighting"("userId", "speciesCode") ON DELETE RESTRICT ON UPDATE CASCADE;
