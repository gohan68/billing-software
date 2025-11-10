-- =====================================================
-- SQL Script to Disable GST (Keep Columns, Set to Zero)
-- =====================================================
-- Run this in Supabase SQL Editor to keep GST columns but disable GST
-- 
-- This is a SAFER option that preserves your database structure
-- while setting all GST values to zero for future entries
-- =====================================================

-- 1. Update existing invoices - set all GST amounts to 0 and totalAmount = subtotal
UPDATE invoices 
SET 
  "taxAmount" = 0,
  "cgstAmount" = 0,
  "sgstAmount" = 0,
  "igstAmount" = 0,
  "totalAmount" = subtotal;

-- 2. Update existing invoice items - remove tax calculations
UPDATE invoice_items 
SET 
  "taxRate" = 0,
  "taxAmount" = 0,
  "lineTotal" = quantity * "unitPrice";

-- 3. Update products - set all tax rates to 0
UPDATE products 
SET "taxRate" = 0;

-- 4. Change default tax rate for new products to 0
ALTER TABLE products 
ALTER COLUMN "taxRate" SET DEFAULT 0.00;

-- 5. Make GST fields optional (allow NULL or empty)
ALTER TABLE companies 
ALTER COLUMN gstin DROP NOT NULL;

ALTER TABLE customers 
ALTER COLUMN gstin DROP NOT NULL;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if all invoices have zero GST
-- SELECT COUNT(*) as invoices_with_gst 
-- FROM invoices 
-- WHERE "taxAmount" > 0 OR "cgstAmount" > 0 OR "sgstAmount" > 0 OR "igstAmount" > 0;

-- Check if all products have zero tax rate
-- SELECT COUNT(*) as products_with_tax 
-- FROM products 
-- WHERE "taxRate" > 0;

-- =====================================================
-- DONE!
-- =====================================================
-- After running this script:
-- 1. All existing GST amounts are set to zero
-- 2. Future entries will have zero GST by default
-- 3. Database structure remains intact (columns preserved)
-- 4. You can re-enable GST later if needed
-- =====================================================
