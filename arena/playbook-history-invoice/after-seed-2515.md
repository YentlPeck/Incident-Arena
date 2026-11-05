# Diverted Supplier Payment Playbook

## Goal and framing
- Answer three questions: who orchestrated the diversion, how the receiving bank details were changed, and which two records together prove it.
- Treat every story hint, email, chat, and note as a claim to verify against records, not as fact.
- Expect decoys. Usually only one chain ends in money reaching a wrong account.
- The orchestrator may be an outsider or an insider. Let the records decide, and do not force a staff match when they point outside.

## Opening sequence
- Start from money, not people. List payment executions and their receiving accounts first.
- For each supplier, find an independently published, dated schedule of its genuine bank details. Its domain may look unrelated to the supplier name and still be genuine.
- Compare each execution's receiving account to the genuine account valid on that date. A mismatch marks the diverted payment. A match clears a payment even if other things look odd.

## Clocks and timing
- Each system may log in its own zone. Payments, sign-ins, changes, chat, and supplier mail can all differ, and mail is often offset from everything else. Find every offset first and convert to one zone.
- A change belongs to a session only if its converted time falls between sign-in and sign-in plus the stated session lifetime.
- Rebuild the order: request or prompt, then approval or sign-in, then change, then payment.

## Linking the chain
- From the diverted payment, open the invoice and the supplier master record it used.
- Find the change record that set the wrong account before the payment ran. Note author, converted time, session, and any cited request.
- If the change cites a request, open it at once. Check whether it supplied exactly the wrong account and who really sent it. No cited request is itself a signal.
- Open the session. Check owner, device, location, session type such as cloud versus usual machine, and the challenge that admitted it.
- Ask whether the user started that sign-in or merely approved a prompt they did not request.
- Search chat or helpdesk messages near the approval time. A user remarking on an unexpected prompt strongly corroborates takeover.
- Run an ownership lookup on the wrong account. The holder is often a company, so follow it in the registry to its directors or owners and compare them to staff. Holder names may mimic the supplier; similarity proves nothing.
- For an insider match, demand exact full name plus full home address down to unit. Same surname, street, or building alone is a typical decoy.

## Telling the change methods apart
- Supplier impersonation: a lookalike or spoofed outside request supplied the wrong account, and staff applied it from their own trusted session. The author is a victim; the orchestrator is the impersonator.
- Insider: author owns the session on the usual device, no genuine request exists, and the beneficiary or its director links to them by full identity.
- Account takeover or approval fatigue: an unsolicited or fatigue-induced approval, often after denials, opened a session from an unusual device, location, or cloud context. The session owner is a victim; the orchestrator is the outsider behind it.
- A session under a staff name does not by itself mean insider. Check how it was authenticated and what the change was based on.
- Before accepting a method, rule out the others with one record each if budget allows.

## Recognising benign decoys
- Requests reported to IT did not lead to the change; only an unreported request cited on the change matters.
- Blocked unknown sign-ins changed nothing, and approvals that were user-initiated on the usual machine are routine.
- Staff links to outside companies matter only if those companies receive company payments.
- Account changes matching the supplier's published dated schedule are legitimate.

## Choosing the two evidence items by method
- Impersonation: the external request carrying the wrong account, plus the change record citing it and setting that account.
- Insider: the change record or session showing who set the account, plus the registry or ownership record tying the account to them by full identity.
- Takeover or approval fatigue: the anomalous challenge or approval record that opened the session, plus the change made inside it. Keep corroborating chat in reserve.
- Never file the payment alone or a decoy alert. Both items must point to the same change and the same who and how.

## Budget management
- Full solves with every discovery have taken roughly forty to sixty commands. A direct insider chain can finish near forty; plan for about fifty-five and keep a reserve.
- Spend the first quarter on payments versus published schedules to locate the diversion.
- Spend the middle on change, cited request, session, its challenge, nearby chat, ownership lookup, and registry, converting times as you go.
- Open a decoy alert only if it plausibly connects to the diverted change or session. If a lookup returns nothing, pivot instead of repeating similar queries.
- Reserve the last few commands to rule out competing methods and to file.

## Final check before filing
- Wrong account confirmed against an independent, date-appropriate source; times converted; change precedes payment, sets exactly that account, and falls inside the session lifetime.
- Any cited request or approval checked for authenticity and whether the user truly initiated it; any insider link matched on full name and full address.
- Who, how, and both evidence items tell one consistent story.
