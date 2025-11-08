-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gstin TEXT,
  address TEXT,
  city TEXT,
  state TEXT NOT NULL,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  hsn TEXT,
  description TEXT,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "purchasePrice" DECIMAL(10,2),
  stock INTEGER DEFAULT 0,
  "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  barcode TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("companyId", sku)
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  "outstandingBalance" DECIMAL(10,2) DEFAULT 0.00,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "customerId" UUID REFERENCES customers(id) ON DELETE SET NULL,
  "invoiceNo" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(10,2) NOT NULL,
  "taxAmount" DECIMAL(10,2) NOT NULL,
  "cgstAmount" DECIMAL(10,2) DEFAULT 0.00,
  "sgstAmount" DECIMAL(10,2) DEFAULT 0.00,
  "igstAmount" DECIMAL(10,2) DEFAULT 0.00,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "paymentMode" TEXT DEFAULT 'Cash',
  status TEXT DEFAULT 'Paid',
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("companyId", "invoiceNo")
);

-- Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceId" UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  "productId" UUID REFERENCES products(id) ON DELETE SET NULL,
  "productName" TEXT NOT NULL,
  hsn TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "taxRate" DECIMAL(5,2) NOT NULL,
  "taxAmount" DECIMAL(10,2) NOT NULL,
  "lineTotal" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_company ON products("companyId");
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers("companyId");
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices("companyId");
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices("invoiceDate" DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items("invoiceId");

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations" ON companies;
DROP POLICY IF EXISTS "Allow all operations" ON products;
DROP POLICY IF EXISTS "Allow all operations" ON customers;
DROP POLICY IF EXISTS "Allow all operations" ON invoices;
DROP POLICY IF EXISTS "Allow all operations" ON invoice_items;
DROP POLICY IF EXISTS "Allow all operations" ON users;

-- RLS Policies (Allow all for now)
CREATE POLICY "Allow all operations" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON invoice_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true);
