// מקביל ל-Config.js המקורי — IDs קבועים, שמות עשויים להשתנות
module.exports = {
  ACTIONS: {
    NIPUK:    '89dd3dd8-0eab-4cab-a31a-0386a4407d15',
    ZIKUY:    '0e7d96cd-542c-4584-9d26-352fdc703324',
    TRANSFER: 'b0d0e2de-4431-4a7e-a3ef-6243b5a7c241',
    ACTIVE:   'cfdb4b6a-9827-42db-be70-477177c3e983',
  },
  DISPLAY_NAMES: {
    ACTIVE_STATUS: 'active',
  },
  CATALOG: {
    TYPE_SN:      'SN',
    TYPE_GENERIC: 'Generic',
  },
  TEAMS: {
    ROLE_MAIN:     'main_team',
    ROLE_EXTERNAL: 'external_team',
  },
  ACTION_BADGES: {
    STORAGE: 'storage',
    FAULTY:  'faulty',
  },
  // IDs של actions עם badge=storage / badge=faulty — למלא אחרי ייבוא נתונים
  STORAGE_BADGE_IDS: [],
  FAULTY_BADGE_IDS:  [],
};
