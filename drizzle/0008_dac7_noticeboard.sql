-- DAC7 Noticeboard Model: Remove payment tracking from platform
-- Drops payment tables and financial columns from orders/order_items

-- Step 1: Drop payment tables
DROP TABLE IF EXISTS "payment_proofs";
DROP TABLE IF EXISTS "farmer_payment_methods";

-- Step 2: Drop financial columns from orders
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shipping_cost";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_method";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_required";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "total_amount";

-- Step 3: Drop financial columns from order_items
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "price_per_unit";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "total_price";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "modified_price_per_unit";

-- Step 4: Drop payment enum types (only after columns are dropped)
DROP TYPE IF EXISTS "public"."payment_method";
DROP TYPE IF EXISTS "public"."payment_required";
DROP TYPE IF EXISTS "public"."payment_proof_type";
DROP TYPE IF EXISTS "public"."farmer_payment_type";
