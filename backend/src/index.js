require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/startup',        require('./routes/startup'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/outbound',       require('./routes/outbound'));
app.use('/api/team-inventory', require('./routes/teamInventory'));

app.get('/health', (_, res) => res.json({ ok: true }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
