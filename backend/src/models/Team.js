const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  _id:    { type: String, required: true },
  name:   { type: String, required: true },
  role:   { type: String, default: '' },
  status: { type: String, default: 'active' },
});

module.exports = mongoose.model('Team', teamSchema);
