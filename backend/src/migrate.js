/**
 * סקריפט ייבוא חד-פעמי מ-CSV ל-MongoDB
 * הרצה: node src/migrate.js
 * דרישה: קבצי CSV בתיקיית backend/data/
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');

const User        = require('./models/User');
const Team        = require('./models/Team');
const Location    = require('./models/Location');
const Catalog     = require('./models/Catalog');
const Action      = require('./models/Action');
const Signee      = require('./models/Signee');
const Transaction = require('./models/Transaction');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readCsv(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  לא נמצא: ${filename} — מדלג`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, { skip_empty_lines: true, from_line: 2 }); // שורה 1 = כותרות
}

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ מחובר ל-MongoDB\n');

  // --- Users ---
  const users = readCsv('Users.csv').map(r => ({
    _id:   r[0], name: r[1], email: (r[2] || '').toLowerCase().trim(),
  })).filter(u => u._id && u.email);
  if (users.length) {
    await User.deleteMany({});
    await User.insertMany(users, { ordered: false });
    console.log(`👤 Users: ${users.length} רשומות`);
  }

  // --- Teams ---
  const teams = readCsv('Teams.csv').map(r => ({
    _id: r[0], name: r[1], role: r[2] || '', status: r[3] || 'active',
  })).filter(t => t._id);
  if (teams.length) {
    await Team.deleteMany({});
    await Team.insertMany(teams, { ordered: false });
    console.log(`👥 Teams: ${teams.length} רשומות`);
  }

  // --- Locations ---
  const locations = readCsv('Locations.csv').map(r => ({
    _id: r[0], name: r[1], status: r[3] || 'active',
  })).filter(l => l._id);
  if (locations.length) {
    await Location.deleteMany({});
    await Location.insertMany(locations, { ordered: false });
    console.log(`📍 Locations: ${locations.length} רשומות`);
  }

  // --- Actions ---
  const actions = readCsv('Actions.csv').map(r => ({
    _id: r[0], name: r[1], badge: r[2] || '', statusPage: r[3] || '',
  })).filter(a => a._id);
  if (actions.length) {
    await Action.deleteMany({});
    await Action.insertMany(actions, { ordered: false });
    console.log(`⚡ Actions: ${actions.length} רשומות`);
  }

  // --- Signees ---
  const signees = readCsv('Signees.csv').map(r => ({
    _id: r[0], name: r[1], signeeId: r[2] || '', status: r[3] || 'active',
  })).filter(s => s._id);
  if (signees.length) {
    await Signee.deleteMany({});
    await Signee.insertMany(signees, { ordered: false });
    console.log(`✍️  Signees: ${signees.length} רשומות`);
  }

  // --- Catalog ---
  const catalog = readCsv('Catalog.csv').map(r => ({
    _id:       r[0],
    name:      r[1],
    nickname:  r[2] || '',
    related:   r[3] || '',
    pn:        r[4] || '',
    type:      r[5] === 'SN' ? 'SN' : 'Generic',
    sortOrder: r[6] !== '' && r[6] != null ? Number(r[6]) : null,
    status:    r[7] || 'active',
  })).filter(c => c._id);
  if (catalog.length) {
    await Catalog.deleteMany({});
    await Catalog.insertMany(catalog, { ordered: false });
    console.log(`📦 Catalog: ${catalog.length} רשומות`);
  }

  // --- Transactions ---
  const txRows = readCsv('Transactions.csv');
  if (txRows.length) {
    const transactions = txRows.map(r => ({
      _id:          r[0],
      date:         r[1] ? new Date(r[1]) : new Date(),
      issuerName:   r[2] || '',
      issuerId:     r[3] || '',
      actionName:   r[4] || '',
      actionId:     r[5] || '',
      prevId:       r[6] || '',
      teamName:     r[7] || '',
      teamId:       r[8] || '',
      productName:  r[9] || '',
      productId:    r[10] || '',
      sn:           r[11] || '',
      qty:          Number(r[12]) || 1,
      locationName: r[13] || '',
      locationId:   r[14] || '',
      signeeName:   r[15] || '',
      signeeUuid:   r[16] || '',
      statusName:   r[17] || '',
      statusId:     r[18] || '',
    })).filter(t => t._id && t.actionId);

    await Transaction.deleteMany({});
    // מייבא ב-batches של 1000 כדי לא להעמיס
    const BATCH = 1000;
    for (let i = 0; i < transactions.length; i += BATCH) {
      await Transaction.insertMany(transactions.slice(i, i + BATCH), { ordered: false });
      process.stdout.write(`\r🔄 Transactions: ${Math.min(i + BATCH, transactions.length)}/${transactions.length}`);
    }
    console.log(`\n✅ Transactions: ${transactions.length} רשומות`);
  }

  console.log('\n🎉 ייבוא הושלם בהצלחה!');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ שגיאה בייבוא:', err.message);
  process.exit(1);
});
