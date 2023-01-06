-- CreateTable
CREATE TABLE "Foo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Foo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bar" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "fooId" INTEGER NOT NULL,

    CONSTRAINT "Bar_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Bar" ADD CONSTRAINT "Bar_fooId_fkey" FOREIGN KEY ("fooId") REFERENCES "Foo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
