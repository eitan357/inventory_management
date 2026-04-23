const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  _id:        { type: String, required: true },
  name:       { type: String, required: true },
  badge:      { type: String, default: '' },
  statusPage: { type: String, default: '' },
});

module.exports = mongoose.model('Action', actionSchema);