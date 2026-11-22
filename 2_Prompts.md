# Prompts used to create CampusPing

The tool was built with Claude (claude.ai), in a short conversation. Below is the consolidated build prompt, then my actual prompts in order.

## A. Consolidated build prompt

> Build a single-page app for IIT Bombay students called CampusPing. Problem: on a large campus, someone who needs an item from a stranger, or who has found, lost or accidentally taken a physical item, has no channel that reaches people near that place right now. WhatsApp groups reach people by social circle, so most relevant people never see the message.
>
> One data model: a post = type (need now / lost / found) + category + IITB location + time + status. Scope:
> - Need-now posts are visible only to students whose current location matches, and expire in 15/30/60 min.
> - Lost and Found posts are campus-wide, filterable by type, category, place/zone, recency and text, and expire after 14 days. Found posts (including things picked up by mistake) record where the item was picked up and where it is now (e.g. LHC, now at CC).
> - A Lost post is matched to Found posts by category, location proximity (pickup or current spot) and time window, in both directions, so people who took something by mistake can return it.
> - Found IDs and phones show no details to others. The claimer must answer a question set by the finder.
> - Claim flow: respond, the poster accepts or declines, and only then are contact details shown to those two people.
> - Out of scope: marketplace, payments, chat, feed, GPS, ID photos, ratings.
>
> Use real IITB places (LHC, Central Library, CC, Main Building, department blocks, hostels 1-16 and 18, Tansa, SAC, Gymkhana, IIT Market, shuttle). Seed example data and add demo controls (switch student, set location, skip 30 min, reset) so every rule can be tested. Keep the core rules in a pure module and test them in Node.

## B. My prompts, in order (quoted from the chat)

1. Shared the problem statement(social circle vs physical proximity + time), and notes from friends:
   > need help with items idea: 1) critical situation, sick and in LHC, end of lecture, phone was about dead, iPhone charger was common, didn't know who to ask, wanted to just ask and use for 10 min, had to call friends or other people, their friend had to take an effort from hostel to LHC 2) umbrella was wanted for a short time, could've returned it later, urgently needed to get to a place
   > lost and found idea: 1) lost an ipad, in the lhc, maybe it could've been in the lost and found box, but couldn't verify, no proper procedure - no coordinated system, it was moved to another building (cc, another shelf), had to check from other places too 2) lost an umbrella, never found it 3) took umbrella by mistake, couldn't have returned (didn't know how that person could be contacted, different groups, not familiar - didn't have a common group for that course) 4) put message on hostel or common groups, but got buried under messages, not everyone is in the lost and found groups. there were many similar incidents to this, involving chargers, watches, earbuds etc... also ids cards
2. > yes rename and add the took by mistake cases too, it helps people who want to return it too (also remember to add any lines about why current groups and lost and found system doesnt work)
3. Shared my edited app, evals and final brief and asked for a check against every condition in the assignment.

