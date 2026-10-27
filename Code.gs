/**
 * CH Engineering Sales Tracker: Google Apps Script backend
 * ---------------------------------------------------------
 * Paste this whole file into Extensions > Apps Script in your Google Sheet.
 * Then run setup() once (see README.md for the full step-by-step).
 *
 * What it does:
 *  - Stores every contact, activity and photo in this Google Sheet
 *  - Gives the app a secure-ish API (team passcode)
 *  - Emails each team member their follow-ups every week
 *  - Emails the manager(s) a team summary weekly + a monthly report
 *  - Saves photos into a Google Drive folder
 *  - Looks up map locations for addresses
 */

var TZ = 'Pacific/Auckland';
var APP_NAME = 'CH Sales Tracker';

var SHEET = {
  contacts: 'Contacts',
  activity: 'Activity',
  photos: 'Photos',
  team: 'Team',
  settings: 'Settings',
  templates: 'Email Templates',
  cheatsheet: 'Cheat Sheet'
};

// key, sheet header, type (str | json | bool)
var CONTACT_FIELDS = [
  ['id', 'ID', 'str'],
  ['createdAt', 'Created', 'str'],
  ['updatedAt', 'Updated', 'str'],
  ['createdBy', 'Created By', 'str'],
  ['owner', 'Contacted By', 'str'],
  ['company', 'Company', 'str'],
  ['region', 'Region', 'str'],
  ['address', 'Address', 'str'],
  ['customerType', 'Customer Type', 'str'],
  ['primaryName', 'Primary Contact', 'str'],
  ['primaryPhone', 'Primary Phone', 'str'],
  ['primaryEmail', 'Primary Email', 'str'],
  ['people', 'All Contacts (data)', 'json'],
  ['steel', 'Steel Framing', 'str'],
  ['battens', 'Ceiling Battens', 'str'],
  ['doors', 'Pre-hung Doors', 'str'],
  ['brackets', 'Brackets', 'str'],
  ['status', 'Status', 'str'],
  ['temperature', 'Temperature', 'str'],
  ['stage', 'Stage', 'str'],
  ['reason', 'Reason Not Interested / Lost', 'str'],
  ['lastContacted', 'Last Contacted', 'str'],
  ['nextFollowUp', 'Next Follow-up', 'str'],
  ['followUpType', 'Follow-up Type', 'str'],
  ['emailConsent', 'Email Consent', 'bool'],
  ['quoteAmount', 'Quote Amount', 'str'],
  ['quoteDate', 'Quote Date', 'str'],
  ['quoteLink', 'Quote Link', 'str'],
  ['houses', 'Number of Houses', 'str'],
  ['projectStart', 'Project Start', 'str'],
  ['supplier', 'Current Supplier', 'str'],
  ['source', 'Lead Source', 'str'],
  ['event', 'Event / Trade Show', 'str'],
  ['referredBy', 'Referred By', 'str'],
  ['notes', 'Notes', 'str'],
  ['archived', 'Archived', 'bool'],
  ['lat', 'Lat', 'str'],
  ['lng', 'Lng', 'str'],
  ['geoAddress', 'Mapped Address', 'str']
];

var ACTIVITY_FIELDS = [
  ['id', 'ID', 'str'],
  ['contactId', 'Contact ID', 'str'],
  ['company', 'Company', 'str'],
  ['at', 'Timestamp', 'str'],
  ['user', 'User', 'str'],
  ['type', 'Type', 'str'],
  ['outcome', 'Outcome', 'str'],
  ['note', 'Note', 'str']
];

var PHOTO_FIELDS = [
  ['id', 'ID', 'str'],
  ['contactId', 'Contact ID', 'str'],
  ['company', 'Company', 'str'],
  ['at', 'Created', 'str'],
  ['user', 'User', 'str'],
  ['fileId', 'Drive File ID', 'str'],
  ['url', 'Link', 'str'],
  ['caption', 'Caption', 'str']
];

var PRODUCTS = [
  ['steel', 'Steel Framing'],
  ['battens', 'Ceiling Battens'],
  ['doors', 'Pre-hung Doors'],
  ['brackets', 'Brackets']
];

var DEFAULT_SETTINGS = [
  ['Team Passcode', 'changeme', 'The passcode everyone types into the app. Change this!'],
  ['Manager Emails', '', 'Who gets the weekly team summary and monthly report. Separate several with commas.'],
  ['Company Name', 'CH Engineering', 'Used in emails.'],
  ['App Link', '', 'Your GitHub Pages link, e.g. https://yourname.github.io/ch-sales-tracker/ (used for the "Open the app" button in emails).'],
  ['Weekly Email Day', 'Monday', 'Day the weekly follow-up emails go out. After changing, run installTriggers() again.'],
  ['Weekly Email Hour', '8', 'Hour of the day (24h, NZ time) for the weekly emails. After changing, run installTriggers() again.'],
  ['Follow-up Days', '7', 'Days until the next follow-up for Interested / Maybe leads.'],
  ['Revisit Months', '6', 'Months before revisiting a Not Interested or Lost lead.'],
  ['Review Days', '30', 'Days after winning a job before the reminder to ask for a Google review.'],
  ['Shutdown Start (MM-DD)', '12-20', 'Christmas shutdown start. Follow-ups and weekly emails pause in this window.'],
  ['Shutdown End (MM-DD)', '01-12', 'Christmas shutdown end.'],
  ['Google Review Link', '', 'Your Google Business review link, used in the review request email.'],
  ['Brochure: Steel Framing', '', 'Link to the steel framing product sheet (optional).'],
  ['Brochure: Ceiling Battens', '', 'Link to the ceiling battens product sheet (optional).'],
  ['Brochure: Pre-hung Doors', '', 'Link to the pre-hung doors product sheet (optional).'],
  ['Brochure: Brackets', '', 'Link to the brackets product sheet (optional).'],
  ['Regions', 'Northland, Auckland, Waikato, Bay of Plenty, Gisborne, Hawke\'s Bay, Taranaki, Manawatū-Whanganui, Wellington, Nelson / Marlborough, Canterbury, Otago, Southland, West Coast', 'Region choices in the app (you can still type your own).'],
  ['Photo Folder ID', '', 'Filled in automatically by setup().']
];

var DEFAULT_TEMPLATES = [
  ['Follow-up', 'Following up from {{company_name}}',
   'Hi {{first_name}},\n\nThanks again for your time recently. I wanted to follow up on our chat about {{products}}.\n\n{{product_paragraphs}}\n\nHappy to answer any questions, put together a price, or pop out for a visit. Just let me know what suits.\n\nCheers,\n{{sender}}\n{{company_name}}\n\nIf you\'d rather not hear from us, just reply and let me know.'],
  ['Steel Framing', '', 'Our steel frames are made to your plans, arrive straight and true, and won\'t rot, warp or shrink.{{brochure}}'],
  ['Ceiling Battens', '', 'Our steel ceiling battens give you a flat, consistent ceiling line and are quick to install.{{brochure}}'],
  ['Pre-hung Doors', '', 'Our pre-hung doors come ready to install, saving your team time on site.{{brochure}}'],
  ['Brackets', '', 'We also supply a range of brackets to suit your build.{{brochure}}'],
  ['Review Request', 'Thanks for choosing {{company_name}}',
   'Hi {{first_name}},\n\nThanks so much for working with us on your recent job. We hope everything went smoothly.\n\nIf you have a minute, we\'d really appreciate a quick Google review. It helps other builders find us:\n{{review_link}}\n\nThanks again,\n{{sender}}\n{{company_name}}']
];

var DEFAULT_CHEATSHEET = [
  ['We\'ve always used timber.', 'Steel won\'t rot, warp, twist or shrink, so walls stay straight and there are fewer call-backs for cracked linings or sticking doors. Frames are made to the plans, so there\'s less cutting and waste on site.'],
  ['Steel costs more.', 'Compare the total installed cost, not just the frame price: less waste, no straightening or packing, faster to stand, and fewer defects to fix later.'],
  ['My sparkies and plumbers don\'t like steel.', 'Frames can come pre-punched for services, with grommets to protect cables and pipes. Offer to talk your trades through it before the first job.'],
  ['Isn\'t steel cold?', 'Steel framed homes are designed to meet the Building Code insulation requirements. Walk them through how we handle thermal performance on our builds.'],
  ['How do we fix things to the walls?', 'Plan fixing points (nogs and backing) at the frame stage, so kitchens, TVs and heavy items have solid fixing where they\'re needed.'],
  ['We\'re happy with our current supplier.', 'No problem. Ask if you can quote on their next job to compare, or offer one product (like pre-hung doors or battens) to start.'],
  ['What about lead times?', 'Give them our current lead time and offer to lock in a slot for their next project.'],
  ['Edit these!', 'This cheat sheet lives in the "Cheat Sheet" tab of the Google Sheet. Change, add or remove rows and the app updates.']
];

/* ============================================================
 * ONE-TIME SETUP
 * ============================================================ */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);

  ensureSheet_(SHEET.contacts, CONTACT_FIELDS.map(function (f) { return f[1]; }));
  ensureSheet_(SHEET.activity, ACTIVITY_FIELDS.map(function (f) { return f[1]; }));
  ensureSheet_(SHEET.photos, PHOTO_FIELDS.map(function (f) { return f[1]; }));

  var team = ensureSheet_(SHEET.team, ['Name', 'Email', 'Active (Yes/No)', 'Weekly Email (Yes/No)']);
  if (team.getLastRow() < 2) {
    team.getRange(2, 1, 1, 4).setValues([['Your Name', Session.getEffectiveUser().getEmail() || 'you@gmail.com', 'Yes', 'Yes']]);
  }

  var settings = ensureSheet_(SHEET.settings, ['Setting', 'Value', 'What it does']);
  var existing = readSettings_();
  DEFAULT_SETTINGS.forEach(function (row) {
    if (!(row[0] in existing)) settings.appendRow(row);
  });
  settings.setColumnWidth(1, 220); settings.setColumnWidth(2, 360); settings.setColumnWidth(3, 480);

  var tpl = ensureSheet_(SHEET.templates, ['Template', 'Subject', 'Body']);
  if (tpl.getLastRow() < 2) tpl.getRange(2, 1, DEFAULT_TEMPLATES.length, 3).setValues(DEFAULT_TEMPLATES);
  tpl.setColumnWidth(3, 600); tpl.getRange('C:C').setWrap(true);

  var cs = ensureSheet_(SHEET.cheatsheet, ['When they say...', 'You can say...']);
  if (cs.getLastRow() < 2) cs.getRange(2, 1, DEFAULT_CHEATSHEET.length, 2).setValues(DEFAULT_CHEATSHEET);
  cs.setColumnWidth(1, 300); cs.setColumnWidth(2, 600); cs.getRange('A:B').setWrap(true);

  // Photo folder in Drive
  var s = readSettings_();
  if (!s['Photo Folder ID']) {
    var folder = DriveApp.createFolder('CH Sales Tracker Photos');
    setSetting_('Photo Folder ID', folder.getId());
  }

  // Remove the default empty "Sheet1" if it's still there
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sheet1);

  installTriggers();
  Logger.log('All set! Now: 1) fill in the Team and Settings tabs, 2) Deploy > New deployment > Web app.');
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'weeklyReminders' || fn === 'monthlySummary') ScriptApp.deleteTrigger(t);
  });
  var s = readSettings_();
  var dayName = String(s['Weekly Email Day'] || 'Monday').trim().toUpperCase();
  var day = ScriptApp.WeekDay[dayName] || ScriptApp.WeekDay.MONDAY;
  var hour = Math.max(0, Math.min(23, parseInt(s['Weekly Email Hour'], 10) || 8));
  ScriptApp.newTrigger('weeklyReminders').timeBased().onWeekDay(day).atHour(hour).inTimezone(TZ).create();
  ScriptApp.newTrigger('monthlySummary').timeBased().onMonthDay(1).atHour(hour).inTimezone(TZ).create();
  Logger.log('Weekly emails: ' + dayName + ' at ' + hour + ':00. Monthly report: 1st of each month.');
}

/** Run this from the editor to preview the weekly emails right now. */
function testWeeklyEmails() { weeklyReminders(true); }
/** Run this from the editor to preview the monthly report right now. */
function testMonthlySummary() { monthlySummary(); }

/* ============================================================
 * WEB APP API
 * ============================================================ */

function doGet() {
  return json_({ ok: true, app: APP_NAME, message: 'The CH Sales Tracker connection is working. Paste this link into the app setup.' });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }

  var settings = readSettings_();
  var passcode = String(settings['Team Passcode'] || '').trim();
  if (!passcode || String(req.passcode || '').trim() !== passcode) {
    return json_({ ok: false, error: 'bad_passcode' });
  }

  try {
    switch (req.action) {
      case 'auth':
        return json_({ ok: true, config: publicConfig_(settings) });
      case 'getAll':
        return json_({ ok: true, data: allData_() });
      case 'sync':
        var lock = LockService.getScriptLock();
        lock.waitLock(25000);
        var results;
        try { results = (req.ops || []).map(function (op) { return runOp_(op, req.user); }); }
        finally { lock.releaseLock(); }
        return json_({ ok: true, results: results, data: allData_() });
      default:
        return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function runOp_(op, user) {
  try {
    if (op.op === 'saveContact') return { opId: op.opId, ok: true, contact: saveContact_(op.contact) };
    if (op.op === 'addActivity') { addActivity_(op.activity); return { opId: op.opId, ok: true }; }
    if (op.op === 'uploadPhoto') return { opId: op.opId, ok: true, photo: uploadPhoto_(op.photo, user) };
    return { opId: op.opId, ok: false, error: 'unknown_op' };
  } catch (err) {
    return { opId: op.opId, ok: false, error: String(err && err.message || err) };
  }
}

function publicConfig_(settings) {
  var pub = {};
  Object.keys(settings).forEach(function (k) {
    if (k !== 'Team Passcode' && k !== 'Photo Folder ID' && k !== 'Manager Emails') pub[k] = settings[k];
  });
  return {
    settings: pub,
    team: readTeam_().filter(function (t) { return t.active; }).map(function (t) { return { name: t.name }; }),
    templates: readTemplates_(),
    cheatsheet: readRows_(SHEET.cheatsheet).map(function (r) { return { q: String(r[0] || ''), a: String(r[1] || '') }; })
      .filter(function (r) { return r.q || r.a; }),
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl()
  };
}

function allData_() {
  var activity = readObjects_(SHEET.activity, ACTIVITY_FIELDS);
  if (activity.length > 4000) activity = activity.slice(activity.length - 4000);
  return {
    contacts: readObjects_(SHEET.contacts, CONTACT_FIELDS).map(contactFromRow_),
    activity: activity,
    photos: readObjects_(SHEET.photos, PHOTO_FIELDS),
    serverTime: new Date().toISOString()
  };
}

/* ---------- contacts ---------- */

function contactFromRow_(o) {
  return {
    id: o.id, createdAt: o.createdAt, updatedAt: o.updatedAt, createdBy: o.createdBy, owner: o.owner,
    company: o.company, region: o.region, address: o.address, customerType: o.customerType,
    people: Array.isArray(o.people) && o.people.length ? o.people
      : [{ name: o.primaryName || '', role: '', phone: o.primaryPhone || '', email: o.primaryEmail || '' }],
    products: { steel: o.steel || '', battens: o.battens || '', doors: o.doors || '', brackets: o.brackets || '' },
    status: o.status, temperature: o.temperature, stage: o.stage || 'Lead', reason: o.reason,
    lastContacted: o.lastContacted, nextFollowUp: o.nextFollowUp, followUpType: o.followUpType,
    emailConsent: o.emailConsent, quoteAmount: o.quoteAmount, quoteDate: o.quoteDate, quoteLink: o.quoteLink,
    houses: o.houses, projectStart: o.projectStart, supplier: o.supplier, source: o.source, event: o.event,
    referredBy: o.referredBy, notes: o.notes, archived: o.archived,
    lat: o.lat ? Number(o.lat) : null, lng: o.lng ? Number(o.lng) : null, geoAddress: o.geoAddress
  };
}

function saveContact_(c) {
  if (!c || !c.id) throw new Error('Contact is missing an ID');
  var sheet = sheet_(SHEET.contacts);
  var people = (c.people || []).filter(function (p) { return p && (p.name || p.phone || p.email); });
  var primary = people[0] || {};
  var products = c.products || {};

  // Map location lookup when the address is new or changed
  if (c.address && (c.address !== c.geoAddress || !c.lat)) {
    var loc = geocode_(c.address, c.region);
    if (loc) { c.lat = loc.lat; c.lng = loc.lng; c.geoAddress = c.address; }
  }
  if (!c.address) { c.lat = null; c.lng = null; c.geoAddress = ''; }

  var flat = {};
  Object.keys(c).forEach(function (k) { flat[k] = c[k]; });
  flat.people = people;
  flat.primaryName = primary.name || '';
  flat.primaryPhone = primary.phone || '';
  flat.primaryEmail = primary.email || '';
  PRODUCTS.forEach(function (p) { flat[p[0]] = products[p[0]] || ''; });
  flat.updatedAt = c.updatedAt || new Date().toISOString();

  upsertRow_(sheet, CONTACT_FIELDS, flat);
  return { id: c.id, lat: c.lat || null, lng: c.lng || null, geoAddress: c.geoAddress || '' };
}

function geocode_(address, region) {
  try {
    var q = address;
    if (region && address.toLowerCase().indexOf(String(region).toLowerCase()) === -1) q += ', ' + region;
    if (!/new zealand|\bnz\b/i.test(q)) q += ', New Zealand';
    var res = Maps.newGeocoder().setRegion('nz').geocode(q);
    if (res && res.status === 'OK' && res.results && res.results.length) {
      var l = res.results[0].geometry.location;
      return { lat: l.lat, lng: l.lng };
    }
  } catch (err) { /* map lookup is optional */ }
  return null;
}

/* ---------- activity & photos ---------- */

function addActivity_(a) {
  if (!a || !a.id) throw new Error('Activity is missing an ID');
  var sheet = sheet_(SHEET.activity);
  if (findRow_(sheet, a.id)) return; // already saved (retry after a dropped connection)
  appendObject_(sheet, ACTIVITY_FIELDS, a);
}

function uploadPhoto_(p, user) {
  if (!p || !p.id || !p.dataUrl) throw new Error('Photo is missing data');
  var sheet = sheet_(SHEET.photos);
  var existingRow = findRow_(sheet, p.id);
  if (existingRow) {
    var vals = sheet.getRange(existingRow, 1, 1, PHOTO_FIELDS.length).getValues()[0];
    return { id: p.id, fileId: vals[5], url: vals[6] };
  }
  var m = String(p.dataUrl).match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) throw new Error('Photo format not recognised');
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1],
    safeName_(p.company || 'photo') + '_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd_HHmmss') + '.jpg');
  var folder = photoFolder_();
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* sharing may be restricted */ }
  var row = {
    id: p.id, contactId: p.contactId, company: p.company || '', at: p.at || new Date().toISOString(),
    user: p.user || user || '', fileId: file.getId(), url: file.getUrl(), caption: p.caption || ''
  };
  appendObject_(sheet, PHOTO_FIELDS, row);
  return { id: p.id, fileId: row.fileId, url: row.url };
}

function photoFolder_() {
  var id = readSettings_()['Photo Folder ID'];
  if (id) { try { return DriveApp.getFolderById(id); } catch (err) { /* recreate below */ } }
  var folder = DriveApp.createFolder('CH Sales Tracker Photos');
  setSetting_('Photo Folder ID', folder.getId());
  return folder;
}

/* ============================================================
 * EMAILS
 * ============================================================ */

function weeklyReminders(force) {
  var s = readSettings_();
  var today = todayStr_();
  if (!force && inShutdown_(today, s)) return;

  var weekAhead = addDaysStr_(today, 7);
  var contacts = readObjects_(SHEET.contacts, CONTACT_FIELDS).map(contactFromRow_)
    .filter(function (c) { return !c.archived && c.nextFollowUp && c.nextFollowUp <= weekAhead; })
    .sort(function (a, b) { return a.nextFollowUp < b.nextFollowUp ? -1 : 1; });

  var team = readTeam_().filter(function (t) { return t.active; });
  var names = team.map(function (t) { return t.name; });
  var appLink = s['App Link'] || '';

  team.forEach(function (t) {
    if (!t.weekly || !t.email) return;
    var mine = contacts.filter(function (c) { return c.owner === t.name; });
    if (!mine.length) return;
    var html = emailShell_(
      'Your follow-ups this week',
      '<p style="margin:0 0 16px">Kia ora ' + esc_(firstName_(t.name)) + ', here\'s who to follow up with this week.</p>' +
      followUpTables_(mine, today) + appButton_(appLink)
    );
    MailApp.sendEmail({ to: t.email, subject: 'Your follow-ups this week (' + mine.length + ')', htmlBody: html, name: APP_NAME });
  });

  var managers = String(s['Manager Emails'] || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (!managers.length) return;

  var weekAgoIso = new Date(Date.now() - 7 * 86400000).toISOString();
  var acts = readObjects_(SHEET.activity, ACTIVITY_FIELDS).filter(function (a) { return a.at >= weekAgoIso; });
  var allContacts = readObjects_(SHEET.contacts, CONTACT_FIELDS);
  var newLeads = allContacts.filter(function (c) { return c.createdAt >= weekAgoIso; }).length;
  var wins = acts.filter(function (a) { return a.type === 'Won'; }).length;
  var logged = acts.filter(function (a) { return a.type !== 'Edit' && a.type !== 'Won'; }).length;

  var sections = '';
  team.forEach(function (t) {
    var list = contacts.filter(function (c) { return c.owner === t.name; });
    if (list.length) sections += '<h3 style="font-size:16px;margin:24px 0 8px">' + esc_(t.name) + ' (' + list.length + ')</h3>' + followUpTables_(list, today);
  });
  var unassigned = contacts.filter(function (c) { return names.indexOf(c.owner) === -1; });
  if (unassigned.length) sections += '<h3 style="font-size:16px;margin:24px 0 8px">Not assigned to anyone (' + unassigned.length + ')</h3>' + followUpTables_(unassigned, today);
  if (!sections) sections = '<p>Nothing due this week. Nice work!</p>';

  var stats = statRow_([['New leads', newLeads], ['Contacts logged', logged], ['Jobs won', wins], ['Due this week', contacts.length]]);
  var html = emailShell_('Team follow-ups this week', stats + sections + appButton_(appLink));
  MailApp.sendEmail({ to: managers.join(','), subject: 'Team follow-ups this week (' + contacts.length + ')', htmlBody: html, name: APP_NAME });
}

function monthlySummary() {
  var s = readSettings_();
  var managers = String(s['Manager Emails'] || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (!managers.length) return;

  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var end = new Date(now.getFullYear(), now.getMonth(), 1);
  var startIso = start.toISOString(), endIso = end.toISOString();
  var monthName = Utilities.formatDate(start, TZ, 'MMMM yyyy');

  var contacts = readObjects_(SHEET.contacts, CONTACT_FIELDS).map(contactFromRow_);
  var acts = readObjects_(SHEET.activity, ACTIVITY_FIELDS).filter(function (a) { return a.at >= startIso && a.at < endIso; });
  var newOnes = contacts.filter(function (c) { return c.createdAt >= startIso && c.createdAt < endIso; });
  var wins = acts.filter(function (a) { return a.type === 'Won'; });

  var productCounts = PRODUCTS.map(function (p) {
    return [p[1], newOnes.filter(function (c) { return c.products[p[0]]; }).length];
  });
  var reasons = tally_(contacts.filter(function (c) { return c.reason && c.updatedAt >= startIso && c.updatedAt < endIso; }), 'reason');
  var sources = tally_(newOnes, 'source');

  var people = {};
  acts.forEach(function (a) { if (a.type !== 'Edit') people[a.user] = (people[a.user] || 0) + 1; });
  var top = Object.keys(people).sort(function (a, b) { return people[b] - people[a]; })[0];

  var body = statRow_([['New leads', newOnes.length], ['Contacts logged', acts.filter(function (a) { return a.type !== 'Edit'; }).length], ['Jobs won', wins.length]]) +
    listTable_('What new leads were interested in', productCounts) +
    listTable_('Where new leads came from', sources) +
    listTable_('Reasons for not interested / lost', reasons) +
    (wins.length ? listTable_('Jobs won', wins.map(function (w) { return [w.company, w.user]; })) : '') +
    (top ? '<p style="margin:20px 0 0">🏆 Most active: <b>' + esc_(top) + '</b> with ' + people[top] + ' contacts logged.</p>' : '') +
    appButton_(s['App Link']);

  MailApp.sendEmail({ to: managers.join(','), subject: 'Sales summary for ' + monthName, htmlBody: emailShell_('Sales summary for ' + monthName, body), name: APP_NAME });
}

function followUpTables_(list, today) {
  var overdue = list.filter(function (c) { return c.nextFollowUp < today; });
  var rest = list.filter(function (c) { return c.nextFollowUp >= today; });
  var out = '';
  if (overdue.length) out += tableFor_('Overdue', '#D92D20', overdue);
  if (rest.length) out += tableFor_('Due this week', '#B54708', rest);
  return out;
}

function tableFor_(title, colour, list) {
  var rows = list.map(function (c) {
    var p = c.people[0] || {};
    var prods = PRODUCTS.filter(function (x) { return c.products[x[0]]; })
      .map(function (x) { return x[1] + (c.products[x[0]] === 'Maybe' ? ' (maybe)' : ''); }).join(', ');
    var kind = c.followUpType === 'revisit' ? 'Revisit' : c.followUpType === 'review' ? 'Ask for review' : c.followUpType === 'callback' ? 'Call back' : 'Follow up';
    return '<tr>' +
      '<td style="padding:10px 8px;border-bottom:1px solid #E6E6E1;vertical-align:top"><b>' + esc_(c.company) + '</b><br>' +
        '<span style="color:#5C5F63">' + esc_(p.name || '') + (p.phone ? '<br><a href="tel:' + esc_(p.phone.replace(/\s/g, '')) + '" style="color:#000">' + esc_(p.phone) + '</a>' : '') + '</span></td>' +
      '<td style="padding:10px 8px;border-bottom:1px solid #E6E6E1;vertical-align:top">' + esc_(prods || '-') + '<br><span style="color:#5C5F63">' + esc_(c.status || '') + '</span></td>' +
      '<td style="padding:10px 8px;border-bottom:1px solid #E6E6E1;vertical-align:top;white-space:nowrap">' + esc_(kind) + '<br><span style="color:#5C5F63">' + niceDate_(c.nextFollowUp) + '</span></td>' +
      '</tr>';
  }).join('');
  return '<h4 style="margin:16px 0 6px;color:' + colour + ';font-size:14px">' + title + ' (' + list.length + ')</h4>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px">' + rows + '</table>';
}

function statRow_(pairs) {
  return '<table style="width:100%;border-collapse:collapse;margin:0 0 8px"><tr>' + pairs.map(function (p) {
    return '<td style="padding:12px;border:1px solid #E6E6E1;text-align:center"><div style="font-size:24px;font-weight:800">' + p[1] + '</div><div style="font-size:12px;color:#5C5F63">' + esc_(p[0]) + '</div></td>';
  }).join('') + '</tr></table>';
}

function listTable_(title, pairs) {
  if (!pairs.length) return '';
  return '<h4 style="margin:20px 0 6px;font-size:14px">' + esc_(title) + '</h4><table style="width:100%;border-collapse:collapse;font-size:14px">' +
    pairs.map(function (p) { return '<tr><td style="padding:6px 8px;border-bottom:1px solid #E6E6E1">' + esc_(String(p[0] || 'Not recorded')) + '</td><td style="padding:6px 8px;border-bottom:1px solid #E6E6E1;text-align:right"><b>' + esc_(String(p[1])) + '</b></td></tr>'; }).join('') +
    '</table>';
}

function emailShell_(title, inner) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;color:#1F2023;max-width:640px;margin:0 auto">' +
    '<div style="border-top:8px solid #FFE400;padding:18px 20px 6px"><div style="font-size:13px;font-weight:bold;letter-spacing:.5px">CH ENGINEERING<span style="color:#8A8F94"> | Sales Tracker</span></div>' +
    '<h2 style="margin:10px 0 0;font-size:22px">' + esc_(title) + '</h2></div>' +
    '<div style="padding:12px 20px 24px">' + inner + '</div></div>';
}

function appButton_(link) {
  if (!link) return '';
  return '<p style="margin:24px 0 0"><a href="' + esc_(link) + '" style="background:#FFE400;color:#000;padding:12px 18px;text-decoration:none;font-weight:bold;border-radius:6px;display:inline-block">Open the Sales Tracker</a></p>';
}

/* ============================================================
 * HELPERS
 * ============================================================ */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet "' + name + '". Run setup() in Apps Script.');
  return sh;
}

function ensureSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#FFE400');
    sh.setFrozenRows(1);
  } else {
    // add any missing columns (for future updates)
    var current = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    headers.forEach(function (h) {
      if (current.indexOf(h) === -1) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(h).setFontWeight('bold').setBackground('#FFE400');
      }
    });
  }
  return sh;
}

function headerMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var map = {};
  headers.forEach(function (h, i) { map[String(h).trim()] = i; });
  return { map: map, width: lastCol };
}

function cellToString_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  if (v === null || v === undefined) return '';
  return String(v);
}

function readObjects_(name, fields) {
  var sheet = sheet_(name);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var hm = headerMap_(sheet);
  var values = sheet.getRange(2, 1, last - 1, hm.width).getValues();
  return values.filter(function (r) { return r[hm.map[fields[0][1]]]; }).map(function (r) {
    var o = {};
    fields.forEach(function (f) {
      var idx = hm.map[f[1]];
      var raw = idx === undefined ? '' : r[idx];
      if (f[2] === 'json') { try { o[f[0]] = raw ? JSON.parse(raw) : null; } catch (e) { o[f[0]] = null; } }
      else if (f[2] === 'bool') o[f[0]] = raw === true || String(raw).toUpperCase() === 'TRUE' || String(raw).toLowerCase() === 'yes';
      else o[f[0]] = cellToString_(raw);
    });
    return o;
  });
}

function toRow_(sheet, fields, obj, existing) {
  var hm = headerMap_(sheet);
  var row = existing ? existing.slice() : new Array(hm.width).fill('');
  fields.forEach(function (f) {
    var idx = hm.map[f[1]];
    if (idx === undefined) return;
    var v = obj[f[0]];
    if (f[2] === 'json') v = v ? JSON.stringify(v) : '';
    else if (f[2] === 'bool') v = v ? 'Yes' : 'No';
    else v = (v === null || v === undefined) ? '' : String(v);
    row[idx] = v;
  });
  return row;
}

function findRow_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2 || !id) return 0;
  var cell = sheet.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}

function upsertRow_(sheet, fields, obj) {
  var row = findRow_(sheet, obj.id);
  var width = headerMap_(sheet).width;
  if (row) {
    var existing = sheet.getRange(row, 1, 1, width).getValues()[0];
    sheet.getRange(row, 1, 1, width).setNumberFormat('@').setValues([toRow_(sheet, fields, obj, existing)]);
  } else {
    appendObject_(sheet, fields, obj);
  }
}

function appendObject_(sheet, fields, obj) {
  var values = toRow_(sheet, fields, obj);
  var row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, values.length).setNumberFormat('@').setValues([values]);
}

function readRows_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

function readSettings_() {
  var out = {};
  readRows_(SHEET.settings).forEach(function (r) { if (r[0]) out[String(r[0]).trim()] = cellToString_(r[1]).trim(); });
  return out;
}

function setSetting_(key, value) {
  var sh = sheet_(SHEET.settings);
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === key) { sh.getRange(i + 2, 2).setValue(value); return; }
  }
  sh.appendRow([key, value, '']);
}

function readTeam_() {
  return readRows_(SHEET.team).filter(function (r) { return r[0]; }).map(function (r) {
    return {
      name: String(r[0]).trim(),
      email: String(r[1] || '').trim(),
      active: String(r[2] || 'Yes').toLowerCase().indexOf('n') !== 0,
      weekly: String(r[3] || 'Yes').toLowerCase().indexOf('n') !== 0
    };
  });
}

function readTemplates_() {
  var out = {};
  readRows_(SHEET.templates).forEach(function (r) {
    if (r[0]) out[String(r[0]).trim()] = { subject: String(r[1] || ''), body: String(r[2] || '') };
  });
  return out;
}

function todayStr_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

function addDaysStr_(dateStr, days) {
  var p = dateStr.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12));
  d.setUTCDate(d.getUTCDate() + days);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function niceDate_(dateStr) {
  if (!dateStr) return '';
  var p = dateStr.split('-').map(Number);
  return Utilities.formatDate(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)), 'UTC', 'EEE d MMM');
}

function inShutdown_(dateStr, s) {
  var start = String(s['Shutdown Start (MM-DD)'] || '').trim();
  var end = String(s['Shutdown End (MM-DD)'] || '').trim();
  if (!/^\d\d-\d\d$/.test(start) || !/^\d\d-\d\d$/.test(end)) return false;
  var md = dateStr.slice(5);
  return start <= end ? (md >= start && md <= end) : (md >= start || md <= end);
}

function tally_(list, key) {
  var t = {};
  list.forEach(function (x) { var k = x[key] || 'Not recorded'; t[k] = (t[k] || 0) + 1; });
  return Object.keys(t).sort(function (a, b) { return t[b] - t[a]; }).map(function (k) { return [k, t[k]]; });
}

function firstName_(name) { return String(name || '').split(' ')[0]; }
function safeName_(s) { return String(s).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'photo'; }
function esc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
