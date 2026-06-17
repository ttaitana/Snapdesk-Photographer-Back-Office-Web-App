import { z } from "zod";

export const cuidSchema = z.string().min(1, "required");

/** Every team-scoped row must carry teamId — see SPEC.md §4 security note. */
export const teamScopedSchema = z.object({
  teamId: cuidSchema,
});

export const paginationInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationInputSchema>;

export function paginatedResult<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  });
}

export const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
export type DateRange = z.infer<typeof dateRangeSchema>;
