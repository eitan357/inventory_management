/**
 * קישור-לוג: מערכת בדיקות אוטומטית V3.1 - מותאם לאופטימיזציה
 * בדיקת שרשרת אספקה מלאה: מכולה -> צוות א -> צוות ב -> זיכוי לקשר
 */

// ─────────────────────────────────────────────────────────────────
// RUN_ALL_UNIT_TESTS — מפעיל את כל ה-Suites ברצף ומדפיס סיכום כולל
// ─────────────────────────────────────────────────────────────────
function RUN_ALL_UNIT_TESTS() {
  const suites = [
    { name: "getOrCreateSigneeId",           fn: RUN_SIGNEE_UNIT_TESTS },
    { name: "addNewSignee",                  fn: RUN_ADD_SIGNEE_UNIT_TESTS },
    { name: "validateAndSave",               fn: RUN_VALIDATE_AND_SAVE_UNIT_TESTS },
    { name: "batchUpdateStatusesOptimized",  fn: RUN_BATCH_UPDATE_UNIT_TESTS },
    { name: "getTeamInventory",              fn: RUN_TEAM_INVENTORY_UNIT_TESTS },
    { name: "getDetailedTsReport",           fn: RUN_TS_REPORT_UNIT_TESTS },
    { name: "getStartupData",                fn: RUN_STARTUP_DATA_UNIT_TESTS },
    { name: "getPrefetchedReports",          fn: RUN_PREFETCH_REPORTS_UNIT_TESTS },
  ];

  const totalStart = new Date();
  const failedSuites = [];

  console.log("\n" + "█".repeat(55));
  console.log("  🚀 RUN_ALL_UNIT_TESTS — מריץ " + suites.length + " suites");
  console.log("█".repeat(55));

  suites.forEach(suite => {
    try {
      suite.fn();
    } catch (e) {
      console.error(`❌ Suite "${suite.name}" קרסה לחלוטין: ${e.message}`);
      failedSuites.push(suite.name);
    }
  });

  // קריאת לוג הסיכום — נספור מה הודפס על ידי printUnitTestReport
  // (כל suite מדפיס בעצמה; כאן רק מסיימים עם שורת סיכום כוללת)
  const totalDuration = ((new Date() - totalStart) / 1000).toFixed(2);
  console.log("\n" + "█".repeat(55));
  console.log("  ✅ כל ה-Suites הסתיימו | זמן כולל: " + totalDuration + "s");
  if (failedSuites.length > 0) {
    console.log("  ⚠️  Suites שקרסו: " + failedSuites.join(", "));
  }
  console.log("█".repeat(55) + "\n");
}

// ─────────────────────────────────────────────────────────────────
// Unit Tests — getOrCreateSigneeId
// ─────────────────────────────────────────────────────────────────

/**
 * גרסה שאינה זורקת שגיאה הלאה — מאפשרת לשאר הבדיקות להמשיך רץ גם אחרי כשל.
 * (testStep הקיים מיועד לשרשרת שבה כל שלב תלוי בקודם)
 */
function testStepSafe(results, stepName, testFn) {
  try {
    const msg = testFn();
    results.push({ step: stepName, status: "✅", msg: msg || "עבר" });
  } catch (e) {
    results.push({ step: stepName, status: "❌", msg: e.message });
  }
}

function printUnitTestReport(results, suiteName, startTime) {
  const duration = ((new Date() - startTime) / 1000).toFixed(2);
  const passed = results.filter(r => r.status === "✅").length;
  const failed = results.filter(r => r.status === "❌").length;
  console.log(`\n${"=".repeat(55)}`);
  console.log(`🧪 Unit Tests — ${suiteName}`);
  console.log(`   עבר: ${passed}  |  נכשל: ${failed}  |  זמן: ${duration}s`);
  console.log("=".repeat(55));
  results.forEach(r => console.log(`  ${r.status} [${r.step}] → ${r.msg}`));
  console.log("=".repeat(55) + "\n");
}

/**
 * RUN_SIGNEE_UNIT_TESTS
 *
 * בודק את הפונקציה getOrCreateSigneeId (Code.js):
 *   - קריאה: נעשית על mockSigneeData שאנו שולטים בו לחלוטין → ללא תלות בגיליון אמיתי
 *   - כתיבה: הולכת לגיליון Signees האמיתי → מנוקה ב-finally לפי CLEANUP_MARKER
 *
 * 8 בדיקות:
 *   1. חותם קיים   → UUID הקיים מוחזר, אין כתיבה לגיליון
 *   2. חותם חדש    → UUID חדש מוחזר, שורה נוספת לגיליון
 *   3. name ריק    → מחזיר ""
 *   4. signeeId ריק → מחזיר ""
 *   5. שם זהה ID שונה → נחשב חותם חדש
 *   6. ID זהה שם שונה → נחשב חותם חדש
 *   7. רווחים בשם  → trim מוצא קיים, אין כתיבה
 *   8. רווחים ב-ID → trim מוצא קיים, אין כתיבה
 */
function RUN_SIGNEE_UNIT_TESTS() {
  const results = [];
  const startTime = new Date();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const signeeSheet = ss.getSheetByName(DB_CONFIG.SHEETS.SIGNEES);

  // כל שורה שנכתבת בבדיקות תקבל שם שמתחיל ב-CLEANUP_MARKER — כך הניקוי בטוח
  const CLEANUP_MARKER = "__UNIT_TEST__";

  function getSheetRowCount() {
    return signeeSheet.getLastRow();
  }

  function assertUuid(value, label) {
    // Apps Script UUIDs הם בפורמט xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    if (!value || !/^[0-9a-f-]{36}$/.test(value)) {
      throw new Error(`${label}: ערך לא תקין כ-UUID: "${value}"`);
    }
  }

  function assertNoNewRow(before, after, testName) {
    if (after !== before) {
      throw new Error(`${testName}: שורה חדשה נוצרה בגיליון בטעות (לפני: ${before}, אחרי: ${after})`);
    }
  }

  try {
    // ── בדיקה 1: חותם קיים — UUID הקיים מוחזר, ללא כתיבה ──────────────
    testStepSafe(results, "1. חותם קיים — UUID מוחזר", () => {
      const EXISTING_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
      const mockSigneeData = [
        ["id",          "name",         "signeePersonalId", "status"],
        [EXISTING_UUID, "ישראל ישראלי", "1234567",          "active" ],
      ];
      const before = getSheetRowCount();

      const result = getOrCreateSigneeId(ss, mockSigneeData, "ישראל ישראלי", "1234567");

      assertNoNewRow(before, getSheetRowCount(), "בדיקה 1");
      if (result !== EXISTING_UUID)
        throw new Error(`UUID שגוי — קיבלתי: "${result}", ציפיתי: "${EXISTING_UUID}"`);
      return `UUID נכון: ${result}`;
    });

    // ── בדיקה 2: חותם חדש — UUID חדש ושורה נוספת לגיליון ───────────────
    testStepSafe(results, "2. חותם חדש — UUID חדש + שורה נוספת", () => {
      const testName = CLEANUP_MARKER + "_new_signee";
      const testId   = CLEANUP_MARKER + "_new_id";
      const mockSigneeData = [
        ["id", "name", "signeePersonalId", "status"], // רשימה ריקה — אין חותמים קיימים
      ];
      const before = getSheetRowCount();

      const result = getOrCreateSigneeId(ss, mockSigneeData, testName, testId);

      assertUuid(result, "בדיקה 2");
      if (getSheetRowCount() !== before + 1)
        throw new Error(`שורה לא נוספה לגיליון (לפני: ${before}, אחרי: ${getSheetRowCount()})`);
      return `UUID חדש: ${result}`;
    });

    // ── בדיקה 3: name ריק — מחזיר "" ────────────────────────────────────
    testStepSafe(results, "3. name ריק — מחזיר string ריק", () => {
      const mockSigneeData = [["id", "name", "signeePersonalId", "status"]];
      const before = getSheetRowCount();

      const result = getOrCreateSigneeId(ss, mockSigneeData, "", "1234567");

      if (result !== "") throw new Error(`ציפיתי "", קיבלתי: "${result}"`);
      assertNoNewRow(before, getSheetRowCount(), "בדיקה 3");
      return 'מחזיר "" כצפוי';
    });

    // ── בדיקה 4: signeeId ריק — מחזיר "" ────────────────────────────────
    testStepSafe(results, "4. signeeId ריק — מחזיר string ריק", () => {
      const mockSigneeData = [["id", "name", "signeePersonalId", "status"]];
      const before = getSheetRowCount();

      const result = getOrCreateSigneeId(ss, mockSigneeData, "ישראל ישראלי", "");

      if (result !== "") throw new Error(`ציפיתי "", קיבלתי: "${result}"`);
      assertNoNewRow(before, getSheetRowCount(), "בדיקה 4");
      return 'מחזיר "" כצפוי';
    });

    // ── בדיקה 5: שם זהה, ID שונה — נחשב חותם חדש ───────────────────────
    testStepSafe(results, "5. שם זהה ID שונה — חותם חדש", () => {
      const testName = CLEANUP_MARKER + "_same_name";
      const mockSigneeData = [
        ["id",          "name",    "signeePersonalId", "status"],
        ["existing-id", testName,  "ID-ORIGINAL",      "active" ], // קיים עם ID שונה
      ];
      const before = getSheetRowCount();

      const result = getOrCreateSigneeId(ss, mockSigneeData, testName, "ID-DIFFERENT");

      if (result === "existing-id")
        throw new Error("החזיר את ה-UUID הקיים בטעות — הID שונה, אמור ליצור חדש");
      assertUuid(result, "בדיקה 5");
      if (getSheetRowCount() !== before + 1)
        throw new Error("שורה חדשה לא נוצרה");
      return `חותם חדש נוצר: ${result}`;
    });

    // ── בדיקה 6: ID זהה, שם שונה — נחשב חותם חדש ───────────────────────
    testStepSafe(results, "6. ID זהה שם שונה — חותם חדש", () => {
      const testId = CLEANUP_MARKER + "_same_id";
      const mockSigneeData = [
        ["id",          "name",       "signeePersonalId", "status"],
        ["existing-id", "שם מקורי",  testId,             "active" ], // קיים עם שם שונה
      ];
      const before = getSheetRowCount();

      const result = getOrCreateSigneeId(ss, mockSigneeData, "שם שונה לגמרי", testId);

      if (result === "existing-id")
        throw new Error("החזיר את ה-UUID הקיים בטעות — השם שונה, אמור ליצור חדש");
      assertUuid(result, "בדיקה 6");
      if (getSheetRowCount() !== before + 1)
        throw new Error("שורה חדשה לא נוצרה");
      return `חותם חדש נוצר: ${result}`;
    });

    // ── בדיקה 7: רווחים מסביב לשם — trim מוצא קיים ─────────────────────
    testStepSafe(results, "7. רווחים בשם — trim מוצא קיים", () => {
      const EXISTING_UUID = "ffffffff-1111-2222-3333-444444444444";
      const mockSigneeData = [
        ["id",          "name",         "signeePersonalId", "status"],
        [EXISTING_UUID, "שרה כהן",      "7654321",          "active" ],
      ];
      const before = getSheetRowCount();

      const result = getOrCreateSigneeId(ss, mockSigneeData, "  שרה כהן  ", "7654321");

      if (result !== EXISTING_UUID)
        throw new Error(`trim לא עבד — UUID שגוי: "${result}"`);
      assertNoNewRow(before, getSheetRowCount(), "בדיקה 7");
      return "trim עבד, UUID קיים הוחזר";
    });

    // ── בדיקה 8: רווחים מסביב ל-ID — trim מוצא קיים ────────────────────
    testStepSafe(results, "8. רווחים ב-ID — trim מוצא קיים", () => {
      const EXISTING_UUID = "gggggggg-5555-6666-7777-888888888888";
      const mockSigneeData = [
        ["id",          "name",     "signeePersonalId", "status"],
        [EXISTING_UUID, "דוד לוי",  "9876543",          "active" ],
      ];
      const before = getSheetRowCount();

      const result = getOrCreateSigneeId(ss, mockSigneeData, "דוד לוי", "  9876543  ");

      if (result !== EXISTING_UUID)
        throw new Error(`trim לא עבד — UUID שגוי: "${result}"`);
      assertNoNewRow(before, getSheetRowCount(), "בדיקה 8");
      return "trim עבד, UUID קיים הוחזר";
    });

  } finally {
    // ניקוי: מחיקת כל שורה שנכתבה על ידי הבדיקות (לפי CLEANUP_MARKER בשם)
    const data = signeeSheet.getDataRange().getValues();
    let deleted = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]).startsWith(CLEANUP_MARKER) || String(data[i][2]).startsWith(CLEANUP_MARKER)) {
        signeeSheet.deleteRow(i + 1);
        deleted++;
      }
    }
    if (deleted > 0) console.log(`🧹 ניקוי: נמחקו ${deleted} שורות בדיקה מגיליון Signees`);
  }

  printUnitTestReport(results, "getOrCreateSigneeId", startTime);
}

// ─────────────────────────────────────────────────────────────────
// Unit Tests — addNewSignee
// ─────────────────────────────────────────────────────────────────

/**
 * RUN_ADD_SIGNEE_UNIT_TESTS
 *
 * בודק את הפונקציה addNewSignee (Code.js).
 * בניגוד ל-getOrCreateSigneeId — פונקציה זו קוראת את הגיליון בעצמה,
 * לכן בדיקות "חותם קיים" דורשות הכנסת שורה אמיתית לגיליון לפני הקריאה.
 * כל שורות הבדיקה מסומנות ב-CLEANUP_MARKER ומנוקות ב-finally.
 *
 * 6 בדיקות:
 *   9.  שם+ID חדשים    → אובייקט עם UUID חדש, שורה נוספת לגיליון
 *   10. שם+ID קיימים   → אובייקט קיים מוחזר, אין כפיל בגיליון
 *   11. name ריק        → שגיאה נזרקת
 *   12. signeeId ריק    → שגיאה נזרקת
 *   13. שניהם ריקים     → שגיאה נזרקת
 *   14. trim שם+ID      → מוצא קיים למרות רווחים, אין כפיל
 */
function RUN_ADD_SIGNEE_UNIT_TESTS() {
  const results = [];
  const startTime = new Date();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const signeeSheet = ss.getSheetByName(DB_CONFIG.SHEETS.SIGNEES);

  const CLEANUP_MARKER = "__ADD_SIGNEE_TEST__";

  function getSheetRowCount() {
    return signeeSheet.getLastRow();
  }

  function assertUuid(value, label) {
    if (!value || !/^[0-9a-f-]{36}$/.test(value))
      throw new Error(`${label}: ערך לא תקין כ-UUID: "${value}"`);
  }

  // כותב שורת חותם ישירות לגיליון ומחזיר את ה-UUID שנכתב
  function insertTestSignee(name, personalId) {
    const uuid = Utilities.getUuid();
    signeeSheet.appendRow([uuid, name, personalId, "active"]);
    return uuid;
  }

  try {
    // ── בדיקה 9: שם+ID חדשים — UUID חדש + שורה נוספת ───────────────────
    testStepSafe(results, "9. חותם חדש — UUID חדש + שורה נוספת", () => {
      const testName = CLEANUP_MARKER + "_new";
      const testId   = CLEANUP_MARKER + "_id_new";
      const before = getSheetRowCount();

      const result = addNewSignee({ name: testName, signeeId: testId });

      assertUuid(result.id, "בדיקה 9");
      if (result.name !== testName)
        throw new Error(`name שגוי: "${result.name}"`);
      if (result.signeeId !== testId)
        throw new Error(`signeeId שגוי: "${result.signeeId}"`);
      if (getSheetRowCount() !== before + 1)
        throw new Error(`שורה לא נוספה (לפני: ${before}, אחרי: ${getSheetRowCount()})`);
      return `UUID: ${result.id}`;
    });

    // ── בדיקה 10: שם+ID קיימים — מחזיר קיים, אין כפיל ─────────────────
    testStepSafe(results, "10. חותם קיים — מוחזר ללא כפיל", () => {
      const testName = CLEANUP_MARKER + "_existing";
      const testId   = CLEANUP_MARKER + "_id_existing";
      const existingUuid = insertTestSignee(testName, testId);
      const before = getSheetRowCount();

      const result = addNewSignee({ name: testName, signeeId: testId });

      if (result.id !== existingUuid)
        throw new Error(`UUID שגוי — קיבלתי: "${result.id}", ציפיתי: "${existingUuid}"`);
      if (getSheetRowCount() !== before)
        throw new Error(`נוצר כפיל! שורות לפני: ${before}, אחרי: ${getSheetRowCount()}`);
      return `UUID קיים הוחזר: ${result.id}`;
    });

    // ── בדיקה 11: name ריק — שגיאה נזרקת ───────────────────────────────
    testStepSafe(results, "11. name ריק — שגיאה נזרקת", () => {
      const before = getSheetRowCount();
      let threw = false;

      try {
        addNewSignee({ name: "", signeeId: "1234567" });
      } catch (e) {
        threw = true;
        if (getSheetRowCount() !== before)
          throw new Error("שורה נכתבה לגיליון למרות השגיאה");
      }

      if (!threw) throw new Error("לא נזרקה שגיאה כשהname ריק");
      return "שגיאה נזרקה כצפוי";
    });

    // ── בדיקה 12: signeeId ריק — שגיאה נזרקת ───────────────────────────
    testStepSafe(results, "12. signeeId ריק — שגיאה נזרקת", () => {
      const before = getSheetRowCount();
      let threw = false;

      try {
        addNewSignee({ name: "ישראל ישראלי", signeeId: "" });
      } catch (e) {
        threw = true;
        if (getSheetRowCount() !== before)
          throw new Error("שורה נכתבה לגיליון למרות השגיאה");
      }

      if (!threw) throw new Error("לא נזרקה שגיאה כשה-signeeId ריק");
      return "שגיאה נזרקה כצפוי";
    });

    // ── בדיקה 13: שניהם ריקים — שגיאה נזרקת ────────────────────────────
    testStepSafe(results, "13. name + signeeId ריקים — שגיאה נזרקת", () => {
      const before = getSheetRowCount();
      let threw = false;

      try {
        addNewSignee({ name: "", signeeId: "" });
      } catch (e) {
        threw = true;
        if (getSheetRowCount() !== before)
          throw new Error("שורה נכתבה לגיליון למרות השגיאה");
      }

      if (!threw) throw new Error("לא נזרקה שגיאה כששני השדות ריקים");
      return "שגיאה נזרקה כצפוי";
    });

    // ── בדיקה 14: trim — רווחים בשם+ID מוצאים חותם קיים ────────────────
    testStepSafe(results, "14. trim שם+ID — מוצא קיים למרות רווחים", () => {
      const testName = CLEANUP_MARKER + "_trim";
      const testId   = CLEANUP_MARKER + "_id_trim";
      const existingUuid = insertTestSignee(testName, testId);
      const before = getSheetRowCount();

      // מעבירים עם רווחים — הפונקציה אמורה לעשות trim ולמצוא את הקיים
      const result = addNewSignee({ name: "  " + testName + "  ", signeeId: "  " + testId + "  " });

      if (result.id !== existingUuid)
        throw new Error(`trim לא עבד — UUID שגוי: "${result.id}", ציפיתי: "${existingUuid}"`);
      if (getSheetRowCount() !== before)
        throw new Error(`נוצר כפיל! שורות לפני: ${before}, אחרי: ${getSheetRowCount()}`);
      return `trim עבד, UUID קיים הוחזר: ${result.id}`;
    });

  } finally {
    // ניקוי: מחיקת כל שורה עם CLEANUP_MARKER בשם או ב-ID
    const data = signeeSheet.getDataRange().getValues();
    let deleted = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]).startsWith(CLEANUP_MARKER) || String(data[i][2]).startsWith(CLEANUP_MARKER)) {
        signeeSheet.deleteRow(i + 1);
        deleted++;
      }
    }
    if (deleted > 0) console.log(`🧹 ניקוי: נמחקו ${deleted} שורות בדיקה מגיליון Signees`);
  }

  printUnitTestReport(results, "addNewSignee", startTime);
}

// ─────────────────────────────────────────────────────────────────
// Unit Tests — validateAndSave (15–38)
// ─────────────────────────────────────────────────────────────────

/**
 * RUN_VALIDATE_AND_SAVE_UNIT_TESTS
 *
 * בודק את validateAndSave(formData) — הפונקציה המאוחדת שמחליפה
 * את validateItemsBatch ו-processTransaction הישנות.
 *
 * חלק א' (15–23): זיהוי קונפליקטים ומלאי → needsConfirmation
 * חלק ב' (28–38): מסלול השמירה → { saved: true }
 *
 * CLEANUP_MARKER = "__VAS_TEST__" בעמודה C (issuerName, אינדקס 2)
 *
 * מבנה שורת Transactions (19 עמודות, 0-based):
 *   [0]  rowId        [1]  timestamp     [2]  issuerName   [3]  issuerId
 *   [4]  actionName   [5]  actionId      [6]  prevId       [7]  teamName
 *   [8]  teamId       [9]  productName   [10] productId    [11] sn
 *   [12] qty          [13] locationName  [14] locationId   [15] signeeName
 *   [16] signeeId     [17] statusName    [18] statusId
 *
 * 24 בדיקות:
 *   15. SN פעיל + ללא closeOldRowId  → needsConfirmation + conflict
 *   16. SN שנסגר                    → saved (אין conflict)
 *   17. SN לא קיים                  → saved
 *   18. מלאי מכולה                  → needsConfirmation + stocks עם count נכון
 *   19. מוצר מצוות שאינו קשר        → אין stocks
 *   20. isTs=true — stocks לא נבדק  → saved גם אם קיים מלאי במכולה
 *   21. items=[]                     → { saved: true }, ללא שורות חדשות
 *   22. כמה items — conflict + stock + נקי בו-זמנית
 *   23. SN פתוח ואז נסגר            → התנהגות מתועדת של validateAndSave
 *   28. מחזיר { saved: true }
 *   29. item בודד → שורה אחת נכתבת
 *   30. qty=3 → שלוש שורות
 *   31. עמודות השורה החדשה תואמות formData
 *   32. ללא closeOldRowId → prevId ריק
 *   33. closeOldRowId → prevId נשמר ושורה ישנה מתעדכנת
 *   34. closeOldRowIds (מערך) → qty=2, שתי שורות ישנות מתעדכנות
 *   35. actionNote על item → עוקף formData.action
 *   36. כמה items → שורה לכל item
 *   37. signeeID חדש → signeeUuid מאוכלס בשורה
 *   38. items ריקים → לא נכתבת אף שורה
 */
function RUN_VALIDATE_AND_SAVE_UNIT_TESTS() {
  const results = [];
  const startTime = new Date();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transSheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);
  const CLEANUP_MARKER = "__VAS_TEST__";
  const TS = Date.now();

  // --- קבועים מה-DB ---
  const ACTIVE_STATUS_ID = SERVER_CONFIG.ACTIONS.ACTIVE;
  const teamsRaw_vas = ss.getSheetByName(DB_CONFIG.SHEETS.TEAMS).getDataRange().getValues().slice(1);
  const KESHIR_TEAM_ID = String(teamsRaw_vas.find(r => String(r[2]) === SERVER_CONFIG.TEAMS.ROLE_MAIN)?.[0] || "");
  const locsRaw_vas = ss.getSheetByName(DB_CONFIG.SHEETS.LOCATIONS).getDataRange().getValues().slice(1);
  const MACHSANA_LOC_ID = String(locsRaw_vas.find(r => r[1] === 'מכולת קשר שורק')?.[0] || "");

  // --- formData בסיסי ---
  function baseFormData(overrides) {
    return Object.assign({
      action:       SERVER_CONFIG.ACTIONS.NIPUK,
      teamName:     "צוות-בדיקה-VAS",
      teamId:       "TEST-TEAM-VAS-" + TS,
      locationName: "מיקום-בדיקה",
      locationId:   "LOC-TEST-VAS",
      signeeName:   "חותם בדיקה VAS",
      signeeID:     "VAS-SIGNEE-" + TS,
      issuerName:   CLEANUP_MARKER,
      issuerId:     "TEST-ISSUER-VAS",
      mainTeamId:   KESHIR_TEAM_ID,
      items: [],
    }, overrides);
  }

  function makeItem(overrides) {
    return Object.assign({
      productName:    "מוצר-בדיקה-VAS",
      productId:      "PROD-VAS-" + TS,
      qty:            1,
      sn:             "",
      isTs:           false,
      actionNote:     null,
      closeOldRowId:  "",
      closeOldRowIds: null,
    }, overrides);
  }

  // כותב שורה ישירות לגיליון לצורך הכנסת state קודם
  function insertRawRow({ teamId, locationId, productId, sn, statusId }) {
    const id = Utilities.getUuid();
    transSheet.appendRow([
      id, new Date(), CLEANUP_MARKER, "TEST-ISSUER", "פעולת בדיקה",
      ACTIVE_STATUS_ID, "", "צוות בדיקה", teamId, "מוצר בדיקה",
      productId, sn || "", 1, "מיקום בדיקה", locationId,
      "חותם בדיקה", "TEST-SIGNEE-UUID", "פעיל", statusId,
    ]);
    return id;
  }

  try {
    // ══════════════════════════════════════════════════════
    // חלק א': זיהוי קונפליקטים ומלאי (15–23)
    // ══════════════════════════════════════════════════════

    // ── 15: SN פעיל + ללא closeOldRowId → needsConfirmation + conflict ──
    testStepSafe(results, "15. SN פעיל — needsConfirmation + conflict", () => {
      const testSn   = "SN-VAS-15-" + TS;
      const testProd = "PROD-VAS-15-" + TS;
      const insertedId = insertRawRow({
        teamId: "TEAM-VAS-15", locationId: "LOC-X",
        productId: testProd, sn: testSn, statusId: ACTIVE_STATUS_ID,
      });

      const result = validateAndSave(baseFormData({
        teamId: "TEAM-VAS-TARGET-15",
        items: [makeItem({ isTs: true, sn: testSn, productId: testProd, closeOldRowId: "" })],
      }));

      if (!result.needsConfirmation)
        throw new Error("ציפינו needsConfirmation=true, הוחזר: " + JSON.stringify(result));
      if (!result.conflicts[testSn])
        throw new Error("conflict לא זוהה עבור SN " + testSn);
      if (result.conflicts[testSn].rowId !== insertedId)
        throw new Error("rowId שגוי: " + result.conflicts[testSn].rowId);
      return "conflict זוהה, rowId: " + insertedId;
    });

    // ── 16: SN שנסגר → saved (אין conflict) ─────────────────────────────
    testStepSafe(results, "16. SN שנסגר — saved ללא conflict", () => {
      const testSn   = "SN-VAS-16-" + TS;
      const testProd = "PROD-VAS-16-" + TS;
      insertRawRow({
        teamId: "TEAM-VAS-16", locationId: "LOC-X",
        productId: testProd, sn: testSn, statusId: SERVER_CONFIG.ACTIONS.ZIKUY,
      });

      const result = validateAndSave(baseFormData({
        teamId: "TEAM-VAS-TARGET-16",
        items: [makeItem({ isTs: true, sn: testSn, productId: testProd })],
      }));

      if (result.needsConfirmation && result.conflicts && result.conflicts[testSn])
        throw new Error("SN שנסגר הופיע כ-conflict בטעות");
      return "SN שנסגר — אין conflict, saved=" + !!result.saved;
    });

    // ── 17: SN שאינו קיים כלל → saved ──────────────────────────────────
    testStepSafe(results, "17. SN לא קיים — saved", () => {
      const fakeSn = "SN-DOES-NOT-EXIST-VAS-" + TS;
      const result = validateAndSave(baseFormData({
        teamId: "TEAM-VAS-TARGET-17",
        items: [makeItem({ isTs: true, sn: fakeSn, productId: "PROD-VAS-17-" + TS })],
      }));
      if (result.needsConfirmation)
        throw new Error("SN לא-קיים הפיק needsConfirmation בטעות");
      if (!result.saved)
        throw new Error("ציפינו saved:true, קיבלנו: " + JSON.stringify(result));
      return "saved:true — אין conflict";
    });

    // ── 18: מלאי מכולה → needsConfirmation + stocks ──────────────────────
    testStepSafe(results, "18. מלאי מכולה — needsConfirmation + stocks", () => {
      const testProd = "PROD-VAS-18-" + TS;
      insertRawRow({ teamId: KESHIR_TEAM_ID, locationId: MACHSANA_LOC_ID, productId: testProd, statusId: ACTIVE_STATUS_ID });
      insertRawRow({ teamId: KESHIR_TEAM_ID, locationId: MACHSANA_LOC_ID, productId: testProd, statusId: ACTIVE_STATUS_ID });

      const result = validateAndSave(baseFormData({
        teamId: "TEAM-VAS-TARGET-18",
        items: [makeItem({ isTs: false, productId: testProd, closeOldRowIds: null })],
      }));

      if (!result.needsConfirmation)
        throw new Error("ציפינו needsConfirmation=true");
      if (!result.stocks[testProd])
        throw new Error("stocks ריק — מלאי מכולה לא זוהה");
      if (result.stocks[testProd].count !== 2)
        throw new Error("count שגוי: " + result.stocks[testProd].count + ", ציפיתי 2");
      return "stocks נכון: count=" + result.stocks[testProd].count;
    });

    // ── 19: מוצר מצוות שאינו קשר → אין stocks ──────────────────────────
    testStepSafe(results, "19. צוות שאינו קשר — אין stocks", () => {
      const testProd = "PROD-VAS-19-" + TS;
      insertRawRow({ teamId: "TEAM-NOT-KESHIR-" + TS, locationId: MACHSANA_LOC_ID, productId: testProd, statusId: ACTIVE_STATUS_ID });

      const result = validateAndSave(baseFormData({
        teamId: "TEAM-VAS-TARGET-19",
        items: [makeItem({ isTs: false, productId: testProd })],
      }));

      if (result.stocks && result.stocks[testProd])
        throw new Error("מוצר מצוות שאינו קשר הופיע ב-stocks בטעות");
      return "stocks ריק כצפוי, saved=" + !!result.saved;
    });

    // ── 20: isTs=true → stocks לא נבדק ─────────────────────────────────
    testStepSafe(results, "20. isTs=true — stocks לא נבדק", () => {
      const testProd = "PROD-VAS-20-" + TS;
      insertRawRow({ teamId: KESHIR_TEAM_ID, locationId: MACHSANA_LOC_ID, productId: testProd, statusId: ACTIVE_STATUS_ID });

      const result = validateAndSave(baseFormData({
        teamId: "TEAM-VAS-TARGET-20",
        items: [makeItem({ isTs: true, sn: "SN-VAS-20-" + TS, productId: testProd })],
      }));

      if (result.stocks && result.stocks[testProd])
        throw new Error("isTs=true הפיק stocks בטעות");
      return "stocks לא נבדק כצפוי";
    });

    // ── 21: items=[] → saved:true, ללא שורות חדשות ─────────────────────
    testStepSafe(results, "21. items=[] — saved:true, ללא שורות", () => {
      const rowsBefore = transSheet.getLastRow();
      const result = validateAndSave(baseFormData({ items: [] }));
      const rowsAfter = transSheet.getLastRow();
      if (!result.saved)
        throw new Error("ציפינו saved:true, קיבלנו: " + JSON.stringify(result));
      if (rowsAfter !== rowsBefore)
        throw new Error("נוצרו שורות בטעות: " + (rowsAfter - rowsBefore));
      return "saved:true, ללא שורות — כצפוי";
    });

    // ── 22: כמה items — conflict + stock + נקי בו-זמנית ─────────────────
    testStepSafe(results, "22. כמה items — conflict + stock + נקי", () => {
      const snConflict = "SN-VAS-22-C-"  + TS;
      const prodStock  = "PROD-VAS-22-S-" + TS;
      const prodClean  = "PROD-VAS-22-K-" + TS;
      const prodTs     = "PROD-VAS-22-TS-" + TS;

      const conflictRowId = insertRawRow({ teamId: "TEAM-22", locationId: "LOC-22", productId: prodTs, sn: snConflict, statusId: ACTIVE_STATUS_ID });
      insertRawRow({ teamId: KESHIR_TEAM_ID, locationId: MACHSANA_LOC_ID, productId: prodStock, statusId: ACTIVE_STATUS_ID });

      const result = validateAndSave(baseFormData({
        teamId: "TEAM-VAS-TARGET-22",
        items: [
          makeItem({ isTs: true,  sn: snConflict, productId: prodTs,    closeOldRowId: "" }),
          makeItem({ isTs: false, productId: prodStock, closeOldRowIds: null }),
          makeItem({ isTs: false, productId: prodClean }),
        ],
      }));

      if (!result.needsConfirmation) throw new Error("ציפינו needsConfirmation");
      if (!result.conflicts[snConflict]) throw new Error("conflict לא זוהה");
      if (!result.stocks || !result.stocks[prodStock]) throw new Error("stock לא זוהה");
      if (result.stocks[prodClean]) throw new Error("מוצר נקי הופיע ב-stocks בטעות");
      return "conflict ✓, stock ✓ (count=" + result.stocks[prodStock].count + "), נקי ✓";
    });

    // ── 23: SN פתוח ואז נסגר — התנהגות מתועדת ──────────────────────────
    testStepSafe(results, "23. SN פתוח ואז נסגר — התנהגות מתועדת", () => {
      const testSn   = "SN-VAS-23-" + TS;
      const testProd = "PROD-VAS-23-" + TS;
      insertRawRow({ teamId: "TEAM-VAS-23", locationId: "LOC-23", productId: testProd, sn: testSn, statusId: ACTIVE_STATUS_ID });
      insertRawRow({ teamId: "TEAM-VAS-23", locationId: "LOC-23", productId: testProd, sn: testSn, statusId: SERVER_CONFIG.ACTIONS.ZIKUY });

      const result = validateAndSave(baseFormData({
        teamId: "TEAM-VAS-TARGET-23",
        items: [makeItem({ isTs: true, sn: testSn, productId: testProd, closeOldRowId: "" })],
      }));

      // validateAndSave לא מוחקת מ-lastStateMap בסגירה (שונה מ-getDetailedTsReport)
      if (result.needsConfirmation && result.conflicts[testSn]) {
        return "conflict מוחזר גם אחרי סגירה (התנהגות מתועדת של validateAndSave)";
      }
      return "SN שנסגר לא מוחזר כ-conflict";
    });

    // ══════════════════════════════════════════════════════
    // חלק ב': מסלול שמירה — { saved: true } (28–38)
    // ══════════════════════════════════════════════════════

    // ── 28: מחזיר { saved: true } ────────────────────────────────────────
    testStepSafe(results, "28. מחזיר { saved: true }", () => {
      const result = validateAndSave(baseFormData({ items: [makeItem({ productId: "PROD-VAS-28-" + TS })] }));
      if (!result.saved) throw new Error("ציפינו saved:true, קיבלנו: " + JSON.stringify(result));
      return "saved:true — כצפוי";
    });

    // ── 29: item בודד → שורה אחת נוספת ───────────────────────────────────
    testStepSafe(results, "29. item בודד — שורה אחת נכתבת", () => {
      const rowsBefore = transSheet.getLastRow();
      validateAndSave(baseFormData({ items: [makeItem({ productId: "PROD-VAS-29-" + TS })] }));
      const rowsAfter = transSheet.getLastRow();
      if (rowsAfter !== rowsBefore + 1)
        throw new Error("ציפינו +1 שורה, השינוי היה: " + (rowsAfter - rowsBefore));
    });

    // ── 30: qty=3 → שלוש שורות ────────────────────────────────────────────
    testStepSafe(results, "30. qty=3 — שלוש שורות", () => {
      const rowsBefore = transSheet.getLastRow();
      validateAndSave(baseFormData({ items: [makeItem({ qty: 3, productId: "PROD-VAS-30-" + TS })] }));
      const rowsAfter = transSheet.getLastRow();
      if (rowsAfter !== rowsBefore + 3)
        throw new Error("ציפינו +3 שורות, השינוי היה: " + (rowsAfter - rowsBefore));
    });

    // ── 31: תוכן עמודות תואם formData ────────────────────────────────────
    testStepSafe(results, "31. עמודות השורה החדשה תואמות formData", () => {
      const PROD_ID = "PROD-VAS-31-" + TS;
      const SN_VAL  = "SN-VAS-31-"   + TS;
      const fd = baseFormData({ items: [makeItem({ productId: PROD_ID, sn: SN_VAL, isTs: true })] });
      validateAndSave(fd);

      const data = transSheet.getDataRange().getValues();
      const row = data.slice(1).reverse().find(r => String(r[2]) === CLEANUP_MARKER && String(r[10]) === PROD_ID);
      if (!row) throw new Error("השורה החדשה לא נמצאה");
      if (String(row[7])  !== fd.teamName)     throw new Error(`teamName: "${row[7]}"`);
      if (String(row[8])  !== fd.teamId)       throw new Error(`teamId: "${row[8]}"`);
      if (String(row[11]) !== SN_VAL)          throw new Error(`sn: "${row[11]}"`);
      if (String(row[13]) !== fd.locationName) throw new Error(`locationName: "${row[13]}"`);
      if (String(row[15]) !== fd.signeeName)   throw new Error(`signeeName: "${row[15]}"`);
      if (String(row[18]) !== SERVER_CONFIG.ACTIONS.ACTIVE)
        throw new Error(`statusId: "${row[18]}"`);
    });

    // ── 32: ללא closeOldRowId → prevId ריק ───────────────────────────────
    testStepSafe(results, "32. ללא closeOldRowId — prevId ריק", () => {
      const PROD_ID = "PROD-VAS-32-" + TS;
      validateAndSave(baseFormData({ items: [makeItem({ productId: PROD_ID })] }));
      const data = transSheet.getDataRange().getValues();
      const row = data.slice(1).reverse().find(r => String(r[2]) === CLEANUP_MARKER && String(r[10]) === PROD_ID);
      if (!row) throw new Error("השורה לא נמצאה");
      if (String(row[6]) !== "") throw new Error(`prevId אמור להיות ריק, קיבלנו: "${row[6]}"`);
    });

    // ── 33: closeOldRowId → prevId נשמר, שורה ישנה מתעדכנת ───────────────
    testStepSafe(results, "33. closeOldRowId — prevId + שורה ישנה מתעדכנת", () => {
      const oldId   = insertRawRow({ teamId: "OLD-TEAM", locationId: "OLD-LOC", productId: "PROD-OLD-33-" + TS, statusId: ACTIVE_STATUS_ID });
      const PROD_ID = "PROD-VAS-33-" + TS;
      validateAndSave(baseFormData({ items: [makeItem({ productId: PROD_ID, closeOldRowId: oldId })] }));

      const data = transSheet.getDataRange().getValues();
      const newRow = data.slice(1).reverse().find(r => String(r[2]) === CLEANUP_MARKER && String(r[10]) === PROD_ID);
      if (!newRow) throw new Error("השורה החדשה לא נמצאה");
      if (String(newRow[6]) !== oldId) throw new Error(`prevId לא תואם: "${newRow[6]}"`);
      const oldRow = data.find(r => String(r[0]) === oldId);
      if (!oldRow) throw new Error("השורה הישנה לא נמצאה");
      if (String(oldRow[18]) === SERVER_CONFIG.ACTIONS.ACTIVE)
        throw new Error("השורה הישנה עדיין פעילה — לא עודכנה");
    });

    // ── 34: closeOldRowIds (מערך) → qty=2, שתי שורות ישנות מתעדכנות ──────
    testStepSafe(results, "34. closeOldRowIds (מערך) — qty=2, שתי שורות ישנות", () => {
      const oldId1  = insertRawRow({ teamId: "OLD-TEAM", locationId: "OLD-LOC", productId: "PROD-OLD-34A-" + TS, statusId: ACTIVE_STATUS_ID });
      const oldId2  = insertRawRow({ teamId: "OLD-TEAM", locationId: "OLD-LOC", productId: "PROD-OLD-34B-" + TS, statusId: ACTIVE_STATUS_ID });
      validateAndSave(baseFormData({ items: [makeItem({ productId: "PROD-VAS-34-" + TS, qty: 2, closeOldRowIds: [oldId1, oldId2] })] }));

      const data = transSheet.getDataRange().getValues();
      [oldId1, oldId2].forEach(id => {
        const row = data.find(r => String(r[0]) === id);
        if (!row) throw new Error("שורה " + id + " לא נמצאה");
        if (String(row[18]) === SERVER_CONFIG.ACTIONS.ACTIVE)
          throw new Error("שורה " + id + " עדיין פעילה");
      });
    });

    // ── 35: actionNote → עוקף formData.action ─────────────────────────────
    testStepSafe(results, "35. actionNote על item עוקף formData.action", () => {
      const PROD_ID = "PROD-VAS-35-" + TS;
      validateAndSave(baseFormData({
        action: SERVER_CONFIG.ACTIONS.NIPUK,
        items:  [makeItem({ productId: PROD_ID, actionNote: SERVER_CONFIG.ACTIONS.ZIKUY })],
      }));
      const data = transSheet.getDataRange().getValues();
      const row = data.slice(1).reverse().find(r => String(r[2]) === CLEANUP_MARKER && String(r[10]) === PROD_ID);
      if (!row) throw new Error("השורה לא נמצאה");
      if (String(row[5]) !== SERVER_CONFIG.ACTIONS.ZIKUY)
        throw new Error(`actionId לא תואם — קיבלנו "${row[5]}"`);
    });

    // ── 36: כמה items → שורה לכל item ─────────────────────────────────────
    testStepSafe(results, "36. כמה items — שורה לכל item", () => {
      const rowsBefore = transSheet.getLastRow();
      validateAndSave(baseFormData({
        items: [makeItem({ productId: "PROD-VAS-36A-" + TS }), makeItem({ productId: "PROD-VAS-36B-" + TS })],
      }));
      const rowsAfter = transSheet.getLastRow();
      if (rowsAfter !== rowsBefore + 2)
        throw new Error("ציפינו +2 שורות, השינוי היה: " + (rowsAfter - rowsBefore));
    });

    // ── 37: signeeID חדש → signeeUuid מאוכלס ─────────────────────────────
    testStepSafe(results, "37. signeeID חדש — signeeUuid מאוכלס", () => {
      const UNIQUE_NAME = "חותם-יחודי-VAS-37-" + TS;
      const UNIQUE_ID   = "ID-VAS-37-" + TS;
      const PROD_ID     = "PROD-VAS-37-" + TS;
      validateAndSave(baseFormData({
        signeeName: UNIQUE_NAME,
        signeeID:   UNIQUE_ID,
        items:      [makeItem({ productId: PROD_ID })],
      }));
      const data = transSheet.getDataRange().getValues();
      const row = data.slice(1).reverse().find(r => String(r[2]) === CLEANUP_MARKER && String(r[10]) === PROD_ID);
      if (!row) throw new Error("השורה לא נמצאה");
      if (!row[16] || String(row[16]).trim() === "")
        throw new Error("signeeUuid ריק בשורה החדשה");
      if (String(row[15]) !== UNIQUE_NAME)
        throw new Error(`signeeName לא תואם: "${row[15]}"`);
    });

    // ── 38: items ריקים → לא נכתבת אף שורה ─────────────────────────────
    testStepSafe(results, "38. items ריקים — אין שורות חדשות", () => {
      const rowsBefore = transSheet.getLastRow();
      validateAndSave(baseFormData({ items: [] }));
      const rowsAfter = transSheet.getLastRow();
      if (rowsAfter !== rowsBefore)
        throw new Error("ציפינו 0 שורות, השינוי היה: " + (rowsAfter - rowsBefore));
    });

  } finally {
    // ניקוי Transactions
    const data = transSheet.getDataRange().getValues();
    let deleted = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][2]) === CLEANUP_MARKER) {
        transSheet.deleteRow(i + 1);
        deleted++;
      }
    }
    // ניקוי Signees שנוצרו בבדיקה 37
    const signeesSheet = ss.getSheetByName(DB_CONFIG.SHEETS.SIGNEES);
    const signeeData = signeesSheet.getDataRange().getValues();
    let deletedSignees = 0;
    for (let i = signeeData.length - 1; i >= 1; i--) {
      if (String(signeeData[i][2]).startsWith("ID-VAS-37-")) {
        signeesSheet.deleteRow(i + 1);
        deletedSignees++;
      }
    }
    if (deleted > 0)        console.log(`🧹 ניקוי: נמחקו ${deleted} שורות מ-Transactions`);
    if (deletedSignees > 0) console.log(`🧹 ניקוי: נמחקו ${deletedSignees} חותמים מ-Signees`);
  }

  printUnitTestReport(results, "validateAndSave", startTime);
}

// ─────────────────────────────────────────────────────────────────
// Unit Tests — batchUpdateStatusesOptimized (24–27)
// ─────────────────────────────────────────────────────────────────

/**
 * RUN_BATCH_UPDATE_UNIT_TESTS
 *
 * בדיקות לפונקציה batchUpdateStatusesOptimized(ss, updates)
 * הפונקציה מקבלת ss ומערך updates=[{id, statusName, statusId}]
 * ומעדכנת עמודות 18–19 (statusName, statusId) בשורות המתאימות.
 *
 * CLEANUP_MARKER = "__BATCH_UPDATE_TEST__" בעמודה C (issuerName, אינדקס 2)
 */
function RUN_BATCH_UPDATE_UNIT_TESTS() {
  const results = [];
  const startTime = new Date();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transSheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);
  const CLEANUP_MARKER = "__BATCH_UPDATE_TEST__";
  const INACTIVE_NAME = "לא פעיל";
  const INACTIVE_ID   = "INACTIVE-TEST-ID";
  const MACHSANA_LOC_ID_b = String(ss.getSheetByName(DB_CONFIG.SHEETS.LOCATIONS).getDataRange().getValues().slice(1).find(r => r[1] === 'מכולת קשר שורק')?.[0] || "");

  // מוסיף שורת בדיקה ומחזיר את ה-rowId שלה
  function insertBatchTestRow(rowId) {
    const id = rowId || Utilities.getUuid();
    transSheet.appendRow([
      id, new Date(), CLEANUP_MARKER, "TEST-ISSUER-ID", "פעולת בדיקה",
      SERVER_CONFIG.ACTIONS.ACTIVE, "", "צוות בדיקה", "TEST-TEAM-ID", "מוצר בדיקה",
      "TEST-PROD-ID", "", 1, "מיקום בדיקה", MACHSANA_LOC_ID_b,
      "חותם בדיקה", "TEST-SIGNEE-UUID", "פעיל", SERVER_CONFIG.ACTIONS.ACTIVE,
    ]);
    return id;
  }

  try {
    // ───── בדיקה 24: עדכון שורה קיימת — שני עמודות הסטטוס מתעדכנות ─────
    testStepSafe(results, "24 — עדכון שורה קיימת", () => {
      const rowId = insertBatchTestRow();
      batchUpdateStatusesOptimized(ss, [
        { id: rowId, statusName: INACTIVE_NAME, statusId: INACTIVE_ID },
      ]);
      const data = transSheet.getDataRange().getValues();
      const row = data.find(r => String(r[0]) === rowId);
      if (!row) throw new Error("השורה לא נמצאה בגיליון");
      if (String(row[17]) !== INACTIVE_NAME)
        throw new Error(`statusName לא עודכן — ציפינו "${INACTIVE_NAME}", קיבלנו "${row[17]}"`);
      if (String(row[18]) !== INACTIVE_ID)
        throw new Error(`statusId לא עודכן — ציפינו "${INACTIVE_ID}", קיבלנו "${row[18]}"`);
    });

    // ───── בדיקה 25: מזהה לא קיים — לא נזרקת שגיאה, הגיליון לא משתנה ─────
    testStepSafe(results, "25 — מזהה לא קיים — ללא שגיאה", () => {
      const fakeId = "NON-EXISTENT-" + Date.now();
      const rowCountBefore = transSheet.getLastRow();
      batchUpdateStatusesOptimized(ss, [
        { id: fakeId, statusName: INACTIVE_NAME, statusId: INACTIVE_ID },
      ]);
      const rowCountAfter = transSheet.getLastRow();
      if (rowCountAfter !== rowCountBefore)
        throw new Error(`מספר שורות השתנה מ-${rowCountBefore} ל-${rowCountAfter}`);
      const row = transSheet.getDataRange().getValues().find(r => String(r[0]) === fakeId);
      if (row) throw new Error("שורה עם מזהה לא-קיים נוצרה בטעות");
    });

    // ───── בדיקה 26: עדכון מרובה — כמה שורות בפנייה אחת ─────
    testStepSafe(results, "26 — עדכון מרובה בפנייה אחת", () => {
      const id1 = insertBatchTestRow();
      const id2 = insertBatchTestRow();
      const id3 = insertBatchTestRow();
      batchUpdateStatusesOptimized(ss, [
        { id: id1, statusName: "סטטוס-א", statusId: "STATUS-A-ID" },
        { id: id2, statusName: "סטטוס-ב", statusId: "STATUS-B-ID" },
        { id: id3, statusName: "סטטוס-ג", statusId: "STATUS-C-ID" },
      ]);
      const data = transSheet.getDataRange().getValues();
      const row1 = data.find(r => String(r[0]) === id1);
      const row2 = data.find(r => String(r[0]) === id2);
      const row3 = data.find(r => String(r[0]) === id3);
      if (!row1 || !row2 || !row3) throw new Error("אחת מהשורות לא נמצאה");
      if (String(row1[17]) !== "סטטוס-א" || String(row1[18]) !== "STATUS-A-ID")
        throw new Error(`שורה 1 לא עודכנה כראוי: ${row1[17]} / ${row1[18]}`);
      if (String(row2[17]) !== "סטטוס-ב" || String(row2[18]) !== "STATUS-B-ID")
        throw new Error(`שורה 2 לא עודכנה כראוי: ${row2[17]} / ${row2[18]}`);
      if (String(row3[17]) !== "סטטוס-ג" || String(row3[18]) !== "STATUS-C-ID")
        throw new Error(`שורה 3 לא עודכנה כראוי: ${row3[17]} / ${row3[18]}`);
    });

    // ───── בדיקה 27: רשימת עדכונים ריקה — לא נזרקת שגיאה ─────
    testStepSafe(results, "27 — רשימה ריקה — ללא שגיאה", () => {
      const rowCountBefore = transSheet.getLastRow();
      batchUpdateStatusesOptimized(ss, []);
      const rowCountAfter = transSheet.getLastRow();
      if (rowCountAfter !== rowCountBefore)
        throw new Error(`מספר שורות השתנה מ-${rowCountBefore} ל-${rowCountAfter}`);
    });

  } finally {
    const data = transSheet.getDataRange().getValues();
    let deleted = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][2]) === CLEANUP_MARKER) {
        transSheet.deleteRow(i + 1);
        deleted++;
      }
    }
    if (deleted > 0) console.log(`🧹 ניקוי: נמחקו ${deleted} שורות בדיקה מגיליון Transactions`);
  }

  printUnitTestReport(results, "batchUpdateStatusesOptimized", startTime);
}

// ─────────────────────────────────────────────────────────────────
// Unit Tests — getTeamInventory (39–46)
// ─────────────────────────────────────────────────────────────────

/**
 * RUN_TEAM_INVENTORY_UNIT_TESTS
 *
 * בדיקות לפונקציה getTeamInventory(teamId)
 * מחזירה: { products, sns, rowIds, locations }
 * מפתח מלאי: productId + "_" + locationId
 *
 * עמודות רלוונטיות:
 *   [0]=rowId  [8]=teamId  [10]=productId  [11]=sn
 *   [14]=locationId  [18]=statusId
 *
 * CLEANUP_MARKER = "__TEAM_INV_TEST__" בעמודה C (issuerName, אינדקס 2)
 */
function RUN_TEAM_INVENTORY_UNIT_TESTS() {
  const results = [];
  const startTime = new Date();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transSheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);
  const CLEANUP_MARKER = "__TEAM_INV_TEST__";

  const TEST_TEAM_ID   = "TEST-TEAM-INV-" + Date.now();
  const OTHER_TEAM_ID  = "OTHER-TEAM-INV-" + Date.now();
  const PROD_A         = "PROD-A-" + Date.now();
  const PROD_B         = "PROD-B-" + Date.now();
  const LOC_1          = "LOC-1-" + Date.now();
  const LOC_2          = "LOC-2-" + Date.now();
  const ACTIVE_ID      = SERVER_CONFIG.ACTIONS.ACTIVE;
  const INACTIVE_ID    = "INACTIVE-STATUS-ID";

  function insertInvRow({ teamId, productId, sn, locationId, statusId, rowId }) {
    const id = rowId || Utilities.getUuid();
    transSheet.appendRow([
      id, new Date(), CLEANUP_MARKER, "TEST-ISSUER-ID", "פעולת בדיקה",
      ACTIVE_ID, "", "צוות בדיקה", teamId, "מוצר בדיקה",
      productId, sn || "", 1, "מיקום בדיקה", locationId,
      "חותם בדיקה", "TEST-SIGNEE-UUID",
      "פעיל", statusId,
    ]);
    return id;
  }

  try {
    // ───── בדיקה 39: צוות שאין לו שורות — מחזיר מבנה ריק ─────
    testStepSafe(results, "39 — צוות ללא שורות — מבנה ריק", () => {
      const result = getTeamInventory("NO-SUCH-TEAM-" + Date.now());
      if (!Array.isArray(result.products) || result.products.length !== 0)
        throw new Error(`products אמור להיות ריק, קיבלנו: ${JSON.stringify(result.products)}`);
      if (typeof result.sns !== "object" || Object.keys(result.sns).length !== 0)
        throw new Error(`sns אמור להיות אובייקט ריק`);
      if (typeof result.rowIds !== "object" || Object.keys(result.rowIds).length !== 0)
        throw new Error(`rowIds אמור להיות אובייקט ריק`);
      if (!Array.isArray(result.locations) || result.locations.length !== 0)
        throw new Error(`locations אמור להיות ריק`);
    });

    // ───── בדיקה 40: מוצר רגיל (ללא SN) — qty ו-rowIds נכונים ─────
    testStepSafe(results, "40 — מוצר רגיל — qty ו-rowIds", () => {
      const rId = insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: "", locationId: LOC_1, statusId: ACTIVE_ID });
      const result = getTeamInventory(TEST_TEAM_ID);
      const invKey = PROD_A + "_" + LOC_1;
      const prod = result.products.find(p => p.id === PROD_A && p.locId === LOC_1);
      if (!prod) throw new Error("המוצר לא נמצא ב-products");
      if (prod.qty < 1) throw new Error(`qty אמור להיות לפחות 1, קיבלנו ${prod.qty}`);
      if (prod.type !== SERVER_CONFIG.CATALOG.TYPE_GENERIC) throw new Error(`type אמור להיות "${SERVER_CONFIG.CATALOG.TYPE_GENERIC}", קיבלנו "${prod.type}"`);
      if (!result.rowIds[invKey] || !result.rowIds[invKey].includes(rId))
        throw new Error(`rowId ${rId} לא נמצא ב-rowIds[${invKey}]`);
    });

    // ───── בדיקה 41: מכשיר צ' (עם SN) — sns נכון, type="צ" ─────
    testStepSafe(results, "41 — מכשיר צ' — sns ו-type", () => {
      const SN_VAL = "SN-TEST-" + Date.now();
      const rId = insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_B, sn: SN_VAL, locationId: LOC_1, statusId: ACTIVE_ID });
      const result = getTeamInventory(TEST_TEAM_ID);
      const invKey = PROD_B + "_" + LOC_1;
      const prod = result.products.find(p => p.id === PROD_B && p.locId === LOC_1);
      if (!prod) throw new Error("מוצר הצ' לא נמצא ב-products");
      if (prod.type !== SERVER_CONFIG.CATALOG.TYPE_SN) throw new Error(`type אמור להיות "${SERVER_CONFIG.CATALOG.TYPE_SN}", קיבלנו "${prod.type}"`);
      if (!result.sns[invKey]) throw new Error(`sns[${invKey}] לא קיים`);
      const snEntry = result.sns[invKey].find(e => e.sn === SN_VAL);
      if (!snEntry) throw new Error(`SN ${SN_VAL} לא נמצא ב-sns`);
      if (snEntry.rowId !== rId) throw new Error(`rowId של ה-SN לא תואם — ציפינו ${rId}, קיבלנו ${snEntry.rowId}`);
    });

    // ───── בדיקה 42: אותו productId, שני מיקומים — שני invKeys נפרדים ─────
    testStepSafe(results, "42 — אותו מוצר, מיקומים שונים — invKeys נפרדים", () => {
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: "", locationId: LOC_1, statusId: ACTIVE_ID });
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: "", locationId: LOC_2, statusId: ACTIVE_ID });
      const result = getTeamInventory(TEST_TEAM_ID);
      const prodLoc1 = result.products.find(p => p.id === PROD_A && p.locId === LOC_1);
      const prodLoc2 = result.products.find(p => p.id === PROD_A && p.locId === LOC_2);
      if (!prodLoc1) throw new Error(`לא נמצא invKey עבור ${PROD_A}_${LOC_1}`);
      if (!prodLoc2) throw new Error(`לא נמצא invKey עבור ${PROD_A}_${LOC_2}`);
      const locIds = result.locations.map(l => l.id);
      if (!locIds.includes(LOC_1)) throw new Error(`LOC_1 לא נמצא ב-locations`);
      if (!locIds.includes(LOC_2)) throw new Error(`LOC_2 לא נמצא ב-locations`);
    });

    // ───── בדיקה 43: שורות פעילות + לא פעילות — רק פעילות נספרות ─────
    testStepSafe(results, "43 — פעיל + לא פעיל — רק פעיל נספר", () => {
      const SN_ACTIVE   = "SN-ACTIVE-"   + Date.now();
      const SN_INACTIVE = "SN-INACTIVE-" + Date.now();
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_B, sn: SN_ACTIVE,   locationId: LOC_1, statusId: ACTIVE_ID });
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_B, sn: SN_INACTIVE, locationId: LOC_1, statusId: INACTIVE_ID });
      const result = getTeamInventory(TEST_TEAM_ID);
      const invKey = PROD_B + "_" + LOC_1;
      if (!result.sns[invKey]) throw new Error(`sns[${invKey}] לא קיים`);
      const foundActive   = result.sns[invKey].some(e => e.sn === SN_ACTIVE);
      const foundInactive = result.sns[invKey].some(e => e.sn === SN_INACTIVE);
      if (!foundActive)   throw new Error(`SN פעיל ${SN_ACTIVE} לא נמצא`);
      if (foundInactive)  throw new Error(`SN לא-פעיל ${SN_INACTIVE} הופיע בתוצאות — צריך לסנן`);
    });

    // ───── בדיקה 44: שורות של צוותים שונים — רק הצוות הנכון מוחזר ─────
    testStepSafe(results, "44 — שני צוותים — רק הצוות המבוקש מוחזר", () => {
      const SN_MY    = "SN-MY-"    + Date.now();
      const SN_OTHER = "SN-OTHER-" + Date.now();
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_B, sn: SN_MY,    locationId: LOC_1, statusId: ACTIVE_ID });
      insertInvRow({ teamId: OTHER_TEAM_ID, productId: PROD_B, sn: SN_OTHER, locationId: LOC_1, statusId: ACTIVE_ID });
      const result = getTeamInventory(TEST_TEAM_ID);
      const invKey = PROD_B + "_" + LOC_1;
      if (!result.sns[invKey]) throw new Error("אין sns לצוות הנכון");
      const foundOther = result.sns[invKey].some(e => e.sn === SN_OTHER);
      if (foundOther) throw new Error(`SN של צוות אחר (${SN_OTHER}) הופיע בתוצאות`);
    });

    // ───── בדיקה 45: כמה שורות רגילות לאותו invKey — qty מצטבר ─────
    testStepSafe(results, "45 — כמה שורות רגילות — qty מצטבר", () => {
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: "", locationId: LOC_1, statusId: ACTIVE_ID });
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: "", locationId: LOC_1, statusId: ACTIVE_ID });
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: "", locationId: LOC_1, statusId: ACTIVE_ID });
      const result = getTeamInventory(TEST_TEAM_ID);
      const prod = result.products.find(p => p.id === PROD_A && p.locId === LOC_1);
      if (!prod) throw new Error("המוצר לא נמצא");
      if (prod.qty < 3) throw new Error(`qty אמור להיות לפחות 3, קיבלנו ${prod.qty}`);
    });

    // ───── בדיקה 46: מוצר צ' + מוצר רגיל — שניהם מוחזרים, locations מכיל מיקום ─────
    testStepSafe(results, "46 — צ' ורגיל יחד — שניהם ב-products, location תקין", () => {
      const SN_VAL = "SN-BOTH-" + Date.now();
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: "",      locationId: LOC_2, statusId: ACTIVE_ID });
      insertInvRow({ teamId: TEST_TEAM_ID, productId: PROD_B, sn: SN_VAL, locationId: LOC_2, statusId: ACTIVE_ID });
      const result = getTeamInventory(TEST_TEAM_ID);
      const prodA = result.products.find(p => p.id === PROD_A && p.locId === LOC_2);
      const prodB = result.products.find(p => p.id === PROD_B && p.locId === LOC_2);
      if (!prodA) throw new Error(`PROD_A לא נמצא עם LOC_2`);
      if (!prodB) throw new Error(`PROD_B לא נמצא עם LOC_2`);
      if (prodA.type !== SERVER_CONFIG.CATALOG.TYPE_GENERIC) throw new Error(`PROD_A type אמור "${SERVER_CONFIG.CATALOG.TYPE_GENERIC}", קיבלנו "${prodA.type}"`);
      if (prodB.type !== SERVER_CONFIG.CATALOG.TYPE_SN) throw new Error(`PROD_B type אמור "${SERVER_CONFIG.CATALOG.TYPE_SN}", קיבלנו "${prodB.type}"`);
      const locIds = result.locations.map(l => l.id);
      if (!locIds.includes(LOC_2)) throw new Error(`LOC_2 לא נמצא ב-locations`);
    });

  } finally {
    const data = transSheet.getDataRange().getValues();
    let deleted = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][2]) === CLEANUP_MARKER) {
        transSheet.deleteRow(i + 1);
        deleted++;
      }
    }
    if (deleted > 0) console.log(`🧹 ניקוי: נמחקו ${deleted} שורות בדיקה מגיליון Transactions`);
  }

  printUnitTestReport(results, "getTeamInventory", startTime);
}

// ─────────────────────────────────────────────────────────────────
// Unit Tests — getDetailedTsReport (47–55)
// ─────────────────────────────────────────────────────────────────

/**
 * RUN_TS_REPORT_UNIT_TESTS
 *
 * בדיקות לפונקציה getDetailedTsReport(teamId = null)
 * מחזירה: { [productId]: [{ sn, teamId, signeeId, locationId, actionId, prevTeamId, prevSigneeId }] }
 *
 * לוגיקה מרכזית:
 *   • מעבר ראשון: rowTeamMap[rowId]=teamId, rowSigneeMap[rowId]=signeeId
 *   • מעבר שני: רק שורות עם SN ≠ ""
 *     – פילטור teamId: כולל שורה אם rowTeamId===teamId OR (אפסנה ו-prevId→teamId===teamId)
 *     – ללא פילטור: מחריג HATIVA_215 ו-UGDA_162
 *     – ACTIVE → lastStateMap[sn] = {...}
 *     – לא ACTIVE → delete lastStateMap[sn]   ← שונה מ-validateItemsBatch!
 *
 * עמודות: [0]rowId [5]actionId [6]prevId [8]teamId [10]productId
 *         [11]sn   [14]locId   [16]signeeId [18]statusId
 *
 * CLEANUP_MARKER = "__TS_REPORT_TEST__" בעמודה C (issuerName, אינדקס 2)
 */
function RUN_TS_REPORT_UNIT_TESTS() {
  const results = [];
  const startTime = new Date();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transSheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);
  const CLEANUP_MARKER = "__TS_REPORT_TEST__";
  const NOT_RELEVANT_LOC_ID_ts = String(ss.getSheetByName(DB_CONFIG.SHEETS.LOCATIONS).getDataRange().getValues().slice(1).find(r => r[1] === 'לא רלוונטי')?.[0] || "");

  const TS = Date.now();
  const TEST_TEAM_ID    = "TS-REPORT-TEAM-"  + TS;
  const OTHER_TEAM_ID   = "TS-REPORT-OTHER-" + TS;
  const AFASNA_TEAM_ID  = "TS-REPORT-AFASNA-" + TS;
  const PROD_A          = "TS-PROD-A-" + TS;
  const ACTIVE_ID       = SERVER_CONFIG.ACTIONS.ACTIVE;
  const INACTIVE_ID     = SERVER_CONFIG.ACTIONS.NIPUK; // כל actionId שאינו ACTIVE מספיק
  const teamsRaw_ts = ss.getSheetByName(DB_CONFIG.SHEETS.TEAMS).getDataRange().getValues().slice(1);
  const EXTERNAL_TEAM_ID = String(teamsRaw_ts.find(r => String(r[2]) === SERVER_CONFIG.TEAMS.ROLE_EXTERNAL)?.[0] || "");
  const AFASNA_ID       = String(ss.getSheetByName(DB_CONFIG.SHEETS.ACTIONS).getDataRange().getValues().slice(1).find(r => String(r[2]) === SERVER_CONFIG.ACTION_BADGES.STORAGE)?.[0] || "");

  /**
   * מוסיף שורת Transactions עם כל העמודות הרלוונטיות.
   * CLEANUP_MARKER בעמודה [2] — הפונקציה לא קוראת אותה.
   */
  function insertTsRow({ rowId, teamId, productId, sn, locationId, statusId, actionId, prevId, signeeUuid }) {
    const id = rowId || Utilities.getUuid();
    transSheet.appendRow([
      id,                                                // [0]  rowId
      new Date(),                                        // [1]  timestamp
      CLEANUP_MARKER,                                    // [2]  issuerName ← סמן ניקוי
      "TEST-ISSUER-ID",                                  // [3]  issuerId
      "פעולת בדיקה",                                    // [4]  actionName
      actionId || SERVER_CONFIG.ACTIONS.NIPUK,           // [5]  actionId
      prevId    || "",                                   // [6]  prevId
      "צוות בדיקה",                                     // [7]  teamName
      teamId,                                            // [8]  teamId
      "מוצר בדיקה",                                     // [9]  productName
      productId,                                         // [10] productId
      sn        || "",                                   // [11] sn
      1,                                                 // [12] qty
      "מיקום בדיקה",                                    // [13] locationName
      locationId || NOT_RELEVANT_LOC_ID_ts,              // [14] locationId
      "חותם בדיקה",                                     // [15] signeeName
      signeeUuid || "TEST-SIGNEE-UUID-" + TS,            // [16] signeeId
      "פעיל",                                            // [17] statusName
      statusId,                                          // [18] statusId
    ]);
    return id;
  }

  try {
    // ───── בדיקה 47: ללא שורות צ' לצוות — מחזיר {} ─────
    testStepSafe(results, "47 — צוות ללא מכשירי צ' — מחזיר {}", () => {
      // מוסיפים שורה רגילה (SN ריק) לצוות; לא אמורה להופיע
      insertTsRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: "", statusId: ACTIVE_ID });
      const result = getDetailedTsReport(TEST_TEAM_ID);
      if (Object.keys(result).length !== 0)
        throw new Error(`ציפינו לאובייקט ריק, קיבלנו: ${JSON.stringify(result)}`);
    });

    // ───── בדיקה 48: SN פעיל — מופיע בדוח תחת productId ─────
    testStepSafe(results, "48 — SN פעיל — מופיע בדוח", () => {
      const SN_VAL = "SN-ACTIVE-48-" + TS;
      insertTsRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: SN_VAL, statusId: ACTIVE_ID });
      const result = getDetailedTsReport(TEST_TEAM_ID);
      if (!result[PROD_A]) throw new Error(`productId ${PROD_A} לא נמצא בדוח`);
      const entry = result[PROD_A].find(e => e.sn === SN_VAL);
      if (!entry) throw new Error(`SN ${SN_VAL} לא נמצא ב-report[PROD_A]`);
      if (entry.teamId !== TEST_TEAM_ID) throw new Error(`teamId לא תואם — ציפינו ${TEST_TEAM_ID}`);
    });

    // ───── בדיקה 49: פעיל → לא-פעיל לאותו SN — SN נמחק מהדוח ─────
    testStepSafe(results, "49 — פעיל ואז לא-פעיל — SN נמחק", () => {
      const SN_VAL = "SN-INACTIVE-49-" + TS;
      insertTsRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: SN_VAL, statusId: ACTIVE_ID });
      // שורה שניה — statusId שאינו ACTIVE גורמת ל-delete מה-lastStateMap
      insertTsRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn: SN_VAL, statusId: INACTIVE_ID });
      const result = getDetailedTsReport(TEST_TEAM_ID);
      const found = result[PROD_A] && result[PROD_A].find(e => e.sn === SN_VAL);
      if (found) throw new Error(`SN ${SN_VAL} אמור להיות מחוק מהדוח אחרי שורה לא-פעילה`);
    });

    // ───── בדיקה 50: כמה SNs לאותו productId — כולם בmassive ─────
    testStepSafe(results, "50 — כמה SNs, productId אחד — כולם ב-array", () => {
      const SNs = ["SN-50-A-" + TS, "SN-50-B-" + TS, "SN-50-C-" + TS];
      SNs.forEach(sn => insertTsRow({ teamId: TEST_TEAM_ID, productId: PROD_A, sn, statusId: ACTIVE_ID }));
      const result = getDetailedTsReport(TEST_TEAM_ID);
      if (!result[PROD_A]) throw new Error(`productId ${PROD_A} לא נמצא בדוח`);
      SNs.forEach(sn => {
        if (!result[PROD_A].find(e => e.sn === sn))
          throw new Error(`SN ${sn} לא נמצא בדוח`);
      });
    });

    // ───── בדיקה 51: פילטור teamId — צוות אחר לא מוחזר ─────
    testStepSafe(results, "51 — פילטור teamId — צוות אחר מסונן", () => {
      const SN_MINE  = "SN-51-MINE-"  + TS;
      const SN_OTHER = "SN-51-OTHER-" + TS;
      insertTsRow({ teamId: TEST_TEAM_ID,  productId: PROD_A, sn: SN_MINE,  statusId: ACTIVE_ID });
      insertTsRow({ teamId: OTHER_TEAM_ID, productId: PROD_A, sn: SN_OTHER, statusId: ACTIVE_ID });
      const result = getDetailedTsReport(TEST_TEAM_ID);
      if (!result[PROD_A] || !result[PROD_A].find(e => e.sn === SN_MINE))
        throw new Error(`SN שלי (${SN_MINE}) לא נמצא בדוח`);
      if (result[PROD_A] && result[PROD_A].find(e => e.sn === SN_OTHER))
        throw new Error(`SN של צוות אחר (${SN_OTHER}) הופיע בדוח המסונן`);
    });

    // ───── בדיקה 52: ללא פילטור — HATIVA_215 מוחרג ─────
    testStepSafe(results, "52 — ללא פילטור — HATIVA_215 מוחרג", () => {
      const HATIVA_PROD = "TS-PROD-HATIVA-" + TS;
      const SN_HATIVA   = "SN-HATIVA-52-"   + TS;
      insertTsRow({ teamId: EXTERNAL_TEAM_ID, productId: HATIVA_PROD, sn: SN_HATIVA, statusId: ACTIVE_ID });
      const result = getDetailedTsReport(); // ללא פילטור
      const found = result[HATIVA_PROD] && result[HATIVA_PROD].find(e => e.sn === SN_HATIVA);
      if (found) throw new Error(`SN של HATIVA_215 (${SN_HATIVA}) הופיע בדוח — צריך להיות מוחרג`);
    });

    // ───── בדיקה 53: ללא פילטור — צוות רגיל מוחזר ─────
    testStepSafe(results, "53 — ללא פילטור — צוות רגיל מוחזר", () => {
      const REGULAR_PROD = "TS-PROD-REG-" + TS;
      const SN_REG       = "SN-REG-53-"   + TS;
      insertTsRow({ teamId: TEST_TEAM_ID, productId: REGULAR_PROD, sn: SN_REG, statusId: ACTIVE_ID });
      const result = getDetailedTsReport(); // ללא פילטור
      if (!result[REGULAR_PROD] || !result[REGULAR_PROD].find(e => e.sn === SN_REG))
        throw new Error(`SN של צוות רגיל (${SN_REG}) לא נמצא בדוח הכולל`);
    });

    // ───── בדיקה 54: אפסנה — prevTeamId ו-prevSigneeId מאוכלסים ─────
    testStepSafe(results, "54 — אפסנה — prevTeamId ו-prevSigneeId מ-rowMaps", () => {
      const PREV_SIGNEE_UUID = "PREV-SIGNEE-UUID-54-" + TS;
      const SN_PREV    = "SN-PREV-54-"   + TS;
      const SN_AFASNA  = "SN-AFASNA-54-" + TS;
      const AFASNA_PROD = "TS-PROD-AFASNA-" + TS;

      // שורה קודמת (הנשק שממנה לוקחים באפסנה)
      const prevRowId = insertTsRow({
        teamId: TEST_TEAM_ID, productId: AFASNA_PROD, sn: SN_PREV,
        statusId: ACTIVE_ID, signeeUuid: PREV_SIGNEE_UUID,
      });

      // שורת האפסנה — צוות שונה, prevId מצביע על השורה הקודמת
      insertTsRow({
        teamId: AFASNA_TEAM_ID, productId: AFASNA_PROD, sn: SN_AFASNA,
        statusId: ACTIVE_ID, actionId: AFASNA_ID, prevId: prevRowId,
      });

      const result = getDetailedTsReport(); // ללא פילטור
      if (!result[AFASNA_PROD]) throw new Error(`productId ${AFASNA_PROD} לא נמצא בדוח`);
      const afasnaEntry = result[AFASNA_PROD].find(e => e.sn === SN_AFASNA);
      if (!afasnaEntry) throw new Error(`SN אפסנה ${SN_AFASNA} לא נמצא בדוח`);
      if (afasnaEntry.prevTeamId !== TEST_TEAM_ID)
        throw new Error(`prevTeamId לא תואם — ציפינו ${TEST_TEAM_ID}, קיבלנו ${afasnaEntry.prevTeamId}`);
      if (afasnaEntry.prevSigneeId !== PREV_SIGNEE_UUID)
        throw new Error(`prevSigneeId לא תואם — ציפינו ${PREV_SIGNEE_UUID}, קיבלנו ${afasnaEntry.prevSigneeId}`);
    });

    // ───── בדיקה 55: פילטור + אפסנה של הצוות — שורת אפסנה נכללת ─────
    testStepSafe(results, "55 — פילטור + אפסנה — שורה של צוות אחר נכללת כשprevId שייך לצוות", () => {
      const SN_PREV_55   = "SN-PREV-55-"   + TS;
      const SN_AFASNA_55 = "SN-AFASNA-55-" + TS;
      const AFASNA_PROD_55 = "TS-PROD-AF55-" + TS;

      // שורת מקור — שייכת לצוות שעליו מסננים
      const prevRowId = insertTsRow({
        teamId: TEST_TEAM_ID, productId: AFASNA_PROD_55, sn: SN_PREV_55, statusId: ACTIVE_ID,
      });

      // שורת אפסנה — צוות שונה (AFASNA_TEAM_ID), prevId מצביע על TEST_TEAM_ID
      insertTsRow({
        teamId: AFASNA_TEAM_ID, productId: AFASNA_PROD_55, sn: SN_AFASNA_55,
        statusId: ACTIVE_ID, actionId: AFASNA_ID, prevId: prevRowId,
      });

      // עם פילטור TEST_TEAM_ID, שורת האפסנה אמורה להיכלל כי prevId שייך לצוות
      const result = getDetailedTsReport(TEST_TEAM_ID);
      if (!result[AFASNA_PROD_55]) throw new Error(`productId ${AFASNA_PROD_55} לא נמצא בדוח המסונן`);
      const afasnaEntry = result[AFASNA_PROD_55].find(e => e.sn === SN_AFASNA_55);
      if (!afasnaEntry)
        throw new Error(`SN אפסנה ${SN_AFASNA_55} לא נמצא בדוח — אמור להיכלל כי prevId שייך לצוות המסונן`);
    });

  } finally {
    const data = transSheet.getDataRange().getValues();
    let deleted = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][2]) === CLEANUP_MARKER) {
        transSheet.deleteRow(i + 1);
        deleted++;
      }
    }
    if (deleted > 0) console.log(`🧹 ניקוי: נמחקו ${deleted} שורות בדיקה מגיליון Transactions`);
  }

  printUnitTestReport(results, "getDetailedTsReport", startTime);
}

// ─────────────────────────────────────────────────────────────────
// Unit Tests — getStartupData (56–60)
// ─────────────────────────────────────────────────────────────────

/**
 * RUN_STARTUP_DATA_UNIT_TESTS
 *
 * בדיקות לפונקציה getStartupData()
 * הפונקציה קוראת גיליונות סטטיים בלבד — אין כתיבה, אין ניקוי.
 * הרצת הבדיקות מתבצעת תחת המשתמש הנוכחי, שמניחים שהוא מורשה.
 *
 * מה הפונקציה מחזירה:
 *   JSON.stringify({ authorized, user, teams, locations, actions, signees, catalog, config })
 *   • teams/locations/signees — מסוננים לפי "פעיל"
 *   • catalog — מסונן לפי עמודה [6] = "פעיל"
 *   • actions — כולם (ללא סינון)
 *   • config — מפתחות קבועים שמקורם ב-SERVER_CONFIG
 *
 * הערה: לא ניתן לבדוק את הנתיב authorized:false בצורה בטוחה בסביבת ייצור
 *        מבלי לפגוע בגיליון Users. בדיקה 60 מתעדת זאת.
 */
function RUN_STARTUP_DATA_UNIT_TESTS() {
  const results = [];
  const startTime = new Date();

  // ───── בדיקה 56: מחזיר JSON תקין — ניתן לפרוס ─────
  testStepSafe(results, "56 — מחזיר JSON תקין", () => {
    const raw = getStartupData();
    if (typeof raw !== "string") throw new Error(`ציפינו string, קיבלנו ${typeof raw}`);
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { throw new Error("JSON.parse נכשל: " + e.message); }
    if (typeof parsed !== "object" || parsed === null)
      throw new Error("הערך המפורס אינו object");
    return "JSON תקין";
  });

  // ───── בדיקה 57: משתמש מורשה — authorized:true, user מאוכלס ─────
  testStepSafe(results, "57 — משתמש מורשה — authorized:true ו-user תקין", () => {
    const data = JSON.parse(getStartupData());
    if (data.authorized !== true)
      throw new Error(`authorized = ${data.authorized} — הרץ כמשתמש לא-מורשה?`);
    if (!data.user || typeof data.user !== "object")
      throw new Error("שדה user חסר או אינו object");
    if (!data.user.id || typeof data.user.id !== "string" || data.user.id.trim() === "")
      throw new Error(`user.id ריק או לא תקין: "${data.user.id}"`);
    if (!data.user.name || typeof data.user.name !== "string" || data.user.name.trim() === "")
      throw new Error(`user.name ריק או לא תקין: "${data.user.name}"`);
    return `משתמש: ${data.user.name}`;
  });

  // ───── בדיקה 58: כל המפתחות הצפויים קיימים ─────
  testStepSafe(results, "58 — כל המפתחות הצפויים קיימים", () => {
    const data = JSON.parse(getStartupData());
    const REQUIRED_KEYS = ["authorized", "user", "teams", "locations", "actions", "signees", "catalog", "config"];
    const missing = REQUIRED_KEYS.filter(k => !(k in data));
    if (missing.length > 0)
      throw new Error(`מפתחות חסרים: ${missing.join(", ")}`);
  });

  // ───── בדיקה 59: arrays — מבנה שדות חובה + שדות חדשים תקינים ─────
  testStepSafe(results, "59 — arrays עם מבנה id+name ושדות חדשים", () => {
    const data = JSON.parse(getStartupData());

    const checkArray = (key, requiredFields) => {
      if (!Array.isArray(data[key]))
        throw new Error(`${key} אינו מערך`);
      data[key].forEach((item, idx) => {
        requiredFields.forEach(field => {
          if (typeof item[field] !== "string" || item[field].trim() === "")
            throw new Error(`${key}[${idx}].${field} ריק או לא תקין`);
        });
      });
    };

    checkArray("teams",     ["id", "name"]);
    checkArray("locations", ["id", "name"]);
    checkArray("actions",   ["id", "name"]);
    checkArray("signees",   ["id", "name", "signeeId"]);
    checkArray("catalog",   ["id", "name", "type"]);

    // בדיקת שדות חדשים — teams.role, actions.badge/statusPage, catalog.nickname
    data.teams.forEach((t, i) => {
      if (typeof t.role !== "string") throw new Error(`teams[${i}].role not string`);
    });
    data.actions.forEach((a, i) => {
      if (typeof a.badge !== "string")      throw new Error(`actions[${i}].badge not string`);
      if (typeof a.statusPage !== "string") throw new Error(`actions[${i}].statusPage not string`);
    });
    data.catalog.forEach((c, i) => {
      if (typeof c.nickname !== "string") throw new Error(`catalog[${i}].nickname not string`);
      if (typeof c.related  !== "string") throw new Error(`catalog[${i}].related not string`);
      if (typeof c.pn       !== "string") throw new Error(`catalog[${i}].pn not string`);
    });
  });

  // ───── בדיקה 60: config — כל המפתחות הצפויים (כולל חדשים) ─────
  testStepSafe(results, "60 — config תואם SERVER_CONFIG (כולל שדות חדשים)", () => {
    const data = JSON.parse(getStartupData());
    const cfg = data.config;
    if (!cfg || typeof cfg !== "object") throw new Error("config חסר");

    const expectations = {
      ACTION_NIPUK_ID:      SERVER_CONFIG.ACTIONS.NIPUK,
      ACTION_ZIKUY_ID:      SERVER_CONFIG.ACTIONS.ZIKUY,
      ACTION_TRANSFER_ID:   SERVER_CONFIG.ACTIONS.TRANSFER,
      STATUS_ACTIVE_NAME:   SERVER_CONFIG.DISPLAY_NAMES.ACTIVE_STATUS,
      CATALOG_TYPE_SN:      SERVER_CONFIG.CATALOG.TYPE_SN,
      CATALOG_TYPE_GENERIC: SERVER_CONFIG.CATALOG.TYPE_GENERIC,
      TEAM_ROLE_MAIN:       SERVER_CONFIG.TEAMS.ROLE_MAIN,
      TEAM_ROLE_EXTERNAL:   SERVER_CONFIG.TEAMS.ROLE_EXTERNAL,
      ACTION_BADGE_STORAGE: SERVER_CONFIG.ACTION_BADGES.STORAGE,
      ACTION_BADGE_FAULTY:  SERVER_CONFIG.ACTION_BADGES.FAULTY,
    };

    Object.entries(expectations).forEach(([key, expected]) => {
      if (!(key in cfg))
        throw new Error(`config.${key} חסר`);
      if (String(cfg[key]) !== String(expected))
        throw new Error(`config.${key} לא תואם — ציפינו "${expected}", קיבלנו "${cfg[key]}"`);
    });
  });

  printUnitTestReport(results, "getStartupData", startTime);
}

// ─────────────────────────────────────────────────────────────────
// Unit Tests — getPrefetchedReports (61–66)
// ─────────────────────────────────────────────────────────────────

/**
 * RUN_PREFETCH_REPORTS_UNIT_TESTS
 *
 * בדיקות לפונקציה getPrefetchedReports()
 * הפונקציה קוראת גיליונות בלבד — אין כתיבה, אין ניקוי.
 *
 * מה הפונקציה מחזירה:
 *   { inventory: Array, tsReport: Object } בהצלחה
 *   { _error: string } בכישלון
 */
function RUN_PREFETCH_REPORTS_UNIT_TESTS() {
  const results = [];
  const startTime = new Date();
  let report;

  // ───── בדיקה 61: לא זורקת חריגה ─────
  testStepSafe(results, "61 — getPrefetchedReports לא זורקת חריגה", () => {
    report = getPrefetchedReports();
    if (!report || typeof report !== "object")
      throw new Error(`ציפינו object, קיבלנו ${typeof report}`);
    return "הפונקציה רצה ללא חריגה";
  });

  // ───── בדיקה 62: inventory הוא מערך ─────
  testStepSafe(results, "62 — inventory הוא Array", () => {
    if (!report) report = getPrefetchedReports();
    if (!Array.isArray(report.inventory))
      throw new Error(`inventory אינו מערך — קיבלנו: ${typeof report.inventory}`);
    return `inventory: ${report.inventory.length} רשומות`;
  });

  // ───── בדיקה 63: tsReport הוא object ─────
  testStepSafe(results, "63 — tsReport הוא object", () => {
    if (!report) report = getPrefetchedReports();
    if (typeof report.tsReport !== "object" || Array.isArray(report.tsReport) || report.tsReport === null)
      throw new Error(`tsReport אינו object — קיבלנו: ${typeof report.tsReport}`);
    return `tsReport: ${Object.keys(report.tsReport).length} מפתחות`;
  });

  // ───── בדיקה 64: inventory items — שדות חובה ─────
  testStepSafe(results, "64 — inventory items עם שדות חובה", () => {
    if (!report) report = getPrefetchedReports();
    if (!Array.isArray(report.inventory) || report.inventory.length === 0)
      return "inventory ריק — דילוג על בדיקת שדות";
    const REQUIRED = ["productId", "productName", "teamId", "teamName", "locationId", "locationName", "signeeId", "signeeName", "qty", "actionId"];
    report.inventory.forEach((item, idx) => {
      REQUIRED.forEach(field => {
        if (!(field in item))
          throw new Error(`inventory[${idx}] חסר שדה "${field}"`);
      });
    });
    return `נבדקו ${report.inventory.length} פריטים`;
  });

  // ───── בדיקה 65: tsReport entries — שדות חובה ─────
  testStepSafe(results, "65 — tsReport entries עם שדות חובה", () => {
    if (!report) report = getPrefetchedReports();
    const entries = Object.values(report.tsReport || {});
    if (entries.length === 0)
      return "tsReport ריק — דילוג על בדיקת שדות";
    const REQUIRED = ["sn", "teamId", "signeeId", "locationId", "actionId"];
    entries.forEach((entry, idx) => {
      REQUIRED.forEach(field => {
        if (!(field in entry))
          throw new Error(`tsReport[${idx}] חסר שדה "${field}"`);
      });
    });
    return `נבדקו ${entries.length} רשומות TS`;
  });

  // ───── בדיקה 66: אין _error בהרצה תקינה ─────
  testStepSafe(results, "66 — אין _error בהחזר תקין", () => {
    if (!report) report = getPrefetchedReports();
    if ("_error" in report)
      throw new Error(`_error קיים בהחזר: ${report._error}`);
    return "אין _error";
  });

  printUnitTestReport(results, "getPrefetchedReports", startTime);
}

const TEST_CONFIG = {
  LOG_SHEET: "Transactions",
  USER_EMAIL: Session.getEffectiveUser().getEmail(),
  TEST_SIGNEE_NAME: "בודק שרשרת אוטומטי",
  MOCK_SN: "SN-CHAIN-" + Math.floor(Math.random() * 1000),
  REGULAR_PROD_ID: "TEST-REG-ID",
  TS_PROD_ID: "TEST-TS-ID",
};

/**
 * הרצת הבדיקה המרכזית - שרשרת אספקה
 */
function RUN_FULL_LIFECYCLE_TEST() {
  const results = [];
  const startTime = new Date();
  let config;
  let testUser; // פרטי המשתמש לצורך השליחה

  let currentChainIds = { ts: "", reg: "" };

  console.log("🚀 מתחיל בדיקת שרשרת אספקה מלאה...");

  try {
    // שלב 0: טעינת הגדרות (באמצעות הפונקציה המאוחדת החדשה)
    const startupData = JSON.parse(getStartupData());
    if (!startupData.authorized)
      throw new Error("משתמש הבדיקה לא מורשה במערכת");

    config = startupData.config;
    testUser = startupData.user;
    const mainTeamId = startupData.teams.find(t => t.role === config.TEAM_ROLE_MAIN)?.id;
    const machsanaId = startupData.locations.find(l => l.name === 'מכולת קשר שורק')?.id;

    if (!mainTeamId) throw new Error("לא נמצא ID לצוות קשר");

    // שלב 1: הכנסה ראשונית למכולה
    testStep(results, "1. קליטה למכולה", () => {
      const intakeData = {
        action: config.ACTION_NIPUK_ID,
        teamName: "קשר",
        teamId: mainTeamId,
        locationName: "מכולת קשר שורק",
        locationId: machsanaId,
        signeeName: TEST_CONFIG.TEST_SIGNEE_NAME,
        signeeID: "000000",
        issuerName: testUser.name,
        issuerId: testUser.id, // חובה לאחר האופטימיזציה
        items: [
          {
            productName: "מכשיר צ' בדיקה",
            productId: TEST_CONFIG.TS_PROD_ID,
            qty: 1,
            isTs: true,
            sn: TEST_CONFIG.MOCK_SN,
          },
          {
            productName: "ציוד רגיל בדיקה",
            productId: TEST_CONFIG.REGULAR_PROD_ID,
            qty: 1,
            isTs: false,
          },
        ],
      };
      const r1 = validateAndSave({ ...intakeData, mainTeamId });
      if (!r1.saved) throw new Error("validateAndSave לא החזיר saved:true בשלב 1");

      const data = ss_getData(TEST_CONFIG.LOG_SHEET).slice(-2);
      currentChainIds.ts = data[0][0];
      currentChainIds.reg = data[1][0];

      return `נקלטו למכולה. IDs: ${currentChainIds.ts}, ${currentChainIds.reg}`;
    });

    // שלב 2: ניפוק מהמכולה לצוות א'
    testStep(results, "2. ניפוק לצוות א'", () => {
      const transfer1 = {
        action: config.ACTION_NIPUK_ID,
        teamName: "צוות א בדיקה",
        teamId: "TEAM-A-ID",
        locationName: "שטח",
        locationId: "LOC-FIELD-ID",
        signeeName: TEST_CONFIG.TEST_SIGNEE_NAME,
        signeeID: "000000",
        issuerName: testUser.name,
        issuerId: testUser.id,
        items: [
          {
            productName: "מכשיר צ' בדיקה",
            productId: TEST_CONFIG.TS_PROD_ID,
            qty: 1,
            isTs: true,
            sn: TEST_CONFIG.MOCK_SN,
            closeOldRowId: currentChainIds.ts,
          },
          {
            productName: "ציוד רגיל בדיקה",
            productId: TEST_CONFIG.REGULAR_PROD_ID,
            qty: 1,
            isTs: false,
            closeOldRowIds: [currentChainIds.reg],
          },
        ],
      };
      const r2 = validateAndSave({ ...transfer1, mainTeamId });
      if (!r2.saved) throw new Error("validateAndSave לא החזיר saved:true בשלב 2");

      const data = ss_getData(TEST_CONFIG.LOG_SHEET).slice(-2);
      currentChainIds.ts = data[0][0];
      currentChainIds.reg = data[1][0];
      return `נופק לצוות א.`;
    });

    // שלב 3: העברה מצוות א' לצוות ב' (החלפת חתימות)
    testStep(results, "3. העברה לצוות ב'", () => {
      const transfer2 = {
        action: config.ACTION_TRANSFER_ID,
        teamName: "צוות ב בדיקה",
        teamId: "TEAM-B-ID",
        locationName: "רכב",
        locationId: "LOC-CAR-ID",
        signeeName: TEST_CONFIG.TEST_SIGNEE_NAME,
        signeeID: "000000",
        issuerName: testUser.name,
        issuerId: testUser.id,
        items: [
          {
            productName: "מכשיר צ' בדיקה",
            productId: TEST_CONFIG.TS_PROD_ID,
            qty: 1,
            isTs: true,
            sn: TEST_CONFIG.MOCK_SN,
            actionNote: config.ACTION_TRANSFER_ID,
            closeOldRowId: currentChainIds.ts,
          },
          {
            productName: "ציוד רגיל בדיקה",
            productId: TEST_CONFIG.REGULAR_PROD_ID,
            qty: 1,
            isTs: false,
            actionNote: config.ACTION_TRANSFER_ID,
            closeOldRowIds: [currentChainIds.reg],
          },
        ],
      };
      const r3 = validateAndSave({ ...transfer2, mainTeamId });
      if (!r3.saved) throw new Error("validateAndSave לא החזיר saved:true בשלב 3");

      const data = ss_getData(TEST_CONFIG.LOG_SHEET).slice(-2);
      currentChainIds.ts = data[0][0];
      currentChainIds.reg = data[1][0];
      return `הועבר לצוות ב'.`;
    });

    // שלב 4: החזרה לקשר (זיכוי)
    testStep(results, "4. זיכוי לקשר", () => {
      const returnToKeshir = {
        action: config.ACTION_ZIKUY_ID,
        teamName: "קשר",
        teamId: mainTeamId,
        locationName: "מכולת קשר שורק",
        locationId: machsanaId,
        signeeName: TEST_CONFIG.TEST_SIGNEE_NAME,
        signeeID: "000000",
        issuerName: testUser.name,
        issuerId: testUser.id,
        items: [
          {
            productName: "מכשיר צ' בדיקה",
            productId: TEST_CONFIG.TS_PROD_ID,
            qty: 1,
            isTs: true,
            sn: TEST_CONFIG.MOCK_SN,
            actionNote: config.ACTION_ZIKUY_ID,
            closeOldRowId: currentChainIds.ts,
          },
          {
            productName: "ציוד רגיל בדיקה",
            productId: TEST_CONFIG.REGULAR_PROD_ID,
            qty: 1,
            isTs: false,
            actionNote: config.ACTION_ZIKUY_ID,
            closeOldRowIds: [currentChainIds.reg],
          },
        ],
      };
      const r4 = validateAndSave({ ...returnToKeshir, mainTeamId });
      if (!r4.saved) throw new Error("validateAndSave לא החזיר saved:true בשלב 4");
      return `הציוד הוחזר לקשר. השרשרת הושלמה!`;
    });
  } catch (e) {
    results.push({ step: "CRITICAL FAILURE", status: "❌", msg: e.message });
  }

  printTestReport(results, startTime);
}

/**
 * פונקציות עזר - הוספתי ss_ כדי למנוע התנגשות עם שמות ב-backend
 */
function ss_getData(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(sheetName)
    .getDataRange()
    .getValues();
}

function testStep(results, stepName, testFn) {
  try {
    const msg = testFn();
    results.push({ step: stepName, status: "✅", msg: msg || "עבר" });
  } catch (e) {
    results.push({ step: stepName, status: "❌", msg: e.message });
    throw e;
  }
}

function printTestReport(results, startTime) {
  const duration = (new Date() - startTime) / 1000;
  console.log(`\n=== דוח שרשרת אספקה (${duration} שניות) ===`);
  results.forEach((r) => console.log(`${r.status} [${r.step}] -> ${r.msg}`));
  console.log("==============================================\n");
}

function MANUAL_CLEANUP_TEST_DATA() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const testName = TEST_CONFIG.TEST_SIGNEE_NAME;

  const transSheet = ss.getSheetByName("Transactions");
  const transData = transSheet.getDataRange().getValues();
  let transCount = 0;
  for (let i = transData.length - 1; i >= 1; i--) {
    if (transData[i][15] === testName) {
      transSheet.deleteRow(i + 1);
      transCount++;
    }
  }

  const signeeSheet = ss.getSheetByName("Signees");
  const signeeData = signeeSheet.getDataRange().getValues();
  let signeeCount = 0;
  for (let i = signeeData.length - 1; i >= 1; i--) {
    if (signeeData[i][1] === testName) {
      signeeSheet.deleteRow(i + 1);
      signeeCount++;
    }
  }
  console.log(
    `✅ הניקוי הסתיים: נמחקו ${transCount} טרנזקציות ו-${signeeCount} מקבלים.`,
  );
}

/**
 * פונקציה לייצור 50 שורות דאטה מבוססות על נתוני המערכת הקיימים
 * עבור המשתמש "איתן מונסה"
 */
function GENERATE_50_MOCK_TRANSACTIONS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transSheet = ss.getSheetByName(DB_CONFIG.SHEETS.TRANSACTIONS);

  // 1. שליפת כל הנתונים הקיימים במערכת באמצעות הפונקציה המאוחדת שבנית
  const startupData = JSON.parse(getStartupData());
  if (!startupData.authorized) {
    throw new Error("שגיאה: אין הרשאה לשליפת נתוני מערכת");
  }

  // 2. מציאת המשתמש "איתן מונסה" בטבלת המשתמשים
  const usersData = ss
    .getSheetByName(DB_CONFIG.SHEETS.USERS)
    .getDataRange()
    .getValues();
  const eitanUser = usersData.find(
    (r) => r[1] && r[1].toString().trim() === "איתן מונסה",
  );

  if (!eitanUser) {
    throw new Error("לא נמצא משתמש בשם איתן מונסה בטבלת Users");
  }

  const issuer = { id: String(eitanUser[0]), name: String(eitanUser[1]) };
  const config = startupData.config;

  // 3. הגדרת מאגרים לבחירה אקראית
  const teams = startupData.teams;
  const locations = startupData.locations;
  const catalog = startupData.catalog;
  const actions = startupData.actions;
  const signees = startupData.signees;

  const rowsToAdd = [];
  const now = new Date();

  console.log("🛠️ מתחיל לייצר 50 שורות אקראיות...");

  for (let i = 0; i < 50; i++) {
    // בחירות אקראיות
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomProd = catalog[Math.floor(Math.random() * catalog.length)];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const randomSignee =
      signees.length > 0
        ? signees[Math.floor(Math.random() * signees.length)]
        : { name: "חייל בדיקה", signeeId: "1234567" };

    const isTs = randomProd.type === SERVER_CONFIG.CATALOG.TYPE_SN;
    const sn = isTs ? 100000 + Math.floor(Math.random() * 900000) : "";

    // יצירת מזהה ייחודי וזמן (בהפרשים של דקות כדי שיראה אמיתי)
    const rowId = Utilities.getUuid();
    const timestamp = new Date(now.getTime() - i * 60000 * 10); // כל שורה 10 דקות אחורה

    // בניית השורה לפי מבנה ה-DB (19 עמודות)
    rowsToAdd.push([
      rowId, // ID
      timestamp, // Timestamp
      issuer.name, // UserName
      issuer.id, // UserID
      randomAction.name, // Action (Name)
      randomAction.id, // ActionID
      "", // PreviousID (ריק עבור דאטה פיקטיבי ראשוני)
      randomTeam.name, // Team
      randomTeam.id, // TeamID
      randomProd.name, // ProductName
      randomProd.id, // ProductID
      sn, // SN
      1, // Qty
      randomLoc.name, // Location
      randomLoc.id, // LocationID
      randomSignee.name, // SigneeName
      randomSignee.signeeId, // SigneeID
      config.STATUS_ACTIVE_NAME, // Status (פעיל)
      SERVER_CONFIG.ACTIONS.ACTIVE, // StatusID
    ]);
  }

  // 4. כתיבה מרוכזת לגיליון (Performance)
  if (rowsToAdd.length > 0) {
    transSheet
      .getRange(transSheet.getLastRow() + 1, 1, rowsToAdd.length, 19)
      .setValues(rowsToAdd);
    console.log("✅ הסתיים: 50 שורות נוספו בהצלחה לגיליון Transactions.");
  }
}
