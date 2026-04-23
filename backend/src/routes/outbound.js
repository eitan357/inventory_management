const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/Transaction');
const Signee = require('../models/Signee');
const Action = require('../models/Action');
const CONFIG = require('../config');

// POST /api/outbound
router.post('/', async (req, res) => {
  const formData = req.body;
  const mainTeamId = String(formData.mainTeamId || '');

  const activeRows = await Transaction.find({ statusId: CONFIG.ACTIONS.ACTIVE }).lean();

  const lastStateMap = {};
  const containerStockMap = {};

  for (const row of activeRows) {
    if (row.sn) lastStateMap[row.sn] = { rowId: row._id, teamId: row.teamId };
    if (row.teamId === mainTeamId) {
      if (!containerStockMap[row.productId]) containerStockMap[row.productId] = {};
      if (!containerStockMap[row.productId][row.locationId])
        containerStockMap[row.productId][row.locationId] = [];
      containerStockMap[row.productId][row.locationId].push(row._id);
    }
  }

  // זיהוי קונפליקטים
  const conflicts = {};
  const stocks = {};
  for (const item of formData.items) {
    if (item.isTs && lastStateMap[item.sn]) conflicts[item.sn] = lastStateMap[item.sn];
    if (!item.isTs && containerStockMap[item.productId]) {
      const byLocation = Object.entries(containerStockMap[item.productId])
        .map(([locId, rowIds]) => ({ locId, count: rowIds.length, rowIds }));
      stocks[item.productId] = { count: byLocation.reduce((s, l) => s + l.count, 0), byLocation };
    }
  }

  const unresolvedConflicts = {};
  const unresolvedStocks = {};
  for (const item of formData.items) {
    if (item.isTs && conflicts[item.sn] && !item.closeOldRowId)
      unresolvedConflicts[item.sn] = conflicts[item.sn];
    if (!item.isTs && formData.teamId !== mainTeamId && stocks[item.productId] && !item.closeOldRowIds)
      unresolvedStocks[item.productId] = stocks[item.productId];
  }

  if (Object.keys(unresolvedConflicts).length > 0 || Object.keys(unresolvedStocks).length > 0) {
    return res.json({ needsConfirmation: true, conflicts: unresolvedConflicts, stocks: unresolvedStocks });
  }

  // שמירה
  const actionMap = Object.fromEntries(
    (await Action.find().lean()).map(a => [a._id, a.name])
  );
  const signeeUuid = await getOrCreateSigneeId(formData.signeeName, formData.signeeID);

  const timestamp = new Date();
  const newRows = [];
  const updates = [];

  for (const item of formData.items) {
    const qty = parseInt(item.qty) || 1;
    for (let i = 0; i < qty; i++) {
      const rowId = uuidv4();
      const prevId = item.closeOldRowId || (item.closeOldRowIds?.[i]) || '';
      const actionId = item.actionNote || formData.action;

      if (prevId) updates.push({ id: prevId, statusId: actionId, statusName: actionMap[actionId] || 'לא ידוע' });

      newRows.push({
        _id:          rowId,
        date:         timestamp,
        issuerName:   formData.issuerName,
        issuerId:     formData.issuerId,
        actionName:   actionMap[actionId] || 'לא ידוע',
        actionId,
        prevId,
        teamName:     formData.teamName,
        teamId:       formData.teamId,
        productName:  item.productName,
        productId:    item.productId,
        sn:           item.sn || '',
        qty:          1,
        locationName: formData.locationName,
        locationId:   formData.locationId,
        signeeName:   formData.signeeName,
        signeeUuid,
        statusName:   CONFIG.DISPLAY_NAMES.ACTIVE_STATUS,
        statusId:     CONFIG.ACTIONS.ACTIVE,
      });
    }
  }

  if (newRows.length > 0) await Transaction.insertMany(newRows);
  if (updates.length > 0) {
    await Promise.all(updates.map(u =>
      Transaction.findByIdAndUpdate(u.id, { statusName: u.statusName, statusId: u.statusId })
    ));
  }

  res.json({ saved: true });
});

async function getOrCreateSigneeId(name, signeeId) {
  if (!name || !signeeId) return '';
  const existing = await Signee.findOne({ name: name.trim(), signeeId: signeeId.trim() });
  if (existing) return existing._id;
  const newId = uuidv4();
  await Signee.create({ _id: newId, name, signeeId, status: 'active' });
  return newId;
}

module.exports = router;
