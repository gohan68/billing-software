-- This file contains additional tables for Credit Management & WhatsApp Reminders
-- Run this AFTER creating the base tables from create-tables.sql

-- Balances / Credit Sales Table
CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "customerId" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  "invoiceId" UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "paidAmount" DECIMAL(10,2) DEFAULT 0.00,
  "pendingAmount" DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'Pending', -- Pending, Partially Paid, Cleared
  "lastReminderSent" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment History Table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "balanceId" UUID NOT NULL REFERENCES balances(id) ON DELETE CASCADE,
  "paymentAmount" DECIMAL(10,2) NOT NULL,
  "paymentDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "paymentMode" TEXT DEFAULT 'Cash',
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Reminder History Table
CREATE TABLE IF NOT EXISTS whatsapp_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "balanceId" UUID NOT NULL REFERENCES balances(id) ON DELETE CASCADE,
  "customerId" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  "phoneNumber" TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Sent', -- Sent, Delivered, Read, Failed
  "sentAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "readAt" TIMESTAMP WITH TIME ZONE,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Settings Table
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT DEFAULT 'none', -- none, twilio, meta
  "autoRemindersEnabled" BOOLEAN DEFAULT false,
  "reminderFrequencyDays" INTEGER DEFAULT 3,
  
  -- Twilio Settings
  "twilioAccountSid" TEXT,
  "twilioAuthToken" TEXT,
  "twilioPhoneNumber" TEXT,
  
  -- Meta WhatsApp Settings
  "metaAccessToken" TEXT,
  "metaPhoneNumberId" TEXT,
  "metaBusinessAccountId" TEXT,
  
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("companyId")
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_balances_company ON balances("companyId");
CREATE INDEX IF NOT EXISTS idx_balances_customer ON balances("customerId");
CREATE INDEX IF NOT EXISTS idx_balances_status ON balances(status);
CREATE INDEX IF NOT EXISTS idx_balances_pending ON balances("pendingAmount") WHERE "pendingAmount" > 0;
CREATE INDEX IF NOT EXISTS idx_payment_history_balance ON payment_history("balanceId");
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_balance ON whatsapp_reminders("balanceId");
CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_customer ON whatsapp_reminders("customerId");

-- Enable Row Level Security
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations" ON balances;
DROP POLICY IF EXISTS "Allow all operations" ON payment_history;
DROP POLICY IF EXISTS "Allow all operations" ON whatsapp_reminders;
DROP POLICY IF EXISTS "Allow all operations" ON whatsapp_settings;

-- RLS Policies (Allow all for now)
CREATE POLICY "Allow all operations" ON balances FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON payment_history FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON whatsapp_reminders FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON whatsapp_settings FOR ALL USING (true);
