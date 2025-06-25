require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors=require('cors');
const path = require('path');
const { clients, sessionIds } = require('./whatsappClient');
console.log("sessionIds",sessionIds);
console.log("clients",clients)
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.post("/check", async (req, res) => {
  const { numbers } = req.body;

  if (!Array.isArray(numbers) || numbers.length === 0) {
    return res.status(400).json({ error: 'Invalid or missing "numbers" array' });
  }

  let workingClient = null;
  let sentWhatsappId = null;

  // Automatically pick the first ready session from sessionIds
  for (let id of sessionIds) {
    const client = clients[id];
    if (client && client.info) {
      workingClient = client;
      sentWhatsappId = id;
      break;
    }
  }

  if (!workingClient) {
    return res.status(500).json({ error: 'No WhatsApp session is ready' });
  }

  const results = [];

  for (const number of numbers) {
    const jid = `${number}@c.us`;
    try {
      const isRegistered = await workingClient.isRegisteredUser(jid);
      results.push({ number, isRegistered });
    } catch (err) {
      console.error(`Error checking number ${number}:`, err);
      results.push({ number, isRegistered: false, error: true });
    }
  }

  res.json({ sessionUsed: sentWhatsappId, results });
});



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/auth', authRoutes);
app.use('/whatsapp', whatsappRoutes);

app.use('/uploads', express.static('uploads')); // Serve static files
app.use('/api', uploadRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
  