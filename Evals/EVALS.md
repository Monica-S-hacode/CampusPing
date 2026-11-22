# CampusPing evals

## A. Automated rule evals: 22 of 22 pass

Run: `node evals.test.js` (needs `logic.js` in the same folder; this is the same rules module the app runs).

| ID | What it checks |
|---|---|
| V1 | Need-now is visible to a student in the same place |
| V2 | Need-now is hidden from a student in another place, and the hidden count is correct |
| V3 | The author still sees their own need-now after moving away |
| V4 | Lost and found posts are campus-wide |
| X1 | Need-now is open at 29 min and gone at 30 min |
| X2 | Need-now timers honour 15 and 60 min, and any other value falls back to 30 |
| X3 | Lost and found posts expire after 14 days |
| X4 | Closed and claimed posts leave the feeds |
| P1 | Found ID and phone details are masked for others and visible to the author |
| P2 | Search cannot leak masked details |
| P3 | A found ID or phone without a verification question is rejected |
| P4 | A claim on a found ID or phone needs an answer |
| C1 | No claiming your own post, no duplicates, no claims on expired posts, no need-now responses from another place |
| C2 | Only the author can accept. Accepting marks the post claimed and declines other pending responses |
| C3 | Contact is shown only to the poster and the accepted responder, and only after acceptance |
| M1 | Umbrella taken by mistake and posted as Found: the owner's lost post is matched to it |
| M2 | Different category, same side (both found or both lost) or same author never match |
| M3 | Same zone but 10 days apart stays below the match threshold |
| M4 | An item picked up at LHC and now at CC still matches the owner's lost post at LHC |
| F1 | Filters work by type, category, zone and recency |
| F2 | Rejects short descriptions and unknown places |
| F3 | Location list uses real IITB names and skips Hostel 17 |

## B. Manual walkthrough on the live page

| ID | Steps | Expected |
|---|---|---|
| U1 | Open the page as Monica at LHC | Need-now tab shows 2 requests, plus a note that 3 more are hidden elsewhere |
| U2 | Change "I am at" to Central Library | A different request list appears; the LHC ones disappear |
| U3 | Tap "Skip 30 min" | All need-now requests drop off; lost and found items remain |
| U4 | Mine tab as Monica | The lost earbuds case shows a possible match from the shuttle |
| U4b | Lost & found tab, filter "Found" | Rohan's umbrella card (picked up by mistake) shows "Picked up at LHC, now at Hostel 5" |
| U5 | View as Meera, open Mine | The lost iPad (matched to the iPad moved to CC) and the lost umbrella (matched to the umbrella Rohan took by mistake) each show a possible match |
| U6 | As Monica in Lost & found, search "R. Iyer" | The found ID is not returned |
| U7 | As Monica, tap "This is mine" on the ID card and send with an empty answer | The form blocks sending |
| U8 | Monica taps "I can help" on Meera's charger request at LHC, then switch to Meera and Accept | Both see contact details; Rohan does not |
| U9 | Post a found phone without a verification question | Rejected with a message |
| U10 | Post "I found something" with "Item is now at" set to another building | The card shows the pickup place and the current place |

## Limits

- The automated evals cover the rules, not the screen. The walkthrough covers the screen and was checked by hand.
- Seed students and items are examples. Login is simulated; production would use IITB SSO.
