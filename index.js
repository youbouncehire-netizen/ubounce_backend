const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const CALENDAR_ID = process.env.CALENDAR_ID;
const credentials = JSON.parse(process.env.google_credentials);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

// Create Google Calendar event
async function createCalendarEvent(booking) {
  const calendar = google.calendar({ version: 'v3', auth });
  const itemNames = booking.items.map(i => i.name).join(', ');
  const event = {
    summary: `U Bounce Hire — ${booking.name}`,
    location: `${booking.venue}, ${booking.postcode}`,
    description: `Customer: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}\nItems: ${itemNames}\nTotal: £${booking.total}\nDeposit: £${booking.deposit}\nPayment: ${booking.paymentMethod || 'Bank Transfer'}`,
    start: {
      dateTime: `${booking.date}T${booking.startTime}:00`,
      timeZone: 'Europe/London',
    },
    end: {
      dateTime: `${booking.date}T${booking.endTime}:00`,
      timeZone: 'Europe/London',
    },
  };
  await calendar.events.insert({ calendarId: CALENDAR_ID, resource: event });
}

// Process card payment via Stripe
app.post('/pay-card', async (req, res) => {
  try {
    const { amount, currency = 'gbp', paymentMethodId, booking } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to pence
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `U Bounce Hire — ${booking.name} — ${booking.date}`,
      metadata: {
        customer_name: booking.name,
        customer_phone: booking.phone,
        customer_email: booking.email,
        event_date: booking.date,
        items: booking.items.map(i => i.name).join(', '),
      },
    });

    if (paymentIntent.status === 'succeeded') {
      // Payment successful — create calendar event
      await createCalendarEvent({ ...booking, paymentMethod: 'Card Payment' });
      res.json({ success: true, paymentIntentId: paymentIntent.id });
    } else {
      res.status(400).json({ error: 'Payment failed', status: paymentIntent.status });
    }
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create booking via bank transfer (calendar only)
app.post('/create-booking', async (req, res) => {
  try {
    await createCalendarEvent({ ...req.body, paymentMethod: 'Bank Transfer' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('U Bounce Hire backend running! ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
