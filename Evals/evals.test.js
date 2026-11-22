/* Evals for CampusPing rules. Run: node evals.test.js (needs logic.js, the same rules module the app uses) */
const H = require('./logic.js');
const { MIN, HOUR, DAY } = H;
const T = 1_000_000_000_000;
const A = { id: 'a', name: 'Monica', loc: 'lhc', contact: 'Monica@iitb.ac.in' };
const M = { id: 'm', name: 'Meera', loc: 'lib', contact: 'meera@iitb.ac.in' };
const R = { id: 'r', name: 'Rohan', loc: 'h5', contact: 'rohan@iitb.ac.in' };
const USERS = { a: A, m: M, r: R };

let n = 0, pass = 0; const rows = [];
function ev(id, name, fn) {
  n++;
  try { fn(); pass++; rows.push([id, name, 'PASS']); }
  catch (e) { rows.push([id, name, 'FAIL: ' + e.message]); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'expected') + ': got ' + a + ', want ' + b); }
function mk(type, cat, loc, desc, author, ageMs, extra) {
  const r = H.makePost(Object.assign({ type, category: cat, loc, desc }, extra || {}), author, T - ageMs, Math.random().toString(36).slice(2, 6));
  if (!r.ok) throw new Error('makePost failed: ' + r.reason);
  return r.post;
}

/* Proximity visibility */
ev('V1', 'Need-now is visible to a student in the same place', () => {
  const p = mk('need', 'charger', 'lib', 'iPhone charger', M, 0);
  eq(H.needFeed([p], { id: 'z', loc: 'lib' }, T).here.length, 1);
});
ev('V2', 'Need-now is hidden from a student in another place', () => {
  const p = mk('need', 'charger', 'lib', 'charger please', M, 0);
  const f = H.needFeed([p], A, T); eq(f.here.length, 0); eq(f.hidden, 1, 'hidden count');
});
ev('V3', 'Author still sees own need-now after moving away', () => {
  const p = mk('need', 'charger', 'lib', 'charger please', M, 0);
  M.loc = 'h5'; eq(H.needFeed([p], M, T).here.length, 1); M.loc = 'lib';
});
ev('V4', 'Lost and found posts are campus-wide', () => {
  const p1 = mk('found', 'umbrella', 'lhc', 'black umbrella', M, HOUR);
  const p2 = mk('found', 'umbrella', 'lhc', 'took wrong umbrella', R, HOUR, { nowAt: 'h5' });
  eq(H.filterLF([p1, p2], R, T, {}).length, 2);
});

/* Expiry */
ev('X1', 'Need-now open just before 30 min, gone at 30 min', () => {
  const p = mk('need', 'umbrella', 'lib', 'rain', M, 0);
  eq(H.needFeed([p], M, T + 29 * MIN).here.length, 1);
  eq(H.needFeed([p], M, T + 30 * MIN).here.length, 0);
});
ev('X2', 'Need-now TTL honours 15/60 and falls back to 30 for other values', () => {
  const t = (m) => H.makePost({ type: 'need', category: 'charger', loc: 'lib', desc: 'abc', ttlMin: m }, M, T, 1).post.expires - T;
  eq(t(15), 15 * MIN); eq(t(60), 60 * MIN); eq(t(999), 30 * MIN);
});
ev('X3', 'Lost and found posts expire after 14 days', () => {
  const p = mk('found', 'umbrella', 'lhc', 'black umbrella', M, 0);
  eq(H.filterLF([p], A, T + 13 * DAY, {}).length, 1);
  eq(H.filterLF([p], A, T + 14 * DAY, {}).length, 0);
});
ev('X4', 'Closed and claimed posts leave the feeds', () => {
  const p = mk('found', 'bottle', 'lib', 'blue bottle', M, 0);
  H.closePost(p, M); eq(H.filterLF([p], A, T, {}).length, 0);
});

/* Privacy of sensitive items */
ev('P1', 'Found ID and phone details are masked for others, visible to author', () => {
  const p = mk('found', 'id', 'lib', 'Name Rahul Sharma 23B1234', M, 0, { verifyQ: 'Department?' });
  const m = mk('found', 'device', 'lhc', 'iPad passcode 1234', R, 0, { verifyQ: 'Case colour?' });
  eq(H.view(p, A).masked, true); eq(H.view(p, A).desc.includes('Rahul'), false, 'leak');
  eq(H.view(p, M).desc.includes('Rahul'), true, 'author view');
  eq(H.view(m, A).masked, true); eq(H.view(m, A).desc.includes('1234'), false, 'mistake leak');
});
ev('P2', 'Search does not leak masked details', () => {
  const p = mk('found', 'id', 'lib', 'Name Rahul Sharma 23B1234', M, 0, { verifyQ: 'Department?' });
  eq(H.filterLF([p], A, T, { q: 'rahul' }).length, 0, 'other user');
  eq(H.filterLF([p], M, T, { q: 'rahul' }).length, 1, 'author');
});
ev('P3', 'Found ID or phone without a verification question is rejected', () => {
  eq(H.makePost({ type: 'found', category: 'id', loc: 'lib', desc: 'ID card' }, M, T, 1).reason, 'verify-required');
  eq(H.makePost({ type: 'found', category: 'device', loc: 'lhc', desc: 'iPad' }, R, T, 1).reason, 'verify-required');
});
ev('P4', 'Claim on a found ID or phone needs an answer', () => {
  const p = mk('found', 'device', 'lhc', 'iPad', R, 0, { verifyQ: 'Case?' });
  eq(H.addClaim(p, A, '  ', T).reason, 'answer-required');
  eq(H.addClaim(p, A, 'Blue folio case', T).ok, true);
});

/* Claim and handoff */
ev('C1', 'Cannot claim own post, duplicates, expired or off-location need', () => {
  const f = mk('found', 'umbrella', 'lhc', 'black umbrella', M, 0);
  eq(H.addClaim(f, M, 'x', T).reason, 'own-post');
  H.addClaim(f, A, 'wooden handle', T); eq(H.addClaim(f, A, 'again', T).reason, 'duplicate');
  eq(H.addClaim(f, R, 'x', T + 15 * DAY).reason, 'closed');
  const n = mk('need', 'charger', 'lib', 'charger', M, 0);
  eq(H.addClaim(n, A, 'on my way', T).reason, 'not-nearby');
});
ev('C2', 'Only the author can approve; approval claims the post and declines others', () => {
  const f = mk('found', 'umbrella', 'lhc', 'black umbrella', M, 0);
  H.addClaim(f, A, 'wooden handle', T); H.addClaim(f, R, 'black', T);
  eq(H.decideClaim(f, f.claims[0].id, A, true, T).reason, 'not-author');
  eq(H.decideClaim(f, f.claims[0].id, M, true, T).ok, true);
  eq(f.status, 'claimed'); eq(f.claims[1].status, 'declined');
});
ev('C3', 'Contact is shown only to author and approved claimer, only after approval', () => {
  const f = mk('found', 'umbrella', 'lhc', 'black umbrella', M, 0);
  H.addClaim(f, A, 'wooden handle', T);
  eq(H.contactFor(f, M, USERS), null, 'before approval');
  H.decideClaim(f, f.claims[0].id, M, true, T);
  eq(H.contactFor(f, M, USERS), A.contact); eq(H.contactFor(f, A, USERS), M.contact);
  eq(H.contactFor(f, R, USERS), null, 'stranger');
});

/* Matching */
ev('M1', 'Umbrella taken by mistake and posted as Found: the owner lost post matches it', () => {
  const mistake = mk('found', 'umbrella', 'lhc', 'black umbrella, took by mistake', R, DAY, { nowAt: 'h5' });
  const lost = mk('lost', 'umbrella', 'lhc', 'black umbrella', A, 2 * HOUR);
  const m = H.suggestMatches(lost, [mistake, lost], T);
  eq(m.length, 1); eq(m[0].post.id, mistake.id);
});
ev('M2', 'Different category, same side (both found or both lost), or same author never match', () => {
  const lost = mk('lost', 'umbrella', 'lhc', 'black umbrella', A, 0);
  eq(H.matchScore(lost, mk('found', 'charger', 'lhc', 'charger', R, 0), T), 0, 'category');
  eq(H.matchScore(lost, mk('lost', 'umbrella', 'lhc', 'another', R, 0), T), 0, 'same side');
  eq(H.matchScore(lost, mk('found', 'umbrella', 'lhc', 'mine', A, 0), T), 0, 'same author');
});
ev('M3', 'Same zone but 10 days apart stays below the threshold', () => {
  const lost = mk('lost', 'watch', 'gym', 'silver watch', A, 10 * DAY);
  const found = mk('found', 'watch', 'sac', 'silver watch', R, 0);
  eq(H.suggestMatches(lost, [lost, found], T).length, 0);
});
ev('M4', 'Holder moved to CC matches lost post at LHC', () => {
  const lost = mk('lost', 'device', 'lhc', 'iPad Air', A, 2 * DAY);
  const found = mk('found', 'device', 'lhc', 'iPad blue case', R, 2 * DAY - 3 * HOUR, { verifyQ: 'Lock screen?', nowAt: 'cc' });
  eq(H.suggestMatches(lost, [lost, found], T).length, 1);
});

/* Filters and validation */
ev('F1', 'Filters by type, category, zone and recency', () => {
  const ps = [mk('lost', 'watch', 'gym', 'watch', M, HOUR), mk('found', 'watch', 'h5', 'watch', R, 5 * DAY), mk('found', 'charger', 'lhc', 'charger', R, HOUR)];
  eq(H.filterLF(ps, A, T, { type: 'found' }).length, 2);
  eq(H.filterLF(ps, A, T, { category: 'watch' }).length, 2);
  eq(H.filterLF(ps, A, T, { loc: 'zone:hostels' }).length, 1);
  eq(H.filterLF(ps, A, T, { maxAgeDays: 1 }).length, 2);
});
ev('F2', 'Rejects short descriptions and unknown places', () => {
  eq(H.makePost({ type: 'lost', category: 'watch', loc: 'gym', desc: 'ab' }, A, T, 1).reason, 'desc-short');
  eq(H.makePost({ type: 'lost', category: 'watch', loc: 'nowhere', desc: 'silver watch' }, A, T, 1).reason, 'bad-location');
});
ev('F3', 'Location list uses real IITB names and skips Hostel 17', () => {
  eq(!!H.locById('lhc'), true); eq(!!H.locById('h16'), true); eq(!!H.locById('h18'), true);
  eq(!!H.locById('h17'), false); eq(!!H.locById('tansa'), true);
});

console.log('\nCampusPing evals\n');
rows.forEach(r => console.log(r[2].startsWith('PASS') ? 'PASS' : 'FAIL', r[0].padEnd(3), r[1], r[2].startsWith('FAIL') ? '\n     ' + r[2] : ''));
console.log(`\n${pass}/${n} passed`);
process.exit(pass === n ? 0 : 1);