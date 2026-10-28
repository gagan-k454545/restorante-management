import { z } from 'zod';

export const orderLineItemSchema = z.object({
  itemId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  modifierOptionIds: z.array(z.string().uuid()).default([]),
  qty: z.number().int().min(1).max(20),
  note: z.string().max(140).optional(),
  isAllergyNote: z.boolean().default(false),
});

export const placeOrderSchema = z.object({
  items: z.array(orderLineItemSchema).min(1).max(50),
  orderNote: z.string().max(200).optional(),
  guestName: z.string().max(100).optional(),
  expectedSubtotal: z.number().int().nonnegative().optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type OrderLineItemInput = z.infer<typeof orderLineItemSchema>;
