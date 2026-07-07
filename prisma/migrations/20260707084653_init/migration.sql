-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "zipCode" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sighting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesCode" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "sciName" TEXT,
    "photoUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "spottedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sighting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sighting_userId_idx" ON "Sighting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Sighting_userId_speciesCode_key" ON "Sighting"("userId", "speciesCode");

-- AddForeignKey
ALTER TABLE "Sighting" ADD CONSTRAINT "Sighting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
