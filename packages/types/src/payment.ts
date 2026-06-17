import { z } from "zod";
import { cuidSchema } from "./common";
import { paymentTypeSchema } from "./enums";

export const paymentSchema = z.object({
  id: cuidSchema,
  jobId: cuidSchema,
  amount: z.number().positive(),
  whtRate: z.number().min(0).max(100).default(0),
  whtAmount: z.number().min(0).default(0),
  netReceived: z.number().nullable().optional(),
  type: paymentTypeSchema,
  paidAt: z.coerce.date(),
  method: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const paymentInputSchema = z.object({
  teamId: cuidSchema,
  jobId: cuidSchema,
  amount: z.number().positive("จำนวนเงินต้องมากกว่า 0"),
  whtRate: z.number().min(0).max(100).default(0),
  type: paymentTypeSchema,
  method: z.string().optional(),
  note: z.string().optional(),
});
export type PaymentInput = z.infer<typeof paymentInputSchema>;
