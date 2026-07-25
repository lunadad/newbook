import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { books, vendorTodayBook, vendorNewRelease, vendorBestseller, type Vendor } from "@/db/schema";

export { VENDORS, VENDOR_LABEL } from "@/lib/vendors";

export async function getTodayBooksByVendor(vendor: Vendor) {
  return db
    .select({
      slotNo: vendorTodayBook.slotNo,
      comment: vendorTodayBook.comment,
      periodLabel: vendorTodayBook.periodLabel,
      sourceUrl: vendorTodayBook.sourceUrl,
      title: books.title,
      author: books.author,
      publisher: books.publisher,
      coverImageUrl: books.coverSourceUrl,
    })
    .from(vendorTodayBook)
    .innerJoin(books, eq(vendorTodayBook.bookId, books.id))
    .where(eq(vendorTodayBook.vendor, vendor))
    .orderBy(asc(vendorTodayBook.slotNo));
}

export async function getNewReleasesByVendor(vendor: Vendor) {
  return db
    .select({
      rank: vendorNewRelease.rank,
      categoryLabel: vendorNewRelease.categoryLabel,
      sourceUrl: vendorNewRelease.sourceUrl,
      title: books.title,
      author: books.author,
      publisher: books.publisher,
      price: books.price,
      coverImageUrl: books.coverSourceUrl,
    })
    .from(vendorNewRelease)
    .innerJoin(books, eq(vendorNewRelease.bookId, books.id))
    .where(eq(vendorNewRelease.vendor, vendor))
    .orderBy(asc(vendorNewRelease.rank));
}

export async function getBestsellersByVendor(vendor: Vendor) {
  return db
    .select({
      rank: vendorBestseller.rank,
      sourceUrl: vendorBestseller.sourceUrl,
      title: books.title,
      author: books.author,
      publisher: books.publisher,
      price: books.price,
      coverImageUrl: books.coverSourceUrl,
    })
    .from(vendorBestseller)
    .innerJoin(books, eq(vendorBestseller.bookId, books.id))
    .where(eq(vendorBestseller.vendor, vendor))
    .orderBy(asc(vendorBestseller.rank));
}
