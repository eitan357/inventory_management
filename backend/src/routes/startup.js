const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Team = require('../models/Team');
const Location = require('../models/Location');
const Catalog = require('../models/Catalog');
const Action = require('../models/Action');
const Signee = require('../models/Signee');

const CONFIG = require('../config');

// GET /api/startup?email=...
router.get('/', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();

  const user = await User.findOne({ email });
  if (!user) return res.json({ authorized: false });

  const [teams, locations, catalog, actions, signees] = await Promise.all([
    Team.find({ status: 'active' }),
    Location.find({ status: 'active' }),
    Catalog.find({ status: 'active' }).sort({ sortOrder: 1 }),
    Action.find(),
    Signee.find({ status: 'active' }),
  ]);

  res.json({
    authorized: true,
    user: { id: user._id, name: user.name },
    teams: teams.map(t => ({ id: t._id, name: t.name, role: t.role })),
    locations: locations.map(l => ({ id: l._id, name: l.name })),
    catalog: catalog.map(c => ({
      id: c._id, name: c.name, nickname: c.nickname,
      related: c.related, pn: c.pn, type: c.type, sortOrder: c.sortOrder,
    })),
    actions: actions.map(a => ({
      id: a._id, name: a.name, badge: a.badge, statusPage: a.statusPage,
    })),
    signees: signees.map(s => ({ id: s._id, name: s.name, signeeId: s.signeeId })),
    config: CONFIG,
  });
});

module.exports = router;
