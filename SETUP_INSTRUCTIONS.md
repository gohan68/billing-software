# BillMaster - Setup Instructions

## 🎯 Quick Start Guide

Your BillMaster POS & Invoicing app is ready! Just one more step to complete the setup.

### Step 1: Create Database Tables in Supabase

1. **Open your Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `zlfbgxapqyhdgupjbvwr`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Setup SQL**
   - Copy the entire content from `/app/create-tables.sql` file
   - Paste it into the SQL Editor
   - Click "Run" button

4. **Verify Tables Created**
   - Go to "Table Editor" in the sidebar
   - You should see these tables:
     - ✅ companies
     - ✅ products
     - ✅ customers
     - ✅ invoices
     - ✅ invoice_items
     - ✅ users

### Step 2: Access Your App

Once tables are created, your app is ready!

**URL:** http://localhost:3000

## 📱 App Features

### ✨ First Time Setup
- Company profile creation (name, GSTIN, address, state)
- One-time setup wizard

### 🛒 POS / Billing Screen
- Fast product search (by name or SKU)
- Add products to cart with quantity
- Select customer (or walk-in)
- **Automatic GST Calculation:**
  - Same state → CGST + SGST
  - Different state → IGST
- Multiple payment modes (Cash, UPI, Card, Credit)
- Save invoice with auto-generated invoice number

### 📦 Product Management
- Add products with SKU, HSN, price, tax rate, stock
- View all products in table
- Track stock levels
- Tax rate per product

### 👥 Customer Management
- Add customers with name, phone, GSTIN, address, state
- Customer selection in POS
- State-based GST calculation

### 🧾 Invoice Management
- View all invoices
- Download GST-compliant PDF invoices
- Invoice details:
  - Company header with GSTIN
  - Customer details
  - Line items with HSN, quantity, rate, tax
  - CGST/SGST or IGST breakup
  - Payment mode and status

### 📊 Reports & Dashboard
- Today's sales total
- Total invoices count
- Products and customers count
- GST summary reports (coming soon)

## 🔧 Technical Details

**Database:** Supabase (PostgreSQL)
**Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui
**PDF Generation:** jsPDF
**Authentication:** Ready for implementation

## 🎯 GST Calculation Logic

The app automatically calculates GST based on company and customer states:

**Intra-State (Same State):**
- CGST = Tax / 2
- SGST = Tax / 2
- IGST = 0

**Inter-State (Different State):**
- IGST = Full Tax
- CGST = 0
- SGST = 0

## 📝 Sample Data Flow

1. **Setup Company** → Set your business state (e.g., Karnataka)
2. **Add Products** → Set tax rate (e.g., 18%)
3. **Add Customers** → Set customer state
4. **Create Invoice:**
   - Select customer (Karnataka) → CGST 9% + SGST 9%
   - Select customer (Tamil Nadu) → IGST 18%
5. **Download PDF** → GST-compliant invoice

## 🚀 Next Steps After Setup

1. ✅ Complete company profile
2. ✅ Add your products (or import CSV - feature coming)
3. ✅ Add regular customers
4. ✅ Start billing!

## 🐛 Troubleshooting

**Issue:** App shows "Loading..." forever
**Solution:** Make sure you ran the SQL script in Supabase

**Issue:** API errors in console
**Solution:** Check that all Supabase credentials are correct in `.env`

**Issue:** Can't create invoice
**Solution:** Ensure company setup is complete and products exist

## 📞 Support

For any issues, check the browser console (F12) for error messages.

---

**Happy Billing! 🎉**
