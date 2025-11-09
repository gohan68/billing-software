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
          paymentMode: paymentMode || 'Cash',
          status: 'Paid',
          notes
        }])
        .select()
        .single()
      
      if (invoiceError) throw invoiceError
      
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
