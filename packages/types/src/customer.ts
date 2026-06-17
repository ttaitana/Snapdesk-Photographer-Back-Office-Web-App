import { z } from "zod";
import { cuidSchema } from "./common";

export const customerSchema = z.object({
  id: cuidSchema,
  teamId: cuidSchema,
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  lineId: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});
export type Customer = z.infer<typeof customerSchema>;

export const customerInputSchema = z.object({
  teamId: cuidSchema,
  name: z.string().min(1, "กรุณากรอกชื่อลูกค้า"),
  phone: z.string().optional(),
  email: z.string().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  lineId: z.string().optional(),
  channel: z.string().optional(),
  note: z.string().optional(),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export const updateCustomerInputSchema = customerInputSchema.partial().extend({
  id: cuidSchema,
  teamId: cuidSchema,
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;
