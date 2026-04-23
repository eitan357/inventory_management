const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  _id:          { type: String, required: true },   // UUID
  date:         { type: Date,   required: true },
  issuerName:   { type: String, required: true },
  issuerId:     { type: String, required: true },
  actionName:   { type: String, required: true },
  actionId:     { type: String, required: true },
  prevId:       { type: String, default: '' },
  teamName:     { type: String, required: true },
  teamId:       { type: String, required: true },
  productName:  { type: String, required: true },
  productId:    { type: String, required: true },
  sn:           { type: String, default: '' },
  qty:          { type: Number, default: 1 },
  locationName: { type: String, required: true },
  locationId:   { type: String, required: true },
  signeeName:   { type: String, default: '' },
  signeeUuid:   { type: String, default: '' },
  statusName:   { type: String, required: true },
  statusId:     { type: String, required: true },
});

transactionSchema.index({ statusId: 1 });
transactionSchema.index({ teamId: 1, statusId: 1 });
transactionSchema.index({ sn: 1, statusId: 1 });
transactionSchema.index({ productId: 1, statusId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
