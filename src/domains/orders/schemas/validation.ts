import { z } from "zod";

export const addToCartSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().positive("Ilosc musi byc wieksza od 0"),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const createOrderSchema = z
  .object({
    farmerId: z.string().min(1),
    deliveryMethod: z.enum(["PICKUP", "DELIVERY", "DROP_POINT"]),
    deliveryAddress: z.string().optional(),
    pickupSlotId: z.string().optional(),
    customerNote: z.string().max(2000).optional(),
  })
  .refine(
    (data) => {
      if (data.deliveryMethod === "DELIVERY") return !!data.deliveryAddress;
      return true;
    },
    { message: "Adres dostawy jest wymagany", path: ["deliveryAddress"] },
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const modifyItemSchema = z.object({
  orderItemId: z.string().min(1),
  modifiedQuantity: z.coerce.number().nonnegative().optional(),
});

export const modifyOrderSchema = z.object({
  orderId: z.string().min(1),
  items: z.array(modifyItemSchema).optional(),
  farmerNote: z.string().max(2000).optional(),
  pickupSlotIds: z.array(z.string()).optional(),
});

export type ModifyOrderInput = z.infer<typeof modifyOrderSchema>;

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().max(2000).optional(),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PREPARING", "READY_FOR_PICKUP"]),
  note: z.string().max(2000).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const shippingInfoSchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().min(1, "Numer przesylki jest wymagany"),
  trackingUrl: z.string().url().optional(),
});

export type ShippingInfoInput = z.infer<typeof shippingInfoSchema>;

export const pickupSlotSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    specificDate: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  })
  .refine(
    (data) => data.dayOfWeek !== undefined || data.specificDate !== undefined,
    { message: "Wymagany dzien tygodnia lub konkretna data" },
  );

export type PickupSlotInput = z.infer<typeof pickupSlotSchema>;
