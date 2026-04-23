const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  _id:    { type: String, required: true },
  name:   { type: String, required: true },
  status: { type: String, default: 'active' },
});

module.exports = mongoose.model('Location', locationSchema);
