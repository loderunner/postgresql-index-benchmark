-- CreateTable
CREATE TABLE "Baz" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "fooId" INTEGER NOT NULL,

    CONSTRAINT "Baz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Baz_fooId_idx" ON "Baz"("fooId");

-- AddForeignKey
ALTER TABLE "Baz" ADD CONSTRAINT "Baz_fooId_fkey" FOREIGN KEY ("fooId") REFERENCES "Foo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
