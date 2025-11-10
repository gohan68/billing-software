'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Package, Users, FileText, BarChart3, Settings, Plus, Search, X, Trash2, Save, Download, Eye, Upload, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

export default function App() {
  const [currentPage, setCurrentPage] = useState('setup')
  const [company, setCompany] = useState(null)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [balances, setBalances] = useState([])
  const [whatsappSettings, setWhatsappSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  // POS State
  const [cart, setCart] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searchProduct, setSearchProduct] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')

  // Form states
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false) // Modal form (legacy)
  const [showInlineCustomerForm, setShowInlineCustomerForm] = useState(false) // Inline form in POS
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedBalance, setSelectedBalance] = useState(null)
  
  // Import states
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importData, setImportData] = useState([])
  const [importPreview, setImportPreview] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    hsn: '',
    unitPrice: '',
    purchasePrice: '',
    stock: '',
    taxRate: '0'
  })
  
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  })
  
  const [companyForm, setCompanyForm] = useState({
    name: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: ''
  })

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load company
      const compRes = await fetch('/api/companies')
      
      // Check if response is ok
      if (!compRes.ok) {
        console.error('Failed to fetch companies:', compRes.status)
        setCurrentPage('setup')
        setLoading(false)
        return
      }
      
      const companies = await compRes.json()
      
      if (companies && companies.length > 0) {
        const comp = companies[0]
        setCompany(comp)
        setCurrentPage('pos')
        
        // Load all data
        const [prodsRes, custsRes, invsRes, statsRes, balancesRes, whatsappRes] = await Promise.all([
          fetch(`/api/products?companyId=${comp.id}`),
          fetch(`/api/customers?companyId=${comp.id}`),
          fetch(`/api/invoices?companyId=${comp.id}`),
          fetch(`/api/dashboard/stats?companyId=${comp.id}`),
          fetch(`/api/balances?companyId=${comp.id}`),
          fetch(`/api/whatsapp-settings?companyId=${comp.id}`)
        ])
        
        setProducts(await prodsRes.json())
        setCustomers(await custsRes.json())
        setInvoices(await invsRes.json())
        setStats(await statsRes.json())
        setBalances(await balancesRes.json())
        setWhatsappSettings(await whatsappRes.json())
      } else {
        setCurrentPage('setup')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setCurrentPage('setup')
    } finally {
      setLoading(false)
    }
  }

  // Company setup
  const handleCompanySubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm)
      })
      
      if (res.ok) {
        const newCompany = await res.json()
        setCompany(newCompany)
        setShowCompanyForm(false)
        setCurrentPage('pos')
        loadData()
      }
    } catch (error) {
      console.error('Error creating company:', error)
    }
  }

  // Product management
  const handleProductSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productForm,
          companyId: company.id,
          unitPrice: parseFloat(productForm.unitPrice),
          purchasePrice: parseFloat(productForm.purchasePrice || 0),
          stock: parseInt(productForm.stock),
          taxRate: 0
        })
      })
      
      if (res.ok) {
        setShowProductForm(false)
        setProductForm({
          sku: '',
          name: '',
          hsn: '',
          unitPrice: '',
          purchasePrice: '',
          stock: '',
          taxRate: '18'
        })
        loadData()
      }
    } catch (error) {
      console.error('Error creating product:', error)
    }
  }

  // Customer management
  const handleCustomerSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customerForm,
          companyId: company.id
        })
      })
      
      if (res.ok) {
        setShowCustomerForm(false)
        setCustomerForm({
          name: '',
          phone: '',
          email: '',
          gstin: '',
          address: '',
          city: '',
          state: '',
          pincode: ''
        })
        loadData()
      }
    } catch (error) {
      console.error('Error creating customer:', error)
    }
  }

  // POS Functions
  const addToCart = (product) => {
    const existing = cart.find(item => item.productId === product.id)
    
    if (existing) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        hsn: product.hsn,
        unitPrice: parseFloat(product.unitPrice),
        taxRate: 0,
        quantity: 1
      }])
    }
  }

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId))
    } else {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const calculateCartTotal = () => {
    const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    
    return {
      subtotal: total,
      taxAmount: 0,
      total: total
    }
  }

  const handleSaveInvoice = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart')
      return
    }
    
    // Validate Credit sales require customer
    if (paymentMode === 'Credit') {
      if (showInlineCustomerForm) {
        // Creating new customer
        if (!customerForm.name || !customerForm.phone) {
          alert('Please fill customer name and phone number for credit sales')
          return
        }
      } else if (!selectedCustomer) {
        alert('Please select a customer or add new customer for credit sales')
        return
      }
    }
    
    try {
      let customerId = selectedCustomer?.id
      
      // Create new customer if form is filled
      if (paymentMode === 'Credit' && showInlineCustomerForm && customerForm.name) {
        const custRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...customerForm,
            companyId: company.id
          })
        })
        
        if (custRes.ok) {
          const newCustomer = await custRes.json()
          customerId = newCustomer.id
          setSelectedCustomer(newCustomer)
        } else {
          alert('Failed to create customer. Please try again.')
          return
        }
      }
      
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          customerId: customerId,
          items: cart,
          paymentMode,
          notes: ''
        })
      })
      
      if (res.ok) {
        const invoice = await res.json()
        const message = paymentMode === 'Credit' 
          ? `Invoice ${invoice.invoiceNo} created successfully!\nCredit balance added for customer.`
          : `Invoice ${invoice.invoiceNo} created successfully!`
        alert(message)
        
        // Reset
        setCart([])
        setSelectedCustomer(null)
        setPaymentMode('Cash')
        setShowInlineCustomerForm(false)
        setCustomerForm({
          name: '',
          phone: '',
          email: '',
          gstin: '',
          address: '',
          city: '',
          state: '',
          pincode: ''
        })
        loadData()
      } else {
        const error = await res.json()
        alert('Error creating invoice: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Error creating invoice: ' + error.message)
    }
  }

  const generateInvoicePDF = async (invoiceId) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`)
      const invoice = await res.json()
      
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(20)
      doc.text(invoice.companies.name, 20, 20)
      doc.setFontSize(10)
      doc.text(invoice.companies.address, 20, 28)
      doc.text(`${invoice.companies.city}, ${invoice.companies.state} - ${invoice.companies.pincode}`, 20, 33)
      doc.text(`GSTIN: ${invoice.companies.gstin}`, 20, 38)
      doc.text(`Phone: ${invoice.companies.phone}`, 20, 43)
      
      // Invoice details
      doc.setFontSize(16)
      doc.text('INVOICE', 150, 20)
      doc.setFontSize(10)
      doc.text(`Invoice No: ${invoice.invoiceNo}`, 150, 28)
      doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 150, 33)
      
      // Customer details
      doc.setFontSize(12)
      doc.text('Bill To:', 20, 55)
      doc.setFontSize(10)
      if (invoice.customers) {
        doc.text(invoice.customers.name, 20, 62)
        if (invoice.customers.address) doc.text(invoice.customers.address, 20, 67)
        if (invoice.customers.phone) doc.text(`Phone: ${invoice.customers.phone}`, 20, 72)
        if (invoice.customers.gstin) doc.text(`GSTIN: ${invoice.customers.gstin}`, 20, 77)
      } else {
        doc.text('Walk-in Customer', 20, 62)
      }
      
      // Items table
      let y = 90
      doc.setFontSize(9)
      doc.text('S.No', 15, y)
      doc.text('Product', 30, y)
      doc.text('HSN', 90, y)
      doc.text('Qty', 115, y)
      doc.text('Rate', 140, y)
      doc.text('Amount', 170, y)
      
      y += 5
      doc.line(15, y, 195, y)
      y += 5
      
      invoice.items.forEach((item, index) => {
        doc.text(`${index + 1}`, 15, y)
        doc.text(item.productName, 30, y)
        doc.text(item.hsn || '-', 90, y)
        doc.text(item.quantity.toString(), 115, y)
        doc.text(`₹${item.unitPrice.toFixed(2)}`, 140, y)
        doc.text(`₹${item.lineTotal.toFixed(2)}`, 170, y)
        y += 7
      })
      
      y += 5
      doc.line(15, y, 195, y)
      
      // Totals
      y += 10
      doc.setFontSize(12)
      doc.text('Total Amount:', 140, y)
      doc.text(`₹${invoice.totalAmount.toFixed(2)}`, 175, y)
      
      // Footer
      y += 20
      doc.setFontSize(10)
      doc.text('Payment Mode: ' + invoice.paymentMode, 20, y)
      doc.text('Status: ' + invoice.status, 20, y + 7)
      
      doc.save(`Invoice_${invoice.invoiceNo}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  // Excel Import Functions
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setImportFile(file)
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // Parse the data - skip header rows and extract customer info
        const parsed = []
        
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          
          // Skip empty rows or header rows
          if (!row || row.length === 0) continue
          
          // Try to find customer name and phone pattern
          // Based on the Excel analysis: customer names are followed by phone numbers
          const customerText = String(row[0] || '').trim()
          
          // Skip title rows and headers
          if (customerText.includes('Due Balance Statement') || 
              customerText.includes('CUSTOMER') ||
              customerText === 'TOTAL' ||
              customerText === '') continue
          
          // Extract customer name (remove LOCAL CUSTOMER prefix if present)
          let customerName = customerText.replace(/LOCAL CUSTOMER\s*/i, '').trim()
          
          // Try to find phone number in the row
          let phone = null
          let amount = 0
          
          // Check each cell for a phone-like number (8-10 digits)
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').trim()
            
            // Check if it's a phone number (8-10 digits)
            if (/^\d{8,10}$/.test(cell) && !phone) {
              phone = cell
            }
            
            // Check if it's an amount (numeric value > 10)
            const numValue = parseFloat(cell)
            if (!isNaN(numValue) && numValue > 10 && amount === 0) {
              amount = numValue
            }
          }
          
          // If we have at least a name and amount, add it
          if (customerName && amount > 0) {
            parsed.push({
              customerName,
              phone,
              amount
            })
          }
        }
        
        setImportData(parsed)
        setImportPreview(true)
      } catch (error) {
        alert('Error parsing Excel file: ' + error.message)
      }
    }
    
    reader.readAsArrayBuffer(file)
  }

  const handleImportConfirm = async () => {
    if (importData.length === 0) {
      alert('No data to import')
      return
    }
    
    setImporting(true)
    
    try {
      const res = await fetch('/api/balances/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          data: importData
        })
      })
      
      const results = await res.json()
      
      if (res.ok) {
        setImportResults(results)
        setImportPreview(false)
        
        // Reload data
        loadData()
      } else {
        alert('Import failed: ' + (results.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Error importing data: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportData([])
    setImportPreview(false)
    setImportResults(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading BillMaster...</p>
        </div>
      </div>
    )
  }

  // Company Setup Screen
  if (currentPage === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto mt-10">
          {/* Database Setup Instructions */}
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-xl text-orange-800 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                One-Time Database Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-orange-700">
                Before you can start using BillMaster, you need to create the database tables in Supabase:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-orange-800">
                <li>Open your <strong>Supabase Dashboard</strong>: <a href="https://supabase.com/dashboard/project/zlfbgxapqyhdgupjbvwr" target="_blank" className="text-blue-600 underline">Click here</a></li>
                <li>Navigate to <strong>SQL Editor</strong> (left sidebar)</li>
                <li>Click <strong>"New Query"</strong></li>
                <li>Copy the SQL from <code className="bg-orange-100 px-2 py-1 rounded">/app/create-tables.sql</code></li>
                <li>Paste and click <strong>"Run"</strong></li>
                <li>Refresh this page</li>
              </ol>
              <div className="bg-orange-100 p-3 rounded border border-orange-200 mt-4">
                <p className="font-medium text-orange-900">Quick SQL Access:</p>
                <p className="text-xs text-orange-700 mt-1">The SQL file is located at: <code>/app/create-tables.sql</code></p>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/api/setup-sql', '_blank')}
                    className="bg-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    View SQL Script
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Setup Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to BillMaster</CardTitle>
              <CardDescription>After running the SQL script, set up your business profile here</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Business Name *</label>
                  <Input
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                    placeholder="Your Shop Name"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <Input
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                    placeholder="9876543210"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Address *</label>
                  <Input
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                    placeholder="Street, Area"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City *</label>
                    <Input
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({...companyForm, city: e.target.value})}
                      placeholder="City"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State *</label>
                    <Input
                      value={companyForm.state}
                      onChange={(e) => setCompanyForm({...companyForm, state: e.target.value})}
                      placeholder="State"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pincode *</label>
                    <Input
                      value={companyForm.pincode}
                      onChange={(e) => setCompanyForm({...companyForm, pincode: e.target.value})}
                      placeholder="560001"
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" size="lg">
                  Complete Setup & Start Billing
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const totals = calculateCartTotal()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-blue-600">BillMaster</h1>
            <div className="flex gap-2">
              <Button
                variant={currentPage === 'pos' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage('pos')}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                POS
              </Button>
              <Button
                variant={currentPage === 'products' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage('products')}
              >
                <Package className="w-4 h-4 mr-2" />
                Products
              </Button>
              <Button
                variant={currentPage === 'invoices' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage('invoices')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Invoices
              </Button>
              <Button
                variant={currentPage === 'reports' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage('reports')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Reports
              </Button>
              <Button
                variant={currentPage === 'balances' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage('balances')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Balance Due
              </Button>
              <Button
                variant={currentPage === 'settings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage('settings')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {company?.name}
          </div>
        </div>
      </nav>

      {/* POS Screen */}
      {currentPage === 'pos' && (
        <div className="max-w-7xl mx-auto p-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Today's Sales</div>
                  <div className="text-2xl font-bold text-green-600">₹{stats.todaySales}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Total Invoices</div>
                  <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Products</div>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600">Customers</div>
                  <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            {/* Product Search & List */}
            <div className="col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Products</CardTitle>
                    <Button size="sm" onClick={() => setShowProductForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                  <div className="mt-4">
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {products
                      .filter(p => 
                        p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                        p.sku.toLowerCase().includes(searchProduct.toLowerCase())
                      )
                      .map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-600">{product.sku}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-blue-600">₹{product.unitPrice}</span>
                            <Badge variant="secondary">{product.stock} in stock</Badge>
                          </div>
                        </button>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cart & Checkout */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Current Bill</CardTitle>
                    {cart.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => setCart([])}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Selection */}
                  <div>
                    <label className="text-sm font-medium">Customer</label>
                    <select
                      className="w-full mt-1 p-2 border rounded"
                      value={selectedCustomer?.id || ''}
                      onChange={(e) => {
                        const cust = customers.find(c => c.id === e.target.value)
                        setSelectedCustomer(cust)
                      }}
                    >
                      <option value="">Walk-in Customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>Cart is empty</p>
                      </div>
                    ) : (
                      cart.map((item, idx) => (
                        <div key={idx} className="border rounded p-2">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.productName}</div>
                              <div className="text-xs text-gray-500">₹{item.unitPrice} per item</div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCartQuantity(item.productId, parseInt(e.target.value) || 0)}
                              className="w-16 text-center"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                            >
                              +
                            </Button>
                            <div className="ml-auto font-bold">₹{(item.unitPrice * item.quantity).toFixed(2)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Totals */}
                  {cart.length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-green-600">₹{totals.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Payment Mode */}
                  {cart.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Payment Mode</label>
                        <select
                          className="w-full mt-1 p-2 border rounded"
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Credit">Credit</option>
                        </select>
                      </div>

                      {/* Customer Selection for Credit Sales */}
                      {paymentMode === 'Credit' && (
                        <div className="border-t pt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-orange-600">Customer Details Required</label>
                            {!showInlineCustomerForm && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowInlineCustomerForm(true)}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add New
                              </Button>
                            )}
                          </div>

                          {!showInlineCustomerForm ? (
                            <div>
                              <label className="text-sm">Select Customer</label>
                              <select
                                className="w-full mt-1 p-2 border rounded"
                                value={selectedCustomer?.id || ''}
                                onChange={(e) => {
                                  const customer = customers.find(c => c.id === e.target.value)
                                  setSelectedCustomer(customer)
                                }}
                              >
                                <option value="">-- Select Customer --</option>
                                {customers.map(customer => (
                                  <option key={customer.id} value={customer.id}>
                                    {customer.name} - {customer.phone}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-2 bg-gray-50 p-3 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">New Customer</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setShowInlineCustomerForm(false)
                                    setCustomerForm({
                                      name: '',
                                      phone: '',
                                      email: '',
                                      gstin: '',
                                      address: '',
                                      city: '',
                                      state: '',
                                      pincode: ''
                                    })
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <Input
                                placeholder="Customer Name *"
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                              />
                              <Input
                                placeholder="Phone Number *"
                                value={customerForm.phone}
                                onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                              />
                              <Input
                                placeholder="Email"
                                type="email"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                              />
                              <Input
                                placeholder="Address"
                                value={customerForm.address}
                                onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="City"
                                  value={customerForm.city}
                                  onChange={(e) => setCustomerForm({...customerForm, city: e.target.value})}
                                />
                                <Input
                                  placeholder="State"
                                  value={customerForm.state}
                                  onChange={(e) => setCustomerForm({...customerForm, state: e.target.value})}
                                />
                              </div>
                              <Input
                                placeholder="Pincode"
                                value={customerForm.pincode}
                                onChange={(e) => setCustomerForm({...customerForm, pincode: e.target.value})}
                              />
                            </div>
                          )}

                          {selectedCustomer && !showInlineCustomerForm && (
                            <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                              <strong>Selected:</strong> {selectedCustomer.name}<br/>
                              <strong>Phone:</strong> {selectedCustomer.phone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Save Button */}
                  {cart.length > 0 && (
                    <Button className="w-full" size="lg" onClick={handleSaveInvoice}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Invoice
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Products Management */}
      {currentPage === 'products' && (
        <div className="max-w-7xl mx-auto p-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Products Management</CardTitle>
                <Button onClick={() => setShowProductForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">HSN</th>
                      <th className="text-left p-2">Price</th>
                      <th className="text-left p-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{product.sku}</td>
                        <td className="p-2 font-medium">{product.name}</td>
                        <td className="p-2">{product.hsn}</td>
                        <td className="p-2">₹{product.unitPrice}</td>
                        <td className="p-2">
                          <Badge variant={product.stock > 10 ? 'secondary' : 'destructive'}>
                            {product.stock}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoices List */}
      {currentPage === 'invoices' && (
        <div className="max-w-7xl mx-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Invoice No</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Payment</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{invoice.invoiceNo}</td>
                        <td className="p-2">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                        <td className="p-2">{invoice.customers?.name || 'Walk-in'}</td>
                        <td className="p-2 font-bold text-green-600">₹{invoice.totalAmount}</td>
                        <td className="p-2">
                          <Badge>{invoice.paymentMode}</Badge>
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateInvoicePDF(invoice.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports */}
      {currentPage === 'reports' && (
        <div className="max-w-7xl mx-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Today's Sales</span>
                  <span className="text-xl font-bold text-green-600">₹{stats?.todaySales || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Total Invoices</span>
                  <span className="text-xl font-bold">{stats?.totalInvoices || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance Due Page */}
      {currentPage === 'balances' && (
        <div className="max-w-7xl mx-auto p-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Balance Due / Credit Sales</CardTitle>
                  <CardDescription>Track customers with pending payments</CardDescription>
                </div>
                <Button onClick={() => setShowImportModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import from Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Phone</th>
                      <th className="text-left p-2">Invoice</th>
                      <th className="text-left p-2">Total</th>
                      <th className="text-left p-2">Paid</th>
                      <th className="text-left p-2">Pending</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.filter(b => parseFloat(b.pendingAmount) > 0).map(balance => (
                      <tr key={balance.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{balance.customers?.name || 'N/A'}</td>
                        <td className="p-2">{balance.customers?.phone || 'N/A'}</td>
                        <td className="p-2">{balance.invoices?.invoiceNo || 'N/A'}</td>
                        <td className="p-2">₹{parseFloat(balance.totalAmount).toFixed(2)}</td>
                        <td className="p-2 text-green-600">₹{parseFloat(balance.paidAmount).toFixed(2)}</td>
                        <td className="p-2 text-red-600 font-bold">₹{parseFloat(balance.pendingAmount).toFixed(2)}</td>
                        <td className="p-2">
                          <Badge 
                            variant={balance.status === 'Pending' ? 'destructive' : 
                                   balance.status === 'Partially Paid' ? 'default' : 'secondary'}
                          >
                            {balance.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/balances/${balance.id}/send-reminder`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' }
                                  })
                                  if (res.ok) {
                                    alert('Reminder sent successfully!')
                                    loadData()
                                  } else {
                                    const error = await res.json()
                                    alert(error.error || 'Failed to send reminder')
                                  }
                                } catch (error) {
                                  alert('Error sending reminder: ' + error.message)
                                }
                              }}
                            >
                              Send Reminder
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedBalance(balance)
                                setShowPaymentForm(true)
                              }}
                            >
                              Record Payment
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {balances.filter(b => parseFloat(b.pendingAmount) > 0).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p>No pending balances</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Page */}
      {currentPage === 'settings' && (
        <div className="max-w-4xl mx-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Payment Reminder Settings</CardTitle>
              <CardDescription>Configure WhatsApp integration for automated payment reminders</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                const settings = {
                  companyId: company.id,
                  provider: formData.get('provider'),
                  autoRemindersEnabled: formData.get('autoRemindersEnabled') === 'on',
                  reminderFrequencyDays: parseInt(formData.get('reminderFrequencyDays')),
                  twilioAccountSid: formData.get('twilioAccountSid') || null,
                  twilioAuthToken: formData.get('twilioAuthToken') || null,
                  twilioPhoneNumber: formData.get('twilioPhoneNumber') || null,
                  metaAccessToken: formData.get('metaAccessToken') || null,
                  metaPhoneNumberId: formData.get('metaPhoneNumberId') || null,
                  metaBusinessAccountId: formData.get('metaBusinessAccountId') || null
                }
                
                try {
                  const res = await fetch('/api/whatsapp-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                  })
                  
                  if (res.ok) {
                    alert('Settings saved successfully!')
                    loadData()
                  } else {
                    alert('Failed to save settings')
                  }
                } catch (error) {
                  alert('Error: ' + error.message)
                }
              }} className="space-y-6">
                
                <div>
                  <label className="text-sm font-medium">WhatsApp Provider *</label>
                  <select 
                    name="provider" 
                    className="w-full mt-1 p-2 border rounded"
                    defaultValue={whatsappSettings?.provider || 'none'}
                  >
                    <option value="none">None (Disable WhatsApp)</option>
                    <option value="twilio">Twilio WhatsApp API</option>
                    <option value="meta">Meta WhatsApp Cloud API</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose your WhatsApp integration provider</p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Twilio Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Twilio Account SID</label>
                      <Input
                        name="twilioAccountSid"
                        defaultValue={whatsappSettings?.twilioAccountSid || ''}
                        placeholder="AC..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Twilio Auth Token</label>
                      <Input
                        name="twilioAuthToken"
                        type="password"
                        defaultValue={whatsappSettings?.twilioAuthToken || ''}
                        placeholder="Your auth token"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Twilio Phone Number</label>
                      <Input
                        name="twilioPhoneNumber"
                        defaultValue={whatsappSettings?.twilioPhoneNumber || ''}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Meta WhatsApp Cloud API Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Access Token</label>
                      <Input
                        name="metaAccessToken"
                        type="password"
                        defaultValue={whatsappSettings?.metaAccessToken || ''}
                        placeholder="EAA..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone Number ID</label>
                      <Input
                        name="metaPhoneNumberId"
                        defaultValue={whatsappSettings?.metaPhoneNumberId || ''}
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Business Account ID</label>
                      <Input
                        name="metaBusinessAccountId"
                        defaultValue={whatsappSettings?.metaBusinessAccountId || ''}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Automation Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        name="autoRemindersEnabled" 
                        id="autoRemindersEnabled"
                        defaultChecked={whatsappSettings?.autoRemindersEnabled || false}
                        className="w-4 h-4"
                      />
                      <label htmlFor="autoRemindersEnabled" className="text-sm font-medium">
                        Enable Automatic Payment Reminders
                      </label>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Reminder Frequency (days)</label>
                      <Input
                        name="reminderFrequencyDays"
                        type="number"
                        min="1"
                        defaultValue={whatsappSettings?.reminderFrequencyDays || 3}
                        placeholder="3"
                      />
                      <p className="text-xs text-gray-500 mt-1">Send reminders every N days for pending balances</p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">📘 Setup Instructions</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>Twilio:</strong> Sign up at twilio.com, get your Account SID, Auth Token, and WhatsApp-enabled phone number.</p>
                  <p><strong>Meta WhatsApp:</strong> Visit developers.facebook.com, create a Meta App, enable WhatsApp product, and get your access token and phone number ID.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Product</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setShowProductForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">SKU *</label>
                  <Input
                    value={productForm.sku}
                    onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                    placeholder="PROD001"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Product Name *</label>
                  <Input
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="Product Name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">HSN Code</label>
                  <Input
                    value={productForm.hsn}
                    onChange={(e) => setProductForm({...productForm, hsn: e.target.value})}
                    placeholder="1234"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Selling Price *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={productForm.unitPrice}
                      onChange={(e) => setProductForm({...productForm, unitPrice: e.target.value})}
                      placeholder="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Purchase Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={productForm.purchasePrice}
                      onChange={(e) => setProductForm({...productForm, purchasePrice: e.target.value})}
                      placeholder="80"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Stock Quantity *</label>
                  <Input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                    placeholder="50"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Customer</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setShowCustomerForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                    placeholder="Customer Name"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                    placeholder="Street, Area"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={customerForm.city}
                      onChange={(e) => setCustomerForm({...customerForm, city: e.target.value})}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input
                      value={customerForm.state}
                      onChange={(e) => setCustomerForm({...customerForm, state: e.target.value})}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pincode</label>
                    <Input
                      value={customerForm.pincode}
                      onChange={(e) => setCustomerForm({...customerForm, pincode: e.target.value})}
                      placeholder="560001"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Record Payment</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowPaymentForm(false)
                  setSelectedBalance(null)
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Customer: <strong>{selectedBalance.customers?.name}</strong></p>
                <p className="text-sm text-gray-600">Pending Amount: <strong className="text-red-600">₹{parseFloat(selectedBalance.pendingAmount).toFixed(2)}</strong></p>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                const paymentAmount = formData.get('paymentAmount')
                const paymentMode = formData.get('paymentMode')
                const notes = formData.get('notes')
                
                try {
                  const res = await fetch(`/api/balances/${selectedBalance.id}/payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      paymentAmount: parseFloat(paymentAmount),
                      paymentMode,
                      notes
                    })
                  })
                  
                  if (res.ok) {
                    alert('Payment recorded successfully!')
                    setShowPaymentForm(false)
                    setSelectedBalance(null)
                    loadData()
                  } else {
                    alert('Failed to record payment')
                  }
                } catch (error) {
                  alert('Error: ' + error.message)
                }
              }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Payment Amount *</label>
                  <Input
                    name="paymentAmount"
                    type="number"
                    step="0.01"
                    max={selectedBalance.pendingAmount}
                    placeholder="Enter amount"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum: ₹{parseFloat(selectedBalance.pendingAmount).toFixed(2)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Payment Mode *</label>
                  <select name="paymentMode" className="w-full mt-1 p-2 border rounded" required>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    name="notes"
                    placeholder="Optional notes"
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Import Balances from Excel</CardTitle>
                <Button size="sm" variant="ghost" onClick={resetImport}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              {!importPreview && !importResults && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">Upload Excel File</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Upload your balance due statement Excel file (.xlsx)
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label htmlFor="excel-upload">
                      <Button as="span" className="cursor-pointer">
                        Select Excel File
                      </Button>
                    </label>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <h4 className="font-medium text-blue-900 mb-2">📋 File Format Instructions</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>File should contain customer names, phone numbers, and amounts</li>
                      <li>Customer names and phone numbers will be automatically detected</li>
                      <li>System will create customers if they don't exist</li>
                      <li>Invoices will be automatically generated for each balance</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Preview Data */}
              {importPreview && !importResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-4">
                    <div>
                      <h4 className="font-medium text-green-900">File Parsed Successfully</h4>
                      <p className="text-sm text-green-700">Found {importData.length} records to import</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  
                  <div className="border rounded max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b">
                          <th className="text-left p-2 text-sm font-medium">#</th>
                          <th className="text-left p-2 text-sm font-medium">Customer Name</th>
                          <th className="text-left p-2 text-sm font-medium">Phone</th>
                          <th className="text-left p-2 text-sm font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 text-sm">{idx + 1}</td>
                            <td className="p-2 text-sm font-medium">{row.customerName}</td>
                            <td className="p-2 text-sm">{row.phone || '-'}</td>
                            <td className="p-2 text-sm font-bold text-green-600">₹{row.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={resetImport} 
                      variant="outline" 
                      className="flex-1"
                      disabled={importing}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleImportConfirm} 
                      className="flex-1"
                      disabled={importing}
                    >
                      {importing ? 'Importing...' : `Import ${importData.length} Records`}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Import Results */}
              {importResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-900">{importResults.success}</p>
                          <p className="text-sm text-green-700">Successfully Imported</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="text-2xl font-bold text-red-900">{importResults.failed}</p>
                          <p className="text-sm text-red-700">Failed to Import</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {importResults.created && importResults.created.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Successfully Created:</h4>
                      <div className="border rounded max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr className="border-b">
                              <th className="text-left p-2">Customer</th>
                              <th className="text-left p-2">Invoice No</th>
                              <th className="text-left p-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResults.created.map((item, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="p-2">{item.customerName}</td>
                                <td className="p-2">{item.invoiceNo}</td>
                                <td className="p-2 font-bold text-green-600">₹{item.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {importResults.errors && importResults.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-900">Errors:</h4>
                      <div className="border border-red-200 rounded max-h-48 overflow-y-auto bg-red-50">
                        {importResults.errors.map((err, idx) => (
                          <div key={idx} className="p-2 border-b last:border-b-0 text-sm">
                            <span className="font-medium">{err.row}:</span> {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={resetImport} className="w-full">
                    Close
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
