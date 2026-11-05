# Diverted Supplier Payment Playbook

## Goal and framing
- Answer three questions: who orchestrated the diversion, how the receiving bank details were changed, and which two records together prove it.
- Treat every hint, email, chat, and note as a claim to verify against records. Expect decoys; usually only one payment reaches a wrong account.
- The orchestrator may be an outsider or an insider. Let the records decide.

## Opening sequence
- Start from money, not people. List payment executions and their receiving accounts first.
- For each supplier, find an independently published, dated schedule of genuine bank details. Its domain may look unrelated to the supplier and still be genuine.
- Compare each execution's account to the genuine account valid on its date. A mismatch marks the diversion; a match clears a payment even if other things look odd.

## Clocks and timing
- Payments, authentication, changes, chat, and supplier mail may each log in a different zone. Note every offset and convert to one zone before comparing.
- A change belongs to a session only if its converted time falls between sign-in and sign-in plus the stated session lifetime.
- Rebuild the order: request or prompt, then approval or sign-in, then change, then payment.

## Linking the chain
- From the diverted payment, open the invoice and the supplier master record it used.
- Find the change that set the wrong account before payment. Note author, converted time, session, and any cited request. No cited request is itself a signal.
- If a request is cited, open it at once: did it supply exactly the wrong account, from what sender domain, and was it reported to IT?
- Open the session: owner, device, location, cloud versus usual machine, and the challenge that admitted it. Did the user start that sign-in or merely approve an unrequested prompt?
- Search chat or helpdesk near any approval time. A remark about an unexpected prompt strongly corroborates takeover.
- For ownership, run an account check on the wrong account, then follow a company holder to its registry directors. Holder names may mimic the supplier; similarity proves nothing.
- For an insider match, demand exact full name plus full home address down to unit. Same surname, street, or building alone is a typical decoy.

## Telling the change methods apart
- Supplier impersonation: an outside request supplied exactly the wrong account, was cited on the change, and staff applied it from their usual trusted session. The author is a victim.
- Insider: the author used their own usual session, no genuine request exists, and the beneficiary or its director matches them by full identity. A supplier-like beneficiary company is a common insider shield.
- Account takeover or approval fatigue: an unsolicited approval, sometimes after denials, opened an unusual device, location, or cloud session that made the exact change. The session owner is a victim; the outsider is the orchestrator.
- A session under a staff name does not by itself mean insider. Check authentication, what the change was based on, and who the money reaches.

## Recognising benign decoys
- Requests reported to IT did not lead to the change. Blocked unknown sign-ins changed nothing. Successful approvals user-initiated on the usual machine are routine.
- Staff links to outside companies matter only if those companies receive company payments. Changes matching the published dated schedule are legitimate.
- Decoys usually come as a set: reported requests, blocked sign-ins, routine approvals, unrelated affiliations. Recognise the pattern and clear each with one look.

## Choosing the two evidence items by method
- Impersonation: the external request carrying the wrong account, plus the change record citing it and setting that account. Proven sufficient repeatedly.
- Insider: the change record or session showing who set the account, plus the registry or ownership record tying the holder or its director to them by full identity. Proven sufficient repeatedly, including when the beneficiary is a company and only its director matches.
- Takeover or approval fatigue: the anomalous challenge or approval that opened the session, plus the change made inside it. Proven sufficient many times; keep chat as reserve corroboration, not a filed item.
- Never file the payment alone or a decoy alert. Both items must point to the same change and the same who and how.

## Budget management
- Full solves have taken roughly thirty to sixty commands: takeover in the low thirties, insider in the high thirties, impersonation in the mid to high forties. Plan for about fifty and keep a reserve.
- Spend the first quarter on payments versus published schedules; stop scanning once one mismatch is confirmed and the rest match.
- Spend the middle on change, cited request, session, challenge, nearby chat, and ownership, converting times as you go.
- Cited request on a usual session: verify sender and exact account, confirm the session is routine, then file; skip ownership hunts unless an insider hint appears. Trim decoy checks here first.
- Cloud or unusual session with no cited request: go straight to its challenge and nearby chat; once the unsolicited approval, session window, and exact change line up, file without an ownership hunt.
- Own usual session with no cited request: go straight to the account check, then the registry director, then compare full name and address with staff records. Once both match exactly, file; do not re-audit cleared decoys.
- Open a decoy only if it plausibly connects to the diverted change or session. If a lookup returns nothing, pivot instead of repeating similar queries. Reserve a few commands to rule out competing methods and to file.

## Final check before filing
- Wrong account confirmed against an independent, date-appropriate source; times converted; change precedes payment, sets exactly that account, and falls inside the session lifetime.
- Any cited request or approval checked for authenticity and initiation; any insider link matched on full name and full address including unit.
- Who, how, and both evidence items tell one consistent story.
