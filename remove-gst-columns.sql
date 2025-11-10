-- =====================================================
-- SQL Script to Remove GST Columns from BillMaster
-- =====================================================
-- Run this in Supabase SQL Editor to remove all GST-related columns
-- 
-- IMPORTANT: Backup your data before running these commands!
-- These changes are IRREVERSIBLE and will permanently delete GST data.
-- =====================================================

-- 1. Remove GST columns from companies table
ALTER TABLE companies DROP COLUMN IF EXISTS gstin;

-- 2. Remove GST columns from customers table  
ALTER TABLE customers DROP COLUMN IF EXISTS gstin;

-- 3. Remove tax-related columns from products table
ALTER TABLE products DROP COLUMN IF EXISTS "taxRate";
ALTER TABLE products DROP COLUMN IF EXISTS hsn;

-- 4. Remove GST columns from invoices table
ALTER TABLE invoices DROP COLUMN IF EXISTS "taxAmount";
ALTER TABLE invoices DROP COLUMN IF EXISTS "cgstAmount";
ALTER TABLE invoices DROP COLUMN IF EXISTS "sgstAmount";
ALTER TABLE invoices DROP COLUMN IF EXISTS "igstAmount";

-- Note: We keep 'subtotal' and 'totalAmount' as they represent the actual amounts
-- After removing tax columns, subtotal = totalAmount (no tax calculation)

-- 5. Remove tax-related columns from invoice_items table
ALTER TABLE invoice_items DROP COLUMN IF EXISTS "taxRate";
ALTER TABLE invoice_items DROP COLUMN IF EXISTS "taxAmount";
ALTER TABLE invoice_items DROP COLUMN IF EXISTS hsn;

-- Note: lineTotal will now be equal to (quantity * unitPrice) without any tax

-- =====================================================
-- Optional: Update existing data to reflect no-GST structure
-- =====================================================

-- Update existing invoices: set totalAmount = subtotal (if not already equal)
-- This ensures old invoices show correct amounts without GST breakdown
UPDATE invoices 
SET "totalAmount" = subtotal 
WHERE "totalAmount" != subtotal;

-- Update existing invoice items: set lineTotal = (quantity * unitPrice)
UPDATE invoice_items 
SET "lineTotal" = quantity * "unitPrice";

-- =====================================================
-- Verification Queries (Run these to check the changes)
-- =====================================================

-- Check companies table structure
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'companies';

-- Check products table structure
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'products';

-- Check invoices table structure
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'invoices';

-- Check invoice_items table structure
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'invoice_items';

-- =====================================================
-- DONE!
-- =====================================================
-- After running this script:
-- 1. Your database will no longer have GST-related columns
-- 2. All invoices will show final prices without tax breakdown
-- 3. The application will work with simplified billing (no GST)
-- =====================================================
