import './globals.css'

export const metadata = {
  title: 'BillMaster - POS & Billing Software',
  description: 'Complete billing software with credit management and WhatsApp payment reminders',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}