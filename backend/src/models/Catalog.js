const mongoose = require('mongoose');

const catalogSchema = new mongoose.Schema({
  _id:       { type: String, required: true },
  name:      { type: String, required: true },
  nickname:  { type: String, default: '' },
  related:   { type: String, default: '' },
  pn:        { type: String, default: '' },
  type:      { type: String, enum: ['SN', 'Generic'], default: 'Generic' },
  sortOrder: { type: Number, default: null },
  status:    { type: String, default: 'active' },
});

module.exports = mongoose.model('Catalog', catalogSchema);
