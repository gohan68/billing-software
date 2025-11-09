# BillMaster - Credit Management & WhatsApp Reminders Setup

## 🆕 New Features Added

This guide covers the setup and usage of the newly added features:
1. **Balance (Credit) Management System**
2. **WhatsApp Payment Reminder Automation**

## 📋 Prerequisites

Before setting up the new features, make sure you have:
- ✅ Completed the base BillMaster setup (company profile, products, customers)
- ✅ Run the base SQL script (`create-tables.sql`) in Supabase
- ✅ Supabase project is working correctly

## 🗄️ Database Setup for New Features

### Step 1: Run Additional Database Tables

1. Open your **Supabase Dashboard**: https://supabase.com/dashboard/project/zlfbgxapqyhdgupjbvwr
2. Navigate to **SQL Editor**
3. Click "New Query"
4. Copy the content from `/app/create-tables-update.sql`
5. Paste and click **Run**

This will create the following new tables:
- `balances` - Track credit sales and pending payments
- `payment_history` - Record of all payments made
- `whatsapp_reminders` - Log of WhatsApp reminders sent
- `whatsapp_settings` - Configuration for WhatsApp integration

## 💳 Credit Management Feature

### How It Works

1. **Creating a Credit Sale:**
   - In the POS screen, add items to cart
   - Select a customer (required for credit sales)
   - Choose **"Credit"** as payment mode
   - Click "Save Invoice"
   - A balance record is automatically created

2. **Viewing Pending Balances:**
   - Click **"Balance Due"** in the navigation
   - See all customers with pending payments
   - View total, paid, and pending amounts
   - Check last reminder sent date

3. **Recording Payments:**
   - Click **"Record Payment"** on any balance
   - Enter the payment amount (partial or full)
   - Select payment mode (Cash, UPI, Card, Bank Transfer)
   - Add optional notes
   - Click "Record Payment"
   - Balance status updates automatically:
     - **Pending**: No payment made
     - **Partially Paid**: Some payment received
     - **Cleared**: Fully paid

## 📱 WhatsApp Integration Setup

BillMaster supports **two WhatsApp providers**. Choose the one that works best for you:

### Option 1: Twilio WhatsApp API (Easier Setup, Paid)

#### Step-by-Step Setup:

1. **Create Twilio Account:**
   - Visit https://www.twilio.com/try-twilio
   - Sign up for a free account (includes trial credits)
   - Complete phone verification

2. **Get WhatsApp Sandbox (for testing):**
   - Go to Twilio Console → Messaging → Try it Out → Send a WhatsApp message
   - Follow instructions to connect your WhatsApp
   - Or get a production WhatsApp number (requires business verification)

3. **Get Your Credentials:**
   - **Account SID**: Found on Twilio Console Dashboard
   - **Auth Token**: Found on Dashboard (click "Show" to reveal)
   - **Phone Number**: Your Twilio WhatsApp number (format: +1234567890)

4. **Configure in BillMaster:**
   - Go to **Settings** page
   - Select **"Twilio WhatsApp API"** as provider
   - Enter your Account SID
   - Enter your Auth Token
   - Enter your Twilio Phone Number (with +)
   - Enable "Automatic Payment Reminders" if desired
   - Set reminder frequency (e.g., 3 days)
   - Click "Save Settings"

#### Pricing:
- Twilio charges per message sent
- Check current rates at https://www.twilio.com/whatsapp/pricing
- Typical cost: $0.005 - $0.02 per message

---

### Option 2: Meta WhatsApp Cloud API (Free Tier, More Setup)

#### Step-by-Step Setup:

1. **Create Meta Developer Account:**
   - Visit https://developers.facebook.com/
   - Log in with Facebook account
   - Enable two-factor authentication (required)

2. **Create a Meta App:**
   - Go to https://developers.facebook.com/apps
   - Click "Create App"
   - Choose "Business" as app type
   - Give your app a name (e.g., "BillMaster Reminders")
   - Click "Create App"

3. **Add WhatsApp Product:**
   - In your app dashboard, find "Add Products"
   - Click "Set Up" on WhatsApp
   - You'll get a test phone number automatically

4. **Get Permanent Access Token:**
   - Go to Business Settings (link in app dashboard)
   - Click "System Users" → "Add"
   - Create a system user with Admin role
   - Click "Generate Token"
   - Select your app
   - Enable permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Copy the token (this is your **Access Token**)

5. **Get Phone Number ID:**
   - In WhatsApp product settings
   - Under "API Setup", you'll see "Phone number ID"
   - Copy this number

6. **Get Business Account ID:**
   - In WhatsApp product settings
   - Look for "WhatsApp Business Account ID"
   - Copy this ID

7. **Configure in BillMaster:**
   - Go to **Settings** page
   - Select **"Meta WhatsApp Cloud API"** as provider
   - Enter your Access Token
   - Enter your Phone Number ID
   - Enter your Business Account ID
   - Enable "Automatic Payment Reminders" if desired
   - Set reminder frequency (e.g., 3 days)
   - Click "Save Settings"

#### Pricing:
- Free for first 1,000 conversations per month
- After that: ~$0.005 - $0.02 per conversation
- Check current rates: https://developers.facebook.com/docs/whatsapp/pricing

---

## 🤖 Using WhatsApp Reminders

### Manual Reminders

1. Go to **"Balance Due"** page
2. Find the customer with pending balance
3. Click **"Send Reminder"** button
4. Reminder is sent immediately via WhatsApp
5. Check reminder history in the balance details

### Automated Reminders

When enabled, the system automatically:
- Checks for pending balances every day
- Sends reminders based on your frequency setting (e.g., every 3 days)
- Skips customers who received a reminder recently
- Logs all reminder activity

**To Enable:**
1. Go to **Settings** page
2. Configure your WhatsApp provider
3. Check "Enable Automatic Payment Reminders"
4. Set frequency (e.g., 3 days)
5. Save settings

**Reminder Message Format:**
```
Hi [Customer Name],

Payment Reminder from [Your Business]

Invoice: INV-001
Pending Amount: ₹500.00

Please clear your payment. Thank you!
```

### Triggering Auto-Reminders Manually

You can also manually trigger the auto-reminder system:
- Use the "Send Auto Reminders" API endpoint: `/api/balances/send-auto-reminders`
- Or set up a cron job to call this endpoint daily

## 📊 Tracking & Reports

### Balance Dashboard
- **Total Pending Amount**: Sum of all unpaid balances
- **Customers with Pending Payments**: Count of customers
- **Payment History**: Track when payments were received
- **Reminder History**: See all WhatsApp reminders sent

### Invoice Status
- Invoices with "Credit" payment mode show status as "Pending"
- Once balance is cleared, invoice status updates to "Paid"

## 🔒 Security Best Practices

1. **Protect API Credentials:**
   - Never share your Twilio Auth Token or Meta Access Token
   - Store them securely in the Settings page
   - Tokens are stored in Supabase and not visible in frontend

2. **Customer Privacy:**
   - Only send reminders to customers who provided consent
   - Ensure phone numbers are correct and up-to-date
   - Follow WhatsApp's messaging policies

3. **Rate Limiting:**
   - Twilio: Check your account limits
   - Meta: Stay within free tier limits (1,000/month)
   - Don't spam customers with too many reminders

## 🐛 Troubleshooting

### "WhatsApp not configured" Error
**Solution:** Go to Settings and configure your WhatsApp provider with valid credentials.

### Reminder not sending
**Check:**
1. Is WhatsApp provider set correctly in Settings?
2. Are all credentials entered correctly?
3. Is the customer's phone number in correct format (+country code)?
4. For Twilio: Is your account active with sufficient balance?
5. For Meta: Is your access token still valid?

### Customer not receiving messages
**Check:**
1. Phone number format must include country code (e.g., +919876543210)
2. Customer must have WhatsApp installed on that number
3. For Twilio sandbox: Customer must have sent "join [sandbox-name]" first
4. Check reminder history for error messages

### Balance not created for Credit sales
**Check:**
1. Customer must be selected (not walk-in)
2. Payment mode must be exactly "Credit"
3. Check browser console for errors
4. Verify `balances` table exists in Supabase

## 📞 Support & Further Help

### Twilio Support:
- Documentation: https://www.twilio.com/docs/whatsapp
- Support: https://support.twilio.com

### Meta WhatsApp Support:
- Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
- Community: https://developers.facebook.com/community/

### BillMaster Issues:
- Check browser console (F12) for errors
- Verify Supabase connection
- Ensure all tables are created correctly

---

## 🎉 You're All Set!

Your BillMaster now has:
- ✅ Credit/Balance tracking
- ✅ WhatsApp payment reminders
- ✅ Automated reminder system
- ✅ Payment history tracking

Start creating credit sales and let the system help you collect payments efficiently!
