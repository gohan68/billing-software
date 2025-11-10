import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase.js'
import { WhatsAppClient } from '../../../lib/whatsapp.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Helper: Calculate GST based on states
function calculateGST(subtotal, taxRate, companyState, customerState) {
  const taxAmount = (subtotal * taxRate) / 100
  
  if (companyState && customerState && companyState.toLowerCase() === customerState.toLowerCase()) {
    return {
      taxAmount,
      cgstAmount: taxAmount / 2,
      sgstAmount: taxAmount / 2,
      igstAmount: 0,
      taxType: 'CGST+SGST'
    }
  }
  
  return {
    taxAmount,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: taxAmount,
    taxType: 'IGST'
  }
}

// Route handler
export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url)
  const path = pathname.replace('/api/', '')

  try {
    // Health check
    if (path === 'health') {
      return NextResponse.json({ status: 'ok', database: 'supabase' })
    }

    // Get SQL setup script
    if (path === 'setup-sql') {
      const fs = require('fs')
      try {
        const sql = fs.readFileSync('/app/create-tables.sql', 'utf-8')
        return new NextResponse(sql, {
          headers: {
            'Content-Type': 'text/plain',
          },
        })
      } catch (error) {
        return NextResponse.json({ error: 'SQL file not found' }, { status: 404 })
      }
    }

    // Get all companies
    if (path === 'companies') {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('createdAt', { ascending: false })
      
      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Get all products
    if (path === 'products') {
      const companyId = searchParams.get('companyId')
      let query = supabase.from('products').select('*')
      
      if (companyId) {
        query = query.eq('companyId', companyId)
      }
      
      query = query.eq('isActive', true).order('name', { ascending: true })
      
      const { data, error } = await query
      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Get all customers
    if (path === 'customers') {
      const companyId = searchParams.get('companyId')
      let query = supabase.from('customers').select('*')
      
      if (companyId) {
        query = query.eq('companyId', companyId)
      }
      
      query = query.order('name', { ascending: true })
      
      const { data, error } = await query
      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Get all invoices
    if (path === 'invoices') {
      const companyId = searchParams.get('companyId')
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers (name, phone, gstin)
        `)
      
      if (companyId) {
        query = query.eq('companyId', companyId)
      }
      
      query = query.order('invoiceDate', { ascending: false }).limit(100)
      
      const { data, error } = await query
      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Get invoice details with items
    if (path.startsWith('invoices/')) {
      const invoiceId = path.split('/')[1]
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (*),
          companies (*)
        `)
        .eq('id', invoiceId)
        .single()
      
      if (invoiceError) throw invoiceError
      
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoiceId', invoiceId)
        .order('createdAt', { ascending: true })
      
      if (itemsError) throw itemsError
      
      return NextResponse.json({ ...invoice, items })
    }

    // Dashboard stats
    if (path === 'dashboard/stats') {
      const companyId = searchParams.get('companyId')
      
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
      }
      
      // Get today's sales
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: todaySales, error: salesError } = await supabase
        .from('invoices')
        .select('totalAmount')
        .eq('companyId', companyId)
        .gte('invoiceDate', today.toISOString())
      
      const todayTotal = todaySales?.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0) || 0
      
      // Get total invoices count
      const { count: invoiceCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', companyId)
      
      // Get products count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', companyId)
        .eq('isActive', true)
      
      // Get customers count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', companyId)
      
      return NextResponse.json({
        todaySales: todayTotal.toFixed(2),
        totalInvoices: invoiceCount || 0,
        totalProducts: productCount || 0,
        totalCustomers: customerCount || 0
      })
    }

    // Reports - GST Summary
    if (path === 'reports/gst') {
      const companyId = searchParams.get('companyId')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      
      let query = supabase
        .from('invoices')
        .select('cgstAmount, sgstAmount, igstAmount, totalAmount')
        .eq('companyId', companyId)
      
      if (startDate) query = query.gte('invoiceDate', startDate)
      if (endDate) query = query.lte('invoiceDate', endDate)
      
      const { data, error } = await query
      if (error) throw error
      
      const summary = data.reduce((acc, inv) => ({
        cgst: acc.cgst + parseFloat(inv.cgstAmount || 0),
        sgst: acc.sgst + parseFloat(inv.sgstAmount || 0),
        igst: acc.igst + parseFloat(inv.igstAmount || 0),
        total: acc.total + parseFloat(inv.totalAmount || 0)
      }), { cgst: 0, sgst: 0, igst: 0, total: 0 })
      
      return NextResponse.json(summary)
    }

    // Get all balances (credit sales)
    if (path === 'balances') {
      const companyId = searchParams.get('companyId')
      let query = supabase
        .from('balances')
        .select(`
          *,
          customers (name, phone, address, city, state, pincode),
          invoices (invoiceNo, invoiceDate)
        `)
      
      if (companyId) {
        query = query.eq('companyId', companyId)
      }
      
      query = query.order('createdAt', { ascending: false })
      
      const { data, error } = await query
      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Get balance by ID with details
    if (path.startsWith('balances/') && path.split('/').length === 2) {
      const balanceId = path.split('/')[1]
      
      const { data: balance, error: balanceError } = await supabase
        .from('balances')
        .select(`
          *,
          customers (*),
          invoices (*)
        `)
        .eq('id', balanceId)
        .single()
      
      if (balanceError) throw balanceError
      
      // Get payment history
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_history')
        .select('*')
        .eq('balanceId', balanceId)
        .order('paymentDate', { ascending: false })
      
      if (paymentsError) throw paymentsError
      
      // Get reminder history
      const { data: reminders, error: remindersError } = await supabase
        .from('whatsapp_reminders')
        .select('*')
        .eq('balanceId', balanceId)
        .order('sentAt', { ascending: false })
      
      if (remindersError) throw remindersError
      
      return NextResponse.json({ ...balance, payments, reminders })
    }

    // Get customer balances
    if (path.startsWith('balances/customer/')) {
      const customerId = path.split('/')[2]
      
      const { data, error } = await supabase
        .from('balances')
        .select(`
          *,
          invoices (invoiceNo, invoiceDate)
        `)
        .eq('customerId', customerId)
        .order('createdAt', { ascending: false })
      
      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Get WhatsApp settings
    if (path === 'whatsapp-settings') {
      const companyId = searchParams.get('companyId')
      
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
      }
      
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('companyId', companyId)
        .single()
      
      if (error && error.code === 'PGRST116') {
        // No settings found, return defaults
        return NextResponse.json({
          provider: 'none',
          autoRemindersEnabled: false,
          reminderFrequencyDays: 3
        })
      }
      
      if (error) throw error
      
      // Don't send sensitive credentials to frontend
      const { twilioAuthToken, metaAccessToken, ...safeSettings } = data
      safeSettings.twilioConfigured = !!twilioAuthToken
      safeSettings.metaConfigured = !!metaAccessToken
      
      return NextResponse.json(safeSettings)
    }

    // Get pending balances count for automation
    if (path === 'balances/pending/count') {
      const companyId = searchParams.get('companyId')
      
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
      }
      
      const { count, error } = await supabase
        .from('balances')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', companyId)
        .gt('pendingAmount', 0)
      
      if (error) throw error
      
      return NextResponse.json({ count: count || 0 })
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  const { pathname } = new URL(request.url)
  const path = pathname.replace('/api/', '')
  
  try {
    const body = await request.json()

    // Create company
    if (path === 'companies') {
      const { data, error } = await supabase
        .from('companies')
        .insert([body])
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json(data)
    }

    // Create product
    if (path === 'products') {
      const { data, error } = await supabase
        .from('products')
        .insert([body])
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json(data)
    }

    // Create customer
    if (path === 'customers') {
      const { data, error } = await supabase
        .from('customers')
        .insert([body])
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json(data)
    }

    // Create balance (credit sale)
    if (path === 'balances') {
      const { companyId, customerId, invoiceId, totalAmount, paidAmount } = body
      
      const pendingAmount = totalAmount - (paidAmount || 0)
      const status = pendingAmount === 0 ? 'Cleared' : 
                     paidAmount > 0 ? 'Partially Paid' : 'Pending'
      
      const { data, error } = await supabase
        .from('balances')
        .insert([{
          companyId,
          customerId,
          invoiceId,
          totalAmount,
          paidAmount: paidAmount || 0,
          pendingAmount,
          status
        }])
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json(data)
    }

    // Record payment for balance
    if (path.startsWith('balances/') && path.endsWith('/payment')) {
      const balanceId = path.split('/')[1]
      const { paymentAmount, paymentMode, notes } = body
      
      // Get current balance
      const { data: balance, error: balanceError } = await supabase
        .from('balances')
        .select('*')
        .eq('id', balanceId)
        .single()
      
      if (balanceError) throw balanceError
      
      // Calculate new amounts
      const newPaidAmount = parseFloat(balance.paidAmount) + parseFloat(paymentAmount)
      const newPendingAmount = parseFloat(balance.totalAmount) - newPaidAmount
      const newStatus = newPendingAmount <= 0 ? 'Cleared' : 
                       newPaidAmount > 0 ? 'Partially Paid' : 'Pending'
      
      // Record payment
      const { data: payment, error: paymentError } = await supabase
        .from('payment_history')
        .insert([{
          balanceId,
          paymentAmount,
          paymentMode: paymentMode || 'Cash',
          notes
        }])
        .select()
        .single()
      
      if (paymentError) throw paymentError
      
      // Update balance
      const { data: updatedBalance, error: updateError } = await supabase
        .from('balances')
        .update({
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount,
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
        .eq('id', balanceId)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      return NextResponse.json({ balance: updatedBalance, payment })
    }

    // Send WhatsApp reminder
    if (path.startsWith('balances/') && path.endsWith('/send-reminder')) {
      const balanceId = path.split('/')[1]
      
      // Get balance with customer and invoice details
      const { data: balance, error: balanceError } = await supabase
        .from('balances')
        .select(`
          *,
          customers (*),
          invoices (*),
          companies (*)
        `)
        .eq('id', balanceId)
        .single()
      
      if (balanceError) throw balanceError
      
      // Get WhatsApp settings
      const { data: settings, error: settingsError } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('companyId', balance.companyId)
        .single()
      
      if (settingsError || !settings || settings.provider === 'none') {
        return NextResponse.json({ 
          error: 'WhatsApp not configured. Please configure in Settings.' 
        }, { status: 400 })
      }
      
      // Format reminder message
      const message = `Hi ${balance.customers.name},

This is a payment reminder from ${balance.companies.name}.

Invoice: ${balance.invoices.invoiceNo}
Date: ${new Date(balance.invoices.invoiceDate).toLocaleDateString()}
Total Amount: ₹${balance.totalAmount.toFixed(2)}
Paid: ₹${balance.paidAmount.toFixed(2)}
Pending: ₹${balance.pendingAmount.toFixed(2)}

Please clear the pending balance at your earliest convenience.

Thank you!`
      
      // Send WhatsApp message
      try {
        const whatsappClient = new WhatsAppClient(settings.provider, settings)
        const result = await whatsappClient.sendMessage(balance.customers.phone, message)
        
        // Log reminder
        const { data: reminder, error: reminderError } = await supabase
          .from('whatsapp_reminders')
          .insert([{
            balanceId,
            customerId: balance.customerId,
            phoneNumber: balance.customers.phone,
            message,
            status: 'Sent'
          }])
          .select()
          .single()
        
        if (reminderError) throw reminderError
        
        // Update last reminder sent
        await supabase
          .from('balances')
          .update({ lastReminderSent: new Date().toISOString() })
          .eq('id', balanceId)
        
        return NextResponse.json({ 
          success: true, 
          message: 'Reminder sent successfully',
          reminder 
        })
      } catch (error) {
        // Log failed reminder
        await supabase
          .from('whatsapp_reminders')
          .insert([{
            balanceId,
            customerId: balance.customerId,
            phoneNumber: balance.customers.phone,
            message,
            status: 'Failed',
            errorMessage: error.message
          }])
        
        throw error
      }
    }

    // Save WhatsApp settings
    if (path === 'whatsapp-settings') {
      const { companyId, ...settingsData } = body
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from('whatsapp_settings')
        .select('id')
        .eq('companyId', companyId)
        .single()
      
      let result
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .update({
            ...settingsData,
            updatedAt: new Date().toISOString()
          })
          .eq('companyId', companyId)
          .select()
          .single()
        
        if (error) throw error
        result = data
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .insert([{
            companyId,
            ...settingsData
          }])
          .select()
          .single()
        
        if (error) throw error
        result = data
      }
      
      return NextResponse.json(result)
    }

    // Auto-send reminders (called by cron or manual trigger)
    if (path === 'balances/send-auto-reminders') {
      const { companyId } = body
      
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
      }
      
      // Get WhatsApp settings
      const { data: settings, error: settingsError } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('companyId', companyId)
        .single()
      
      if (settingsError || !settings || !settings.autoRemindersEnabled) {
        return NextResponse.json({ 
          message: 'Auto reminders not enabled' 
        })
      }
      
      // Get pending balances that need reminders
      const reminderCutoff = new Date()
      reminderCutoff.setDate(reminderCutoff.getDate() - settings.reminderFrequencyDays)
      
      const { data: balances, error: balancesError } = await supabase
        .from('balances')
        .select(`
          *,
          customers (*),
          invoices (*),
          companies (*)
        `)
        .eq('companyId', companyId)
        .gt('pendingAmount', 0)
        .or(`lastReminderSent.is.null,lastReminderSent.lt.${reminderCutoff.toISOString()}`)
      
      if (balancesError) throw balancesError
      
      const results = []
      const whatsappClient = new WhatsAppClient(settings.provider, settings)
      
      for (const balance of balances) {
        try {
          const message = `Hi ${balance.customers.name},

Payment Reminder from ${balance.companies.name}

Invoice: ${balance.invoices.invoiceNo}
Pending Amount: ₹${balance.pendingAmount.toFixed(2)}

Please clear your payment. Thank you!`
          
          await whatsappClient.sendMessage(balance.customers.phone, message)
          
          // Log reminder
          await supabase
            .from('whatsapp_reminders')
            .insert([{
              balanceId: balance.id,
              customerId: balance.customerId,
              phoneNumber: balance.customers.phone,
              message,
              status: 'Sent'
            }])
          
          // Update last reminder sent
          await supabase
            .from('balances')
            .update({ lastReminderSent: new Date().toISOString() })
            .eq('id', balance.id)
          
          results.push({ balanceId: balance.id, status: 'sent' })
        } catch (error) {
          results.push({ balanceId: balance.id, status: 'failed', error: error.message })
        }
      }
      
      return NextResponse.json({ 
        sent: results.length,
        results 
      })
    }

    // Create invoice with items
    if (path === 'invoices') {
      const { companyId, customerId, items, paymentMode, notes } = body
      
      // Get company and customer for GST calculation
      const { data: company } = await supabase
        .from('companies')
        .select('state')
        .eq('id', companyId)
        .single()
      
      const { data: customer } = customerId ? await supabase
        .from('customers')
        .select('state')
        .eq('id', customerId)
        .single() : { data: null }
      
      // Calculate totals
      let subtotal = 0
      const invoiceItems = items.map(item => {
        const lineSubtotal = item.quantity * item.unitPrice
        const lineTax = (lineSubtotal * item.taxRate) / 100
        const lineTotal = lineSubtotal + lineTax
        subtotal += lineSubtotal
        
        return {
          productId: item.productId,
          productName: item.productName,
          hsn: item.hsn,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxAmount: lineTax,
          lineTotal: lineTotal
        }
      })
      
      // Calculate GST
      const avgTaxRate = items.reduce((sum, item) => sum + parseFloat(item.taxRate), 0) / items.length
      const gst = calculateGST(subtotal, avgTaxRate, company?.state, customer?.state)
      
      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoiceNo')
        .eq('companyId', companyId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single()
      
      let invoiceNo = 'INV-001'
      if (lastInvoice?.invoiceNo) {
        const lastNum = parseInt(lastInvoice.invoiceNo.split('-')[1])
        invoiceNo = `INV-${String(lastNum + 1).padStart(3, '0')}`
      }
      
      // Determine invoice status based on payment mode
      const finalPaymentMode = paymentMode || 'Cash'
      const invoiceStatus = finalPaymentMode === 'Credit' ? 'Pending' : 'Paid'
      
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          companyId,
          customerId: customerId || null,
          invoiceNo,
          subtotal,
          taxAmount: gst.taxAmount,
          cgstAmount: gst.cgstAmount,
          sgstAmount: gst.sgstAmount,
          igstAmount: gst.igstAmount,
          totalAmount: subtotal + gst.taxAmount,
          paymentMode: finalPaymentMode,
          status: invoiceStatus,
          notes
        }])
        .select()
        .single()
      
      if (invoiceError) throw invoiceError
      
      // If payment mode is Credit, create balance record
      if (finalPaymentMode === 'Credit' && customerId) {
        const totalAmount = subtotal + gst.taxAmount
        
        const { error: balanceError } = await supabase
          .from('balances')
          .insert([{
            companyId,
            customerId,
            invoiceId: invoice.id,
            totalAmount,
            paidAmount: 0,
            pendingAmount: totalAmount,
            status: 'Pending'
          }])
        
        if (balanceError) {
          console.error('Error creating balance:', balanceError)
          console.error('Balance error details:', JSON.stringify(balanceError))
          // Still return success but log the error
          // The invoice is created, balance will need to be added manually if this fails
        }
      } else if (finalPaymentMode === 'Credit' && !customerId) {
        console.warn('Credit sale without customer ID - balance not created')
      }
      
      // Create invoice items
      const itemsWithInvoiceId = invoiceItems.map(item => ({
        ...item,
        invoiceId: invoice.id
      }))
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsWithInvoiceId)
      
      if (itemsError) throw itemsError
      
      // Update product stock
      for (const item of items) {
        if (item.productId) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.productId)
            .single()
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock - item.quantity })
              .eq('id', item.productId)
          }
        }
      }
      
      return NextResponse.json(invoice)
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  const { pathname } = new URL(request.url)
  const path = pathname.replace('/api/', '')
  
  try {
    const body = await request.json()
    const parts = path.split('/')
    
    // Update product
    if (parts[0] === 'products' && parts[1]) {
      const { data, error } = await supabase
        .from('products')
        .update(body)
        .eq('id', parts[1])
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json(data)
    }
    
    // Update customer
    if (parts[0] === 'customers' && parts[1]) {
      const { data, error } = await supabase
        .from('customers')
        .update(body)
        .eq('id', parts[1])
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json(data)
    }
    
    // Update company
    if (parts[0] === 'companies' && parts[1]) {
      const { data, error } = await supabase
        .from('companies')
        .update(body)
        .eq('id', parts[1])
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const { pathname } = new URL(request.url)
  const path = pathname.replace('/api/', '')
  
  try {
    const parts = path.split('/')
    
    // Delete product (soft delete)
    if (parts[0] === 'products' && parts[1]) {
      const { error } = await supabase
        .from('products')
        .update({ isActive: false })
        .eq('id', parts[1])
      
      if (error) throw error
      return NextResponse.json({ success: true })
    }
    
    // Delete customer
    if (parts[0] === 'customers' && parts[1]) {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', parts[1])
      
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
