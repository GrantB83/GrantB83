# Public Contact API

The public contact API endpoint allows the www.thebrowns.co.za website (and other approved origins) to submit contact form inquiries to the GuestFlow backend.

## Endpoint

```
POST https://guestflow.thebrowns.co.za/api/public/contact
```

## CORS Configuration

The API allows requests from:
- `https://www.thebrowns.co.za`
- `https://thebrowns.co.za`
- `http://localhost:3000` (development)
- `http://localhost:3100` (development)

## Request Format

### Headers

```
Content-Type: application/json
```

### Body (JSON)

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+27 82 123 4567",
  "message": "I would like to inquire about availability...",
  "company": ""
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Contact's full name |
| `email` | string | Yes | Contact's email address (validated) |
| `phone` | string | No | Contact's phone number |
| `message` | string | Yes | Inquiry message |
| `company` | string | No | **Honeypot field** - must be empty or form is rejected |

**Important:** The `company` field is a honeypot to catch bots. If this field contains any value, the submission is rejected with a 400 error.

## Validation Rules

1. **Required Fields**: `name`, `email`, and `message` must be provided
2. **Email Format**: Email must be a valid format (basic regex check)
3. **Honeypot**: `company` field must be empty or absent
4. **Rate Limiting**: Maximum 5 requests per hour per IP address

## Response Formats

### Success (200 OK)

```json
{
  "success": true,
  "message": "Thank you for your inquiry. We will be in touch soon."
}
```

### Validation Error (400 Bad Request)

```json
{
  "error": "Name, email, and message are required"
}
```

or

```json
{
  "error": "Invalid email address"
}
```

or (honeypot triggered)

```json
{
  "error": "Invalid request"
}
```

### Rate Limit Exceeded (429 Too Many Requests)

```json
{
  "error": "Too many requests. Please try again later."
}
```

Headers will include:
- `X-RateLimit-Remaining: 0`
- `Retry-After: 3600` (seconds)

### Service Unavailable (503)

Returned when email service is not configured:

```json
{
  "error": "Email service is not configured. Please try again later."
}
```

or when email fails to send:

```json
{
  "error": "Failed to send email. Please try again later."
}
```

### Server Error (500)

```json
{
  "error": "An unexpected error occurred"
}
```

## Email Configuration

The API requires one of the following email configurations to be set in environment variables:

### Option 1: Resend API (Recommended for Vercel)

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@guestflow.thebrowns.co.za
CONTACT_RECIPIENT_EMAIL=stay@thebrowns.co.za
```

### Option 2: SMTP Server

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM_EMAIL=noreply@thebrowns.co.za
CONTACT_RECIPIENT_EMAIL=stay@thebrowns.co.za
```

**Note:** If neither email configuration is present, the API will return a 503 error.

## Frontend Integration Example

### HTML Form (with honeypot)

```html
<form id="contact-form">
  <input type="text" name="name" required placeholder="Your Name">
  <input type="email" name="email" required placeholder="Your Email">
  <input type="tel" name="phone" placeholder="Phone (optional)">
  <textarea name="message" required placeholder="Your Message"></textarea>
  
  <!-- Honeypot field (hidden from users) -->
  <input type="text" name="company" style="display:none" tabindex="-1" autocomplete="off">
  
  <button type="submit">Send Inquiry</button>
</form>
```

### JavaScript/Fetch

```javascript
const form = document.getElementById('contact-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') || '',
    message: formData.get('message'),
    company: formData.get('company') || '' // honeypot
  };
  
  try {
    const response = await fetch('https://guestflow.thebrowns.co.za/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      form.reset();
    } else {
      alert(result.error || 'Something went wrong');
    }
  } catch (error) {
    alert('Failed to send inquiry. Please try again.');
  }
});
```

### React Example

```tsx
'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    company: '' // honeypot
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('https://guestflow.thebrowns.co.za/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(result.message)
        setFormData({ name: '', email: '', phone: '', message: '', company: '' })
      } else {
        setMessage(result.error || 'Something went wrong')
      }
    } catch (error) {
      setMessage('Failed to send inquiry. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Your Name"
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Your Email"
        required
      />
      <input
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Phone (optional)"
      />
      <textarea
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        placeholder="Your Message"
        required
      />
      
      {/* Honeypot field (hidden) */}
      <input
        type="text"
        value={formData.company}
        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Inquiry'}
      </button>
      
      {message && <p>{message}</p>}
    </form>
  )
}
```

## Testing with curl

### Valid Request

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+27 82 123 4567",
    "message": "I would like to inquire about availability in December.",
    "company": ""
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Thank you for your inquiry. We will be in touch soon."
}
```

### Honeypot Triggered (Bot Detection)

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bot",
    "email": "bot@example.com",
    "message": "Spam message",
    "company": "Some Company"
  }'
```

Expected response (400):
```json
{
  "error": "Invalid request"
}
```

### Missing Required Field

```bash
curl -X POST https://guestflow.thebrowns.co.za/api/public/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "email": "john@example.com"
  }'
```

Expected response (400):
```json
{
  "error": "Name, email, and message are required"
}
```

## Rate Limiting Details

- **Window:** 1 hour (60 minutes)
- **Max Requests:** 5 per IP address per window
- **Tracking:** By client IP address (via `x-forwarded-for` or `x-real-ip` headers)
- **Storage:** In-memory (resets on server restart)
- **Headers:** Response includes `X-RateLimit-Remaining` to show remaining quota

## Security Features

1. **Honeypot Field:** Catches basic bots that auto-fill all form fields
2. **Rate Limiting:** Prevents spam and abuse from single IP
3. **CORS Restrictions:** Only allows requests from approved origins
4. **Email Validation:** Basic format checking
5. **No Sensitive Data Exposure:** API never returns configuration details in errors
6. **Safe Error Messages:** Generic error messages prevent information leakage

## Environment Setup

1. Create a Resend account at https://resend.com
2. Verify your domain (guestflow.thebrowns.co.za)
3. Generate an API key
4. Add environment variables to Vercel/hosting platform:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@guestflow.thebrowns.co.za
   CONTACT_RECIPIENT_EMAIL=stay@thebrowns.co.za
   ```
5. Test with curl or from the frontend

## Monitoring

Check Vercel logs or your hosting platform's logs to monitor:
- Failed email sends
- Rate limit violations
- Honeypot triggers (potential bot activity)
- 503 errors (configuration issues)

## Troubleshooting

### Email Not Sending (503 Error)

Check that at least one email configuration is set:
```bash
# Vercel CLI
vercel env pull

# Check for RESEND_API_KEY or SMTP_* variables
```

### CORS Errors

Ensure the request is coming from an approved origin:
- https://www.thebrowns.co.za
- https://thebrowns.co.za
- http://localhost:3000 (dev only)
- http://localhost:3100 (dev only)

### Rate Limit Too Strict

If legitimate users are hitting rate limits, adjust constants in the route file:
```typescript
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5 // Increase if needed
```

## Future Enhancements

- [ ] Persistent rate limit storage (Redis/database)
- [ ] More sophisticated bot detection
- [ ] Spam filtering integration
- [ ] Email template customization
- [ ] Auto-response to sender
- [ ] CRM integration
- [ ] Analytics/metrics tracking
