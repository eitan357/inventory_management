/**
 * Kishur-Log Backend - V3.1 Max-Performance
 * Configured with Centralized Constants
 */

function doGet() {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("קשר-אלוג (Kishur-Log)")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function FILL_MISSING_IDS() {
  const sheetsToFix = [
    DB_CONFIG.SHEETS.CATALOG,
    DB_CONFIG.SHEETS.TEAMS,
    DB_CONFIG.SHEETS.LOCATIONS,
    DB_CONFIG.SHEETS.ACTIONS,
    DB_CONFIG.SHEETS.SIGNEES,
  ];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summary = [];
  let totalFixed = 0;

  sheetsToFix.forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0] || data[i][0].toString().trim() === "") {
        sheet.getRange(i + 1, 1).setValue(Utilities.getUuid());
        count++;
      }
    }
    if (count > 0) {
      summary.push(`  ${sheetName}: ${count}`);
      totalFixed += count;
    }
  });

  const msg =
    totalFixed === 0
      ? "✅ לא נמצאו שורות ללא ID — הכל תקין"
      : `✅ תהליך מילוי ה-IDs הסתיים בהצלחה!\nסה"כ: ${totalFixed} IDs נוצרו\n${summary.join("\n")}`;
  console.log(msg);
  return msg;
}

/**
 * getPrefetchedReports — מחזיר את דוח המלאי ודוח הצ' בקריאה אחת לשרת.
 * קורא TRANSACTIONS ו-ACTIONS פעם אחת בלבד (במקום פעמיים).
 * @returns {{ inventory: Array, tsReport: Object } | { _error: string }}
 */
function getPrefetchedReports() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const data = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS).getDataRange().getValues();
    const actionsRaw = ss.getSheetByName(DB_CONFIG.SHEETS.ACTIONS).getDataRange().getValues();

    const { actionMap, storageBadgeIds, faultyBadgeIds } = _buildActionMaps(actionsRaw);
    const { rowTeamMap, rowSigneeMap } = _buildPrevRowMaps(data);

    // ---- דוח צ' ----
    const tsReport = {};
    if (data.length > 1) {
      const lastStateMap = {};
      for (let i = 1; i < data.length; i++) {
        const row      = data[i];
        const sn       = String(row[11]).trim();
        const statusId = String(row[18]);
        if (!sn) continue;
        if (statusId === SERVER_CONFIG.ACTIONS.ACTIVE) {
          const actionId = String(row[5]);
          const prevId   = String(row[6]);
          const isAfasna = storageBadgeIds.has(actionId);
          lastStateMap[sn] = {
            pId:          String(row[10]),
            teamId:       String(row[8]),
            signeeId:     String(row[16]),
            locationId:   String(row[14]),
            actionId,
            prevTeamId:   isAfasna && prevId ? rowTeamMap[prevId]   || null : null,
            prevSigneeId: isAfasna && prevId ? rowSigneeMap[prevId] || null : null,
            date:         row[1] ? String(row[1]) : "",
          };
        } else {
          delete lastStateMap[sn];
        }
      }
      Object.keys(lastStateMap).forEach((sn) => {
        const item = lastStateMap[sn];
        if (!tsReport[item.pId]) tsReport[item.pId] = [];
        tsReport[item.pId].push({
          sn,
          teamId:       item.teamId,
          signeeId:     item.signeeId,
          locationId:   item.locationId,
          actionId:     item.actionId,
          prevTeamId:   item.prevTeamId,
          prevSigneeId: item.prevSigneeId,
          date:         item.date,
        });
      });
    }

    // ---- דוח מלאי ----
    const teamMap     = _buildLookupMap(ss, DB_CONFIG.SHEETS.TEAMS);
    const locationMap = _buildLookupMap(ss, DB_CONFIG.SHEETS.LOCATIONS);
    const productMap  = _buildCatalogLookupMap(ss);
    const signeeMap   = _buildLookupMap(ss, DB_CONFIG.SHEETS.SIGNEES);

    const aggMap = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[18]) !== SERVER_CONFIG.ACTIONS.ACTIVE) continue;

      const productId = String(row[10]);
      const locationId = String(row[14]);
      const actionId   = String(row[5]);
      const prevId     = String(row[6]);

      const isAfasna = storageBadgeIds.has(actionId);
      const teamId   = isAfasna && prevId && rowTeamMap[prevId]   ? rowTeamMap[prevId]   : String(row[8]);
      const signeeId = isAfasna && prevId && rowSigneeMap[prevId] ? rowSigneeMap[prevId] : String(row[16]);

      const isFaulty    = faultyBadgeIds.has(actionId);
      const keyActionId = isAfasna || isFaulty ? actionId : "ACTIVE";
      const key         = [productId, teamId, locationId, signeeId, keyActionId].join("|");

      if (!aggMap[key]) {
        aggMap[key] = {
          productId,
          productName:  productMap[productId]  || productId,
          teamId,
          teamName:     teamMap[teamId]         || teamId,
          locationId,
          locationName: locationMap[locationId] || locationId,
          signeeId,
          signeeName:   signeeMap[signeeId]     || signeeId,
          qty:          0,
          actionId:     keyActionId,
          actionName:   actionMap[keyActionId === "ACTIVE" ? SERVER_CONFIG.ACTIONS.ACTIVE : actionId] || actionId,
        };
      }
      aggMap[key].qty++;
    }

    return { inventory: Object.values(aggMap), tsReport };
  } catch (e) {
    Logger.log("[PREFETCH] ERROR: " + e.message);
    return { _error: e.message };
  }
}

// טעינה ראשונית - שימוש בקבועים
function getStartupData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsToRead = [
    DB_CONFIG.SHEETS.USERS,
    DB_CONFIG.SHEETS.TEAMS,
    DB_CONFIG.SHEETS.LOCATIONS,
    DB_CONFIG.SHEETS.CATALOG,
    DB_CONFIG.SHEETS.ACTIONS,
    DB_CONFIG.SHEETS.SIGNEES,
  ];

  const db = {};
  sheetsToRead.forEach(
    (s) => (db[s] = ss.getSheetByName(s).getDataRange().getValues()),
  );

  let email =
    Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  const userRow = db[DB_CONFIG.SHEETS.USERS].find(
    (r) =>
      r[2] &&
      r[2].toString().toLowerCase().trim() === email.toLowerCase().trim(),
  );

  if (!userRow) return JSON.stringify({ authorized: false });

  return JSON.stringify({
    authorized: true,
    user: { id: String(userRow[0]), name: String(userRow[1]) },
    teams: db[DB_CONFIG.SHEETS.TEAMS]
      .slice(1)
      .filter((r) => String(r[3]) === SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS)
      .map((r) => ({
        id: String(r[0]),
        name: String(r[1]),
        role: String(r[2] || ""),
      })),
    locations: db[DB_CONFIG.SHEETS.LOCATIONS]
      .slice(1)
      .filter((r) => String(r[3]) === SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS)
      .map((r) => ({ id: String(r[0]), name: String(r[1]) })),
    actions: db[DB_CONFIG.SHEETS.ACTIONS].slice(1).map((r) => ({
      id: String(r[0]),
      name: String(r[1]),
      badge: String(r[2] || ""),
      statusPage: String(r[3] || ""),
    })),
    signees: db[DB_CONFIG.SHEETS.SIGNEES]
      .slice(1)
      .filter((r) => String(r[3]) === SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS)
      .map((r) => ({
        id: String(r[0]),
        name: String(r[1]),
        signeeId: String(r[2]),
      })),
    catalog: db[DB_CONFIG.SHEETS.CATALOG]
      .slice(1)
      .filter((r) => String(r[7]) === SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS)
      .map((r) => ({
        id: String(r[0]),
        name: String(r[1]),
        nickname: String(r[2] || ""),
        related: String(r[3] || ""),
        pn: String(r[4] || ""),
        type: String(r[5] || SERVER_CONFIG.CATALOG.TYPE_GENERIC),
        sortOrder: r[6] !== undefined && r[6] !== "" ? Number(r[6]) : null,
      })),
    config: {
      ACTION_NIPUK_ID: SERVER_CONFIG.ACTIONS.NIPUK,
      ACTION_ZIKUY_ID: SERVER_CONFIG.ACTIONS.ZIKUY,
      ACTION_TRANSFER_ID: SERVER_CONFIG.ACTIONS.TRANSFER,
      STATUS_ACTIVE_NAME: SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS,
      CATALOG_TYPE_SN: SERVER_CONFIG.CATALOG.TYPE_SN,
      CATALOG_TYPE_GENERIC: SERVER_CONFIG.CATALOG.TYPE_GENERIC,
      TEAM_ROLE_MAIN: SERVER_CONFIG.TEAMS.ROLE_MAIN,
      TEAM_ROLE_EXTERNAL: SERVER_CONFIG.TEAMS.ROLE_EXTERNAL,
      ACTION_BADGE_STORAGE: SERVER_CONFIG.ACTION_BADGES.STORAGE,
      ACTION_BADGE_FAULTY: SERVER_CONFIG.ACTION_BADGES.FAULTY,
    },
  });
}

/**
 * validateAndSave — מאמת ושומר בבקשה אחת לשרת.
 * אם נמצאו קונפליקטים שלא טופלו — מחזיר { needsConfirmation, conflicts, stocks } ללא שמירה.
 * אם הכל תקין — יוצר חותם במידת הצורך, שומר ומחזיר { saved: true }.
 */
function validateAndSave(formData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainTeamId = String(formData.mainTeamId || "");
  const sheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);
  const lastRow = sheet.getLastRow();

  const conflicts = {};
  const stocks = {};

  if (lastRow > 1) {
    const data = sheet.getRange(1, 1, lastRow, 19).getValues();
    const lastStateMap = {};
    const containerStockMap = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const sn = String(row[11]).trim();
      const pId = String(row[10]);
      const teamId = String(row[8]);
      const locId = String(row[14]);
      const statusId = String(row[18]);

      if (sn && statusId === SERVER_CONFIG.ACTIONS.ACTIVE) {
        lastStateMap[sn] = { rowId: row[0], teamId };
      }
      if (teamId === mainTeamId && statusId === SERVER_CONFIG.ACTIONS.ACTIVE) {
        if (!containerStockMap[pId]) containerStockMap[pId] = {};
        if (!containerStockMap[pId][locId]) containerStockMap[pId][locId] = [];
        containerStockMap[pId][locId].push(row[0]);
      }
    }

    formData.items.forEach((item) => {
      if (item.isTs && lastStateMap[item.sn])
        conflicts[item.sn] = lastStateMap[item.sn];
      if (!item.isTs && containerStockMap[item.productId]) {
        const byLocation = Object.entries(
          containerStockMap[item.productId],
        ).map(([locId, rowIds]) => ({ locId, count: rowIds.length, rowIds }));
        stocks[item.productId] = {
          count: byLocation.reduce((s, l) => s + l.count, 0),
          byLocation,
        };
      }
    });
  }

  // בדיקת קונפליקטים שלא טופלו (צ' פעיל ללא closeOldRowId)
  const unresolvedConflicts = {};
  formData.items.forEach((item) => {
    if (item.isTs && conflicts[item.sn] && !item.closeOldRowId) {
      unresolvedConflicts[item.sn] = conflicts[item.sn];
    }
  });

  // בדיקת מלאי מכולה שלא טופל — רק לצוות שאינו קשר
  const unresolvedStocks = {};
  if (formData.teamId !== mainTeamId) {
    formData.items.forEach((item) => {
      if (!item.isTs && stocks[item.productId] && !item.closeOldRowIds) {
        unresolvedStocks[item.productId] = stocks[item.productId];
      }
    });
  }

  if (
    Object.keys(unresolvedConflicts).length > 0 ||
    Object.keys(unresolvedStocks).length > 0
  ) {
    return {
      needsConfirmation: true,
      conflicts: unresolvedConflicts,
      stocks: unresolvedStocks,
    };
  }

  // שמירה — טעינת ACTIONS ו-SIGNEES בלבד
  const actionsData = ss
    .getSheetByName(DB_CONFIG.SHEETS.ACTIONS)
    .getDataRange()
    .getValues();
  const signeesData = ss
    .getSheetByName(DB_CONFIG.SHEETS.SIGNEES)
    .getDataRange()
    .getValues();
  const actionMap = Object.fromEntries(actionsData.map((r) => [r[0], r[1]]));
  const signeeUuid = getOrCreateSigneeId(
    ss,
    signeesData,
    formData.signeeName,
    formData.signeeID,
  );

  const timestamp = new Date();
  const rowsToAdd = [];
  const updatesToPerform = [];

  formData.items.forEach((item) => {
    const qty = parseInt(item.qty) || 1;
    for (let i = 0; i < qty; i++) {
      const rowId = Utilities.getUuid();
      const currentPrevId =
        item.closeOldRowId ||
        (item.closeOldRowIds && item.closeOldRowIds[i]) ||
        "";
      const currentActionId = item.actionNote || formData.action;
      const currentActionName = actionMap[currentActionId] || "לא ידוע";

      if (currentPrevId) {
        updatesToPerform.push({
          id: currentPrevId,
          statusId: currentActionId,
          statusName: currentActionName,
        });
      }

      rowsToAdd.push([
        rowId,
        timestamp,
        formData.issuerName,
        formData.issuerId,
        currentActionName,
        currentActionId,
        currentPrevId,
        formData.teamName,
        formData.teamId,
        item.productName,
        item.productId,
        item.sn || "",
        1,
        formData.locationName,
        formData.locationId,
        formData.signeeName,
        signeeUuid,
        SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS,
        SERVER_CONFIG.ACTIONS.ACTIVE,
      ]);
    }
  });

  if (rowsToAdd.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 19)
      .setValues(rowsToAdd);
  }
  if (updatesToPerform.length > 0)
    batchUpdateStatusesOptimized(ss, updatesToPerform);

  return { saved: true };
}

function batchUpdateStatusesOptimized(ss, updates) {
  const sheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);
  const ids = sheet
    .getRange("A:A")
    .getValues()
    .map((r) => r[0]);

  updates.forEach((update) => {
    const rowIndex = ids.indexOf(update.id);
    if (rowIndex > -1) {
      sheet
        .getRange(rowIndex + 1, 18, 1, 2)
        .setValues([[update.statusName, update.statusId]]);
    }
  });
}

function getOrCreateSigneeId(ss, signeeData, name, signeeId) {
  if (!name || !signeeId) return "";
  const existing = signeeData.find(
    (r) =>
      String(r[1]).trim() === String(name).trim() &&
      String(r[2]).trim() === String(signeeId).trim(),
  );
  if (existing) return String(existing[0]);
  const newUuid = Utilities.getUuid();
  ss.getSheetByName(DB_CONFIG.SHEETS.SIGNEES).appendRow([
    newUuid,
    name,
    signeeId,
    SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS,
  ]);
  return newUuid;
}

/**
 * שליפת מלאי של צוות ספציפי כולל מזהי שורות לסגירה
 */
function getTeamInventory(teamId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1)
    return { products: [], sns: {}, rowIds: {}, locations: [] };

  const inventory = {};
  const snsByProduct = {};
  const rowIdsByProduct = {};
  const uniqueLocIds = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (
      String(row[18]) !== SERVER_CONFIG.ACTIONS.ACTIVE ||
      String(row[8]) !== teamId
    )
      continue;

    const pId = String(row[10]);
    const sn = String(row[11]).trim();
    const locId = String(row[14]);

    if (locId) uniqueLocIds.add(locId);

    // מפתח המלאי יכלול עכשיו גם את המיקום כדי שנוכל לפלטר ב-Frontend
    const invKey = pId + "_" + locId;

    if (!inventory[invKey]) {
      inventory[invKey] = {
        id: pId,
        qty: 0,
        type: sn
          ? SERVER_CONFIG.CATALOG.TYPE_SN
          : SERVER_CONFIG.CATALOG.TYPE_GENERIC,
        locId: locId,
      };
      rowIdsByProduct[invKey] = [];
    }

    inventory[invKey].qty++;

    if (sn) {
      if (!snsByProduct[invKey]) snsByProduct[invKey] = [];
      snsByProduct[invKey].push({ sn: sn, rowId: row[0] });
    } else {
      rowIdsByProduct[invKey].push(row[0]);
    }
  }

  return {
    products: Object.values(inventory),
    sns: snsByProduct,
    rowIds: rowIdsByProduct,
    locations: [...uniqueLocIds].map((id) => ({ id })),
  };
}

/**
 * _buildPrevRowMaps — פונקציית עזר משותפת לדוח צ' ולדוח מלאי.
 * בונה מיפוי rowId → teamId ו-rowId → signeeId מכל שורות ה-Transactions.
 * משמש לפתרון צוות/חותם מהשורה הקודמת עבור שורות אפסנה (PreviousID).
 * @param {Array} data - כל שורות הגיליון (כולל כותרת)
 * @returns {{ rowTeamMap: Object, rowSigneeMap: Object }}
 */
function _buildPrevRowMaps(data) {
  const rowTeamMap = {};
  const rowSigneeMap = {};
  for (let i = 1; i < data.length; i++) {
    rowTeamMap[String(data[i][0])] = String(data[i][8]);
    rowSigneeMap[String(data[i][0])] = String(data[i][16]);
  }
  return { rowTeamMap, rowSigneeMap };
}

/** בונה מפת id→name (עם fallback name→name) מגיליון כלשהו */
function _buildLookupMap(ss, sheetName) {
  const rows = ss.getSheetByName(sheetName).getDataRange().getValues();
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][0]), name = String(rows[i][1]);
    map[id] = name;
    if (!map[name]) map[name] = name;
  }
  return map;
}

/** בונה מפת id→displayName לקטלוג (כולל nickname) */
function _buildCatalogLookupMap(ss) {
  const rows = ss.getSheetByName(DB_CONFIG.SHEETS.CATALOG).getDataRange().getValues();
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    const id       = String(rows[i][0]);
    const name     = String(rows[i][1]);
    const nickname = String(rows[i][2] || "").trim();
    const display  = nickname ? `${nickname} - ${name}` : name;
    map[id] = display;
    if (!map[name]) map[name] = display;
  }
  return map;
}

/** בונה actionMap + storageBadgeIds + faultyBadgeIds מנתוני גיליון Actions */
function _buildActionMaps(actionsRaw) {
  const actionMap       = {};
  const storageBadgeIds = new Set();
  const faultyBadgeIds  = new Set();
  for (let i = 1; i < actionsRaw.length; i++) {
    const id    = String(actionsRaw[i][0]);
    const name  = String(actionsRaw[i][1]);
    const badge = String(actionsRaw[i][2] || "");
    actionMap[id] = name;
    if (!actionMap[name]) actionMap[name] = name;
    if (badge === SERVER_CONFIG.ACTION_BADGES.STORAGE) storageBadgeIds.add(id);
    if (badge === SERVER_CONFIG.ACTION_BADGES.FAULTY)  faultyBadgeIds.add(id);
  }
  return { actionMap, storageBadgeIds, faultyBadgeIds };
}

/**
 * מייצר דוח סטטוס נוכחי של כל מכשירי ה-צ' במערכת
 * מחזיר אובייקט מקובץ לפי שם מוצר
 */
function getDetailedTsReport(teamId = null) {
  try {
    Logger.log("[TS] getDetailedTsReport started, teamId=" + teamId);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const transSheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);
    Logger.log(
      "[TS] transSheet found: " +
        (transSheet !== null) +
        ", name: " +
        (transSheet ? transSheet.getName() : "null") +
        ", expected: " +
        DB_CONFIG.SHEETS.TRANSACTIONS,
    );
    if (!transSheet) return { _error: "גיליון Transactions לא נמצא" };
    const data = transSheet.getDataRange().getValues();
    Logger.log("[TS] data rows: " + data.length);

    if (data.length <= 1) return {};

    const actionsRaw = ss.getSheetByName(DB_CONFIG.SHEETS.ACTIONS).getDataRange().getValues();
    const { storageBadgeIds } = _buildActionMaps(actionsRaw);

    // מעבר ראשון: מיפוי rowId → teamId ו-signeeId לצורך בדיקת בעלים קודמים (אפסנה)
    const { rowTeamMap, rowSigneeMap } = _buildPrevRowMaps(data);

    const report = {};
    const lastStateMap = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const sn = String(row[11]).trim();
      const statusId = String(row[18]);
      const pId = String(row[10]);
      const rowTeamId = String(row[8]);
      const signeeId = String(row[16]);
      const locationId = String(row[14]);
      const actionId = String(row[5]);
      const prevId = String(row[6]);

      if (sn && sn !== "") {
        // אם נשלח פילטור לפי צוות, נכלול רק שורות של הצוות — או אפסנה שהצוות הקודם שלה תואם
        if (teamId) {
          const isAfasnaOfFilteredTeam =
            storageBadgeIds.has(actionId) &&
            prevId &&
            prevId !== "" &&
            rowTeamMap[prevId] === teamId;
          if (rowTeamId !== teamId && !isAfasnaOfFilteredTeam) continue;
        }
        // הסינון של צוותים חיצוניים (חטיבה 215, אוגדה 162) מתבצע בצד הלקוח

        if (statusId === SERVER_CONFIG.ACTIONS.ACTIVE) {
          const isAfasna = storageBadgeIds.has(actionId);
          const prevTeamId =
            isAfasna && prevId ? rowTeamMap[prevId] || null : null;
          const prevSigneeId =
            isAfasna && prevId ? rowSigneeMap[prevId] || null : null;
          lastStateMap[sn] = {
            pId,
            teamId: rowTeamId,
            signeeId,
            locationId,
            actionId,
            prevTeamId,
            prevSigneeId,
            date: row[1] ? String(row[1]) : "",
          };
        } else {
          delete lastStateMap[sn];
        }
      }
    }

    Object.keys(lastStateMap).forEach((sn) => {
      const item = lastStateMap[sn];
      if (!report[item.pId]) report[item.pId] = [];
      report[item.pId].push({
        sn,
        teamId: item.teamId,
        signeeId: item.signeeId,
        locationId: item.locationId,
        actionId: item.actionId,
        prevTeamId: item.prevTeamId,
        prevSigneeId: item.prevSigneeId,
        date: item.date,
      });
    });

    Logger.log(
      "[TS] report keys: " +
        Object.keys(report).length +
        ", items: " +
        Object.values(report).reduce((s, a) => s + a.length, 0),
    );
    return report;
  } catch (e) {
    Logger.log("[TS] CAUGHT ERROR: " + e.message + " | stack: " + e.stack);
    return { _error: e.message || String(e) };
  }
}

function addNewSignee(data) {
  const name = data.name;
  const signeeId = data.signeeId;

  if (!name || !signeeId) throw new Error("חסרים שם או מספר אישי");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DB_CONFIG.SHEETS.SIGNEES);
  const signeeData = sheet.getDataRange().getValues();

  // בדיקה אם החותם כבר קיים (לפי שם + מספר אישי)
  const existing = signeeData
    .slice(1)
    .find(
      (r) =>
        String(r[1]).trim() === name.trim() &&
        String(r[2]).trim() === signeeId.trim(),
    );
  if (existing) {
    return {
      id: String(existing[0]),
      name: String(existing[1]),
      signeeId: String(existing[2]),
    };
  }

  // יצירת חותם חדש
  const newId = Utilities.getUuid();
  sheet.appendRow([
    newId,
    name,
    signeeId,
    SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS,
  ]);

  return { id: newId, name: name, signeeId: signeeId };
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * createSheetsExport — יוצר Google Sheet חדש עם הנתונים ומחזיר את ה-URL שלו.
 * @param {Object} payload
 *   title   — שם הגיליון
 *   headers — מערך כותרות עמודות
 *   data    — מערך דו-ממדי של ערכים (מחרוזות)
 */
function createSheetsExport(payload) {
  const { title, headers, data } = payload;
  const ss = SpreadsheetApp.create(title || "דוח");
  const sheet = ss.getActiveSheet();

  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#1a73e8")
    .setFontColor("#ffffff");

  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  return ss.getUrl();
}

