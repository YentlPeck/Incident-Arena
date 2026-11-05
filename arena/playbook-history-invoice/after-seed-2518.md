# Diverted Supplier Payment Playbook

## Goal and framing
- Answer three questions: who orchestrated the diversion, how the receiving bank details were changed, and which two records together prove it.
- Treat every story hint, email, chat, and note as a claim to verify against records.
- Expect decoys. Usually only one payment reaches a wrong account.
- The orchestrator may be an outsider or an insider. Let the records decide.

## Opening sequence
- Start from money, not people. List payment executions and their receiving accounts first.
- For each supplier, find an independently published, dated schedule of genuine bank details. Its domain may look unrelated to the supplier and still be genuine.
- Compare each execution's account to the genuine account valid on its date. A mismatch marks the diversion. A match clears a payment even if other things look odd.

## Clocks and timing
- Payments, authentication, supplier changes, chat, and supplier mail may each log in a different zone. Note every offset first and convert to one zone.
- A change belongs to a session only if its converted time falls between sign-in and sign-in plus the stated session lifetime.
- Rebuild the order: request or prompt, then approval or sign-in, then change, then payment.

## Linking the chain
- From the diverted payment, open the invoice and the supplier master record it used.
- Find the change that set the wrong account before payment. Note author, converted time, session, and any cited request.
- If the change cites a request, open it at once: did it supply exactly the wrong account, and who really sent it? No cited request is itself a signal.
- Open the session: owner, device, location, type such as cloud versus usual machine, and the challenge that admitted it. Ask whether the user started that sign-in or merely approved an unrequested prompt.
- Search chat or helpdesk near the approval time. A remark about an unexpected prompt strongly corroborates takeover.
- Run an ownership lookup on the wrong account. Follow a company holder in the registry to its directors or owners. Holder names may mimic the supplier; similarity proves nothing.
- For an insider match, demand exact full name plus full home address down to unit. Same surname, street, or building alone is a typical decoy.

## Telling the change methods apart
- Supplier impersonation: a lookalike or spoofed outside request supplied the wrong account and staff applied it from their own trusted session. The author is a victim.
- Insider: the author owns the session on the usual device, no genuine request exists, and the beneficiary or its director matches them by full identity. A mimicking beneficiary company is a common insider shield.
- Account takeover or approval fatigue: an unsolicited approval, sometimes after denials, opened a session from an unusual device, location, or cloud context that made the exact change. The session owner is a victim; the outsider is the orchestrator.
- A session under a staff name does not by itself mean insider. Check authentication and what the change was based on.
- Before accepting a method, rule out the others with one record each if budget allows.

## Recognising benign decoys
- Requests reported to IT did not lead to the change. Only an unreported request cited on the change matters.
- Blocked unknown sign-ins changed nothing. Successful approvals user-initiated on the usual machine are routine.
- Staff links to outside companies matter only if those companies receive company payments.
- Account changes matching the supplier's published dated schedule are legitimate.

## Choosing the two evidence items by method
- Impersonation: the external request carrying the wrong account, plus the change record citing it and setting that account.
- Insider: the change record or session showing who set the account, plus the registry or ownership record tying the holder or its director to them by full identity. This pairing has proven sufficient.
- Takeover or approval fatigue: the anomalous challenge or approval that opened the session, plus the change made inside it. This pairing has proven sufficient more than once; keep chat in reserve as corroboration.
- Never file the payment alone or a decoy alert. Both items must point to the same change and the same who and how.

## Budget management
- Full solves with every discovery have taken roughly forty to sixty commands; direct takeover chains have finished in the low forties. Plan for about fifty-five and keep a reserve.
- Spend the first quarter on payments versus published schedules to locate the diversion.
- Spend the middle on change, cited request, session, challenge, nearby chat, and ownership and registry, converting times as you go.
- Cloud or unusual session with no cited request: go straight to its challenge and nearby chat before any ownership hunt.
- Own usual session with no cited request: go straight to account ownership, then the registry director, then compare full address with staff records.
- Open a decoy alert only if it plausibly connects to the diverted change or session. If a lookup returns nothing, pivot instead of repeating similar queries.
- Reserve the last few commands to rule out competing methods and to file.

## Final check before filing
- Wrong account confirmed against an independent, date-appropriate source; every system's times converted; change precedes payment, sets exactly that account, and falls inside the session lifetime.
- Any cited request or approval checked for authenticity and initiation; any insider link matched on full name and full address including unit.
- Who, how, and both evidence items tell one consistent story.
