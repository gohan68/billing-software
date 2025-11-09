// WhatsApp Integration Library
// Supports both Twilio and Meta WhatsApp Cloud API

class WhatsAppClient {
  constructor(provider, settings) {
    this.provider = provider // 'twilio' or 'meta'
    this.settings = settings
  }

  async sendMessage(phoneNumber, message) {
    if (this.provider === 'twilio') {
      return await this.sendViaTwilio(phoneNumber, message)
    } else if (this.provider === 'meta') {
      return await this.sendViaMeta(phoneNumber, message)
    } else {
      throw new Error('Invalid WhatsApp provider')
    }
  }

  async sendViaTwilio(phoneNumber, message) {
    const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = this.settings

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured')
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: `whatsapp:${twilioPhoneNumber}`,
            To: `whatsapp:${phoneNumber}`,
            Body: message
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Twilio error: ${error.message}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Twilio send error:', error)
      throw error
    }
  }

  async sendViaMeta(phoneNumber, message) {
    const { metaAccessToken, metaPhoneNumberId } = this.settings

    if (!metaAccessToken || !metaPhoneNumberId) {
      throw new Error('Meta WhatsApp credentials not configured')
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${metaAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phoneNumber,
            type: 'text',
            text: {
              body: message
            }
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Meta WhatsApp error: ${error.error?.message || 'Unknown error'}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Meta WhatsApp send error:', error)
      throw error
    }
  }
}

export { WhatsAppClient }
