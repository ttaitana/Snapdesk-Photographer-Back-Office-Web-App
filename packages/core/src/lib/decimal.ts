// Shared Decimal <-> number conversion for the jobs/payments services.
//
// Prisma's `Decimal` (from @prisma/client, re-exported by @snapdesk/db) is
// used for every money column to avoid floating-point drift on currency.
// @snapdesk/types' zod schemas use plain `number`, so the service layer
// converts at this single boundary rather than leaking Decimal into the
// rest of the app.

/** Anything with a `.toNumber()` method — Prisma.Decimal satisfies this. */
interface Decimalish {
  toNumber(): number;
}

export function decimalToNumber(value: Decimalish): number {
  return value.toNumber();
}

export function nullableDecimalToNumber(value: Decimalish | null): number | null {
  return value === null ? null : value.toNumber();
}
