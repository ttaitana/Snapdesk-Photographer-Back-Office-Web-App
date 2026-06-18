import { z } from "zod";
import { cuidSchema } from "./common";

/** A single line item shown on a quotation PDF/package card, e.g. "ช่างภาพ 1 คน". */
export const packageItemSchema = z.string().min(1);

export const packageSchema = z.object({
  id: cuidSchema,
  teamId: cuidSchema,
  name: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string().nullable().optional(),
  items: z.array(packageItemSchema).nullable().optional(),
  createdAt: z.coerce.date(),
});
export type Package = z.infer<typeof packageSchema>;

export const packageInputSchema = z.object({
  teamId: cuidSchema,
  name: z.string().min(1, "กรุณากรอกชื่อแพ็กเกจ"),
  price: z.number().nonnegative("ราคาต้องไม่ติดลบ").default(0),
  description: z.string().optional(),
  items: z.array(packageItemSchema).optional(),
});
export type PackageInput = z.infer<typeof packageInputSchema>;

export const updatePackageInputSchema = packageInputSchema.partial().extend({
  id: cuidSchema,
  teamId: cuidSchema,
});
export type UpdatePackageInput = z.infer<typeof updatePackageInputSchema>;
