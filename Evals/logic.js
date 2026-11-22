/* Hereabouts core rules. Pure functions, no DOM. Inlined into the page and tested with Node. */
(function (root) {
  'use strict';
  var MIN = 60000, HOUR = 3600000, DAY = 86400000;

  var ZONES = { academic: 'Academic area', hostels: 'Hostels', commons: 'Campus commons', transit: 'On the move' };

  var LOCATIONS = [
    { id: 'lhc', name: 'LHC (Lecture Hall Complex)', zone: 'academic' },
    { id: 'lib', name: 'Central Library', zone: 'academic' },
    { id: 'cc', name: 'Computer Centre (CC)', zone: 'academic' },
    { id: 'main', name: 'Main Building', zone: 'academic' },
    { id: 'kresit', name: 'KReSIT (CSE)', zone: 'academic' },
    { id: 'ee', name: 'Electrical Dept', zone: 'academic' },
    { id: 'me', name: 'Mechanical Dept', zone: 'academic' },
    { id: 'ce', name: 'Civil Dept', zone: 'academic' },
    { id: 'che', name: 'Chemical Dept', zone: 'academic' },
    { id: 'phy', name: 'Physics Dept', zone: 'academic' },
    { id: 'som', name: 'SJMSOM', zone: 'academic' },
    { id: 'conv', name: 'Convocation Hall', zone: 'academic' },
    { id: 'vmcc', name: 'VMCC', zone: 'academic' }
  ];
  for (var i = 1; i <= 18; i++) {
    if (i === 17) continue; /* IITB numbers hostels 1-16 and 18, plus Tansa */
    LOCATIONS.push({ id: 'h' + i, name: 'Hostel ' + i, zone: 'hostels' });
  }
  LOCATIONS.push(
    { id: 'tansa', name: 'Tansa Hostel', zone: 'hostels' },
    { id: 'sac', name: 'SAC (Students’ Activity Centre)', zone: 'commons' },
    { id: 'gym', name: 'Gymkhana', zone: 'commons' },
    { id: 'market', name: 'IIT Market', zone: 'commons' },
    { id: 'gate', name: 'Main Gate', zone: 'commons' },
    { id: 'shuttle', name: 'Campus shuttle bus', zone: 'transit' }
  );

  var CATEGORIES = [
    { id: 'charger', label: 'Charger / cable' },
    { id: 'umbrella', label: 'Umbrella' },
    { id: 'earbuds', label: 'Earbuds / headphones' },
    { id: 'watch', label: 'Watch / band' },
    { id: 'id', label: 'ID card', sensitive: true },
    { id: 'device', label: 'Phone / tablet', sensitive: true },
    { id: 'bottle', label: 'Bottle / lunchbox' },
    { id: 'calc', label: 'Calculator / stationery' },
    { id: 'notes', label: 'Notes / books' },
    { id: 'bag', label: 'Bag / other' }
  ];
  var NEED_CATS = ['charger', 'umbrella', 'calc', 'notes', 'bag'];
  var NEED_TTLS = [15, 30, 60];
  var TTL = { need: 30 * MIN, lost: 14 * DAY, found: 14 * DAY };
  var MATCH_MIN = 3;

  function byId(list, id) { for (var k = 0; k < list.length; k++) if (list[k].id === id) return list[k]; return null; }
  function locById(id) { return byId(LOCATIONS, id); }
  function catById(id) { return byId(CATEGORIES, id); }
  function locName(id) { var l = locById(id); return l ? l.name : id; }
  function catLabel(id) { var c = catById(id); return c ? c.label : id; }
  function isSensitive(id) { var c = catById(id); return !!(c && c.sensitive); }
  function fail(reason) { return { ok: false, reason: reason }; }

  /* Holders have the item (a Found post, including things picked up by mistake). Seekers are people who lost it. */
  function isHolder(p) { return p.type === 'found'; }

  function isOpen(p, now) { return p.status === 'open' && now < p.expires; }
  function statusOf(p, now) {
    if (p.status === 'closed') return 'closed';
    if (p.status === 'claimed') return 'claimed';
    return now >= p.expires ? 'expired' : 'open';
  }

  /* What another student is allowed to read. Found IDs and phones keep their details private. */
  function view(p, viewer) {
    var masked = isHolder(p) && isSensitive(p.category) && p.author !== viewer.id;
    var out = {}; for (var k in p) out[k] = p[k];
    if (masked) out.desc = 'Details withheld until the owner is verified.';
    out.masked = masked;
    return out;
  }

  function makePost(f, user, now, counter) {
    if (['lost', 'found', 'need'].indexOf(f.type) < 0) return fail('bad-type');
    if (!catById(f.category)) return fail('bad-category');
    if (!locById(f.loc)) return fail('bad-location');
    var desc = (f.desc || '').trim();
    if (desc.length < 3) return fail('desc-short');
    var verifyQ = (f.verifyQ || '').trim();
    var holder = f.type === 'found';
    if (holder && isSensitive(f.category) && !verifyQ) return fail('verify-required');
    var nowAt = holder ? (f.nowAt || f.loc) : '';
    if (holder && !locById(nowAt)) return fail('bad-location');
    var ttl = TTL[f.type];
    if (f.type === 'need') ttl = (NEED_TTLS.indexOf(f.ttlMin) >= 0 ? f.ttlMin : 30) * MIN;
    return {
      ok: true,
      post: {
        id: 'p' + counter, type: f.type, category: f.category, desc: desc, loc: f.loc,
        author: user.id, created: now, expires: now + ttl, status: 'open',
        nowAt: nowAt, verifyQ: holder ? verifyQ : '', claims: []
      }
    };
  }

  /* Need-now posts reach only people standing in the same place. */
  function needFeed(posts, viewer, now) {
    var here = [], hidden = 0;
    posts.forEach(function (p) {
      if (p.type !== 'need' || !isOpen(p, now)) return;
      if (p.author === viewer.id || p.loc === viewer.loc) here.push(p); else hidden++;
    });
    here.sort(function (a, b) { return b.created - a.created; });
    return { here: here, hidden: hidden };
  }

  function filterLF(posts, viewer, now, o) {
    var q = (o.q || '').trim().toLowerCase();
    var maxAge = o.maxAgeDays ? o.maxAgeDays * DAY : Infinity;
    return posts.filter(function (p) {
      if (p.type === 'need' || !isOpen(p, now)) return false;
      if (o.type && p.type !== o.type) return false;
      if (o.category && p.category !== o.category) return false;
      if (o.loc) {
        if (o.loc.indexOf('zone:') === 0) { var l = locById(p.loc); if (!l || l.zone !== o.loc.slice(5)) return false; }
        else if (p.loc !== o.loc) return false;
      }
      if (now - p.created > maxAge) return false;
      if (q) {
        var hay = (catLabel(p.category) + ' ' + view(p, viewer).desc + ' ' + locName(p.loc)).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return b.created - a.created; });
  }

  function locScore(x, y) {
    if (x === y) return 3;
    var lx = locById(x), ly = locById(y);
    return lx && ly && lx.zone === ly.zone ? 1.5 : 0;
  }
  function matchScore(a, b, now) {
    if (a.id === b.id || a.type === 'need' || b.type === 'need') return 0;
    if (isHolder(a) === isHolder(b)) return 0; /* one side lost it, the other side holds it */
    if (a.category !== b.category || a.author === b.author) return 0;
    if (!isOpen(a, now) || !isOpen(b, now)) return 0;
    var h = isHolder(a) ? a : b, s = isHolder(a) ? b : a;
    var loc = Math.max(locScore(h.loc, s.loc), locScore(h.nowAt || h.loc, s.loc));
    var dt = Math.abs(a.created - b.created);
    var time = dt <= DAY ? 2 : dt <= 3 * DAY ? 1 : dt <= 14 * DAY ? 0.5 : 0;
    return loc + time;
  }
  function suggestMatches(p, posts, now) {
    return posts.map(function (o) { return { post: o, score: matchScore(p, o, now) }; })
      .filter(function (m) { return m.score >= MATCH_MIN; })
      .sort(function (x, y) { return y.score - x.score; }).slice(0, 3);
  }

  function addClaim(p, user, text, now) {
    if (!isOpen(p, now)) return fail('closed');
    if (p.author === user.id) return fail('own-post');
    if (p.type === 'need' && p.loc !== user.loc) return fail('not-nearby');
    if (p.claims.some(function (c) { return c.by === user.id && c.status !== 'declined'; })) return fail('duplicate');
    text = (text || '').trim();
    if (isHolder(p) && isSensitive(p.category) && !text) return fail('answer-required');
    p.claims.push({ id: p.id + 'c' + (p.claims.length + 1), by: user.id, text: text, status: 'pending', at: now });
    return { ok: true };
  }

  function decideClaim(p, claimId, actor, approve, now) {
    if (p.author !== actor.id) return fail('not-author');
    if (p.status !== 'open' || now >= p.expires) return fail('closed');
    var c = null; p.claims.forEach(function (x) { if (x.id === claimId) c = x; });
    if (!c || c.status !== 'pending') return fail('no-claim');
    if (approve) {
      c.status = 'approved'; p.status = 'claimed';
      p.claims.forEach(function (x) { if (x !== c && x.status === 'pending') x.status = 'declined'; });
    } else c.status = 'declined';
    return { ok: true };
  }

  function closePost(p, actor) {
    if (p.author !== actor.id) return fail('not-author');
    p.status = 'closed';
    return { ok: true };
  }

  /* Contact details appear only for the two people who agreed to the handoff. */
  function contactFor(p, viewer, users) {
    if (p.status !== 'claimed' && p.status !== 'closed') return null;
    var c = null; p.claims.forEach(function (x) { if (x.status === 'approved') c = x; });
    if (!c) return null;
    if (viewer.id === p.author) return users[c.by].contact;
    if (viewer.id === c.by) return users[p.author].contact;
    return null;
  }

  function ago(ms) {
    var m = Math.floor(ms / MIN);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.floor(ms / HOUR);
    if (h < 24) return h + ' h ago';
    return Math.floor(ms / DAY) + ' d ago';
  }
  function left(ms) {
    if (ms <= 0) return '0 min';
    var m = Math.ceil(ms / MIN);
    if (m < 60) return m + ' min';
    var h = Math.ceil(ms / HOUR);
    if (h < 48) return h + ' h';
    return Math.ceil(ms / DAY) + ' d';
  }

  var api = {
    MIN: MIN, HOUR: HOUR, DAY: DAY, ZONES: ZONES, LOCATIONS: LOCATIONS, CATEGORIES: CATEGORIES,
    NEED_CATS: NEED_CATS, NEED_TTLS: NEED_TTLS, TTL: TTL, MATCH_MIN: MATCH_MIN,
    locById: locById, catById: catById, locName: locName, catLabel: catLabel, isSensitive: isSensitive,
    isOpen: isOpen, isHolder: isHolder, statusOf: statusOf, view: view, makePost: makePost, needFeed: needFeed,
    filterLF: filterLF, matchScore: matchScore, suggestMatches: suggestMatches, addClaim: addClaim,
    decideClaim: decideClaim, closePost: closePost, contactFor: contactFor, ago: ago, left: left
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Hereabouts = api;
})(typeof window !== 'undefined' ? window : globalThis);
