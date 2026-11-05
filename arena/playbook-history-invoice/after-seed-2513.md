# Diverted Supplier Payment Playbook

## Goal and framing
- Answer three questions: who orchestrated the diversion, how the receiving bank details were changed, and which two records together prove it.
- Treat every story hint, email, chat, and note as a claim to verify against records, not as fact.
- Expect decoys: several suspicious events that turn out benign. Usually only one chain ends in money reaching a wrong account.
- The orchestrator may be an outsider with no staff identity. Do not force a staff match when the records point outside.

## Opening sequence
- Start from money, not people. List payment executions and their receiving accounts first.
- For each supplier, find an independently published, dated schedule of its genuine bank details. Judge the source by independence and dating. Its domain may look unrelated to the supplier name and still be genuine.
- Compare each execution's receiving account to the genuine account valid on that date. A mismatch marks the diverted payment. A match clears a payment even if other things look odd.
- Confirm the diverted payment is the only one before going deeper, unless the budget is tight.

## Clocks and timing
- Systems may log in different time zones, for example payments and sign-ins in one, changes and chat in another, and supplier mail in a third. Find each offset first and convert everything to one zone.
- A change belongs to a session only if its converted time falls between sign-in and sign-in plus the stated session lifetime.
- Rebuild the order: request message, then sign-in, then change, then payment.

## Linking the chain
- From the diverted payment, open the invoice it settled and the supplier master record it used.
- Find the change record that set the wrong account before the payment ran. Note author, converted time, session, and any cited request or ticket reference.
- If the change cites a request, open it at once. Check whether it supplied exactly the wrong account and who really sent it. This is often the fastest route to the method.
- Open the session. Check whether it belongs to the change author, uses their usual device and location, and whether unusual prompts preceded it.
- Run an ownership or bank-check lookup on the wrong account, then open the holder's registry entry and compare directors or owners to staff. Holder names may mimic the supplier; similarity proves nothing.
- For an insider match, demand exact full name plus full home address down to unit or flat. Same surname, street, or building without the unit are typical decoys.

## Telling the change methods apart
- Supplier impersonation: an outside request from a lookalike or spoofed sender supplied the wrong account, and staff applied it in good faith from their own trusted session. The change author is a victim, and the orchestrator is the outside impersonator.
- Insider: author owns the session on the usual device, no request or a fabricated one, and the beneficiary links back to them by full identity.
- Account takeover: session from an unfamiliar device or location, often after phishing or a burst of prompts. The session owner is a victim; follow the beneficiary for the orchestrator.
- Approval fatigue: a prompt approved soon after many denials or from an odd place, unlike routine user-initiated approvals on the usual machine.
- A trusted usual-device session does not by itself mean insider. Check what the change was based on.
- Before accepting a method, rule out the others with one record each if budget allows.

## Recognising benign decoys
- Requests the recipient reported to IT did not lead to the change; only an unreported request cited on the change matters.
- Unknown sign-ins that were blocked never produced a session that changed anything.
- Successful approvals that were user-initiated on the usual device are routine.
- Staff linked to outside companies are irrelevant unless those companies receive company payments.
- Account changes matching the supplier's published dated schedule are legitimate.

## Choosing the two evidence items by method
- Impersonation: the external request carrying the wrong account, plus the change record that cites it and sets that account.
- Insider: the change record or session showing who set the account, plus the registry or ownership record tying the account to them with a full identity match.
- Takeover or approval fatigue: the anomalous session or approval record, plus the change made inside that session.
- Avoid filing the payment alone or a decoy alert; they show money moved, not who or how.
- Make sure both items point to the same change and support the same who and how.

## Budget management
- Full solves with every discovery have taken between forty and sixty commands; plan for about fifty and keep a reserve.
- Spend the first quarter on payments versus published schedules to locate the diversion.
- Spend the middle on change record, cited request, session, ownership lookup, and registry, converting times as you go.
- Open a decoy alert only if it plausibly connects to the diverted change or session. If a lookup returns nothing, pivot instead of repeating similar queries.
- Reserve the last few commands to rule out competing methods and to file.

## Final check before filing
- Wrong account confirmed against an independent, date-appropriate source.
- Times converted to one zone; change precedes payment, sets exactly that account, and falls inside the session lifetime.
- Any cited request was checked for sender authenticity and exact account match.
- Who, how, and both evidence items tell one consistent story.
