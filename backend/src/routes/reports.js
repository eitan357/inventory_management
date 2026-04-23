const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const CONFIG = require('../config');

// GET /api/reports
router.get('/', async (req, res) => {
  const active = await Transaction.find({ statusId: CONFIG.ACTIONS.ACTIVE }).lean();

  // ---- דוח מלאי ----
  const aggMap = {};
  for (const row of active) {
    const isStorage = CONFIG.STORAGE_BADGE_IDS.includes(row.actionId);
    const isFaulty  = CONFIG.FAULTY_BADGE_IDS.includes(row.actionId);
    const keyAction = isStorage || isFaulty ? row.actionId : 'ACTIVE';
    const key = [row.productId, row.teamId, row.locationId, row.signeeUuid, keyAction].join('|');

    if (!aggMap[key]) {
      aggMap[key] = {
        productId:    row.productId,
        productName:  row.productName,
        teamId:       row.teamId,
        teamName:     row.teamName,
        locationId:   row.locationId,
        locationName: row.locationName,
        signeeId:     row.signeeUuid,
        signeeName:   row.signeeName,
        qty:          0,
        actionId:     keyAction,
        actionName:   row.actionName,
      };
    }
    aggMap[key].qty++;
  }

  // ---- דוח צ' ----
  const allTx = await Transaction.find().lean();
  const lastStateMap = {};
  for (const row of allTx) {
    if (!row.sn) continue;
    if (row.statusId === CONFIG.ACTIONS.ACTIVE) {
      lastStateMap[row.sn] = {
        pId: row.productId, teamId: row.teamId, signeeId: row.signeeUuid,
        locationId: row.locationId, actionId: row.actionId, date: row.date,
        prevId: row.prevId,
      };
    } else {
      delete lastStateMap[row.sn];
    }
  }

  const tsReport = {};
  for (const [sn, item] of Object.entries(lastStateMap)) {
    if (!tsReport[item.pId]) tsReport[item.pId] = [];
    tsReport[item.pId].push({ sn, ...item });
  }

  res.json({ inventory: Object.values(aggMap), tsReport });
});

module.exports = router;
