const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CALENDAR_ID = process.env.CALENDAR_ID;
const credentials = JSON.parse(process.env.google_credentials);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

app.post('/create-booking', async (req, res) => {
  try {
    const { name, phone, email, date, startTime, endTime, venue, postcode, items, total, deposit } = req.body;

    const calendar = google.calendar({ version: 'v3', auth });

    const itemNames = items.map(i => i.name).join(', ');

    const event = {
      summary: `U Bounce Hire — ${name}`,  location: `${venue}, ${postcode}`,
      description: `Customer: ${name}\nPhone: ${phone}\nEmail: ${email}\nItems: ${itemNames}\nTotal: £${total}\nDeposit: £${deposit}`,
      start: {
        dateTime: `${date}T${startTime}:00`,
        timeZone: 'Europe/London',
      },
      end: {
        dateTime: `${date}T${endTime}:00`,
        timeZone: 'Europe/London',
      },
    };

    await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('U Bounce Hire backend running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
