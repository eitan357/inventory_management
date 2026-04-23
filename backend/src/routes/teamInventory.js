const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const CONFIG = require('../config');

// GET /api/team-inventory/:teamId
router.get('/:teamId', async (req, res) => {
  const { teamId } = req.params;

  const rows = await Transaction.find({ teamId, statusId: CONFIG.ACTIONS.ACTIVE }).lean();

  const inventory = {};
  const snsByProduct = {};
  const rowIdsByProduct = {};
  const uniqueLocIds = new Set();

  for (const row of rows) {
    if (row.locationId) uniqueLocIds.add(row.locationId);
    const invKey = row.productId + '_' + row.locationId;

    if (!inventory[invKey]) {
      inventory[invKey] = { id: row.productId, qty: 0, type: row.sn ? 'SN' : 'Generic', locId: row.locationId };
      rowIdsByProduct[invKey] = [];
    }
    inventory[invKey].qty++;

    if (row.sn) {
      if (!snsByProduct[invKey]) snsByProduct[invKey] = [];
      snsByProduct[invKey].push({ sn: row.sn, rowId: row._id });
    } else {
      rowIdsByProduct[invKey].push(row._id);
    }
  }

  res.json({
    products: Object.values(inventory),
    sns: snsByProduct,
    rowIds: rowIdsByProduct,
    locations: [...uniqueLocIds],
  });
});

module.exports = router;
