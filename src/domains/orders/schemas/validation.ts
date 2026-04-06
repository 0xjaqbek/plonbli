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
  modifiedPricePerUnit: z.coerce.number().nonnegative().optional(),
});

export const modifyOrderSchema = z.object({
  orderId: z.string().min(1),
  items: z.array(modifyItemSchema).optional(),
  shippingCost: z.coerce.number().nonnegative().optional(),
  paymentRequired: z.enum(["PREPAID", "ON_PICKUP"]),
  farmerNote: z.string().max(2000).optional(),
  pickupSlotIds: z.array(z.string()).optional(),
});

export type ModifyOrderInput = z.infer<typeof modifyOrderSchema>;

export const submitPaymentProofSchema = z
  .object({
    orderId: z.string().min(1),
    type: z.enum(["SCREENSHOT", "BANK_TRANSFER", "BLOCKCHAIN_LINK"]),
    imageUrl: z.string().url().optional(),
    transactionUrl: z.string().url().optional(),
    description: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "SCREENSHOT") return !!data.imageUrl;
      if (data.type === "BLOCKCHAIN_LINK") return !!data.transactionUrl;
      if (data.type === "BANK_TRANSFER") return !!data.imageUrl || !!data.transactionUrl;
      return true;
    },
    { message: "Wymagany dowod platnosci", path: ["imageUrl"] },
  );

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;

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

export const farmerPaymentMethodSchema = z.object({
  type: z.enum(["BLIK", "TRANSFER", "CRYPTO"]),
  label: z.string().min(1).max(100),
  details: z.string().min(1).max(500),
  isDefault: z.boolean().optional(),
});

export type FarmerPaymentMethodInput = z.infer<typeof farmerPaymentMethodSchema>;

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
