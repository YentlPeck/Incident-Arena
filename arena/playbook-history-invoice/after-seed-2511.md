# Diverted Supplier Payment Playbook

## Goal and framing
- Answer three questions: who orchestrated the diversion, how the receiving bank details were changed, and which two records together prove it.
- Treat every story hint, email, and note as a claim to verify against records, not as fact.
- Expect decoys: several suspicious-looking events that turn out benign. Only one chain usually ends in money leaving to a wrong account.

## Opening sequence (cheap, high yield)
- Start from money, not from people. List payment executions and their receiving accounts first.
- For each supplier, find an independently published source of its genuine bank details, such as the supplier's own site or a dated schedule. Prefer dated schedules, because suppliers can legitimately change accounts over time.
- Compare each execution's receiving account to the genuine account valid on that date. A mismatch marks the diverted payment. A match clears that payment even if other things about it look odd.
- Once one diverted payment is found, confirm it is the only one before going deeper, unless the budget is tight.

## Linking the chain
- From the diverted payment, open the invoice it settled and the supplier master record it used.
- Find the change record that set or edited the receiving account before the payment ran. Note who made it, when, and from which session.
- Open that session. Check whether it belongs to the change author, whether the device and location are their usual ones, and whether the sign-in was preceded by unusual prompts or approvals.
- Run an account ownership or bank-check lookup on the wrong receiving account to find the holder entity.
- Open the company registry entry for that holder. Compare its directors or owners to staff and to anyone involved in the change.
- Demand a strong identity match: exact full name plus full home address down to unit or flat. Partial matches such as same surname, same street, or same building without the unit are typical decoys.

## Telling the change methods apart
- Insider using their own session: the change author owns the session, sign-in is from their usual device, no prior suspicious prompts, and the beneficiary entity links back to them. The orchestrator is that insider.
- Account takeover: the session was opened from an unfamiliar device or location, often after a phishing message or a burst of approval prompts. The account owner is a victim; look at the beneficiary link for the real orchestrator.
- Supplier impersonation: a bank change request arrived from a lookalike or spoofed sender, and staff applied it in good faith. Check the sender domain against the supplier's genuine domain.
- Approval fatigue: a prompt was approved shortly after many denied ones, or from an odd place. Distinguish from routine approvals the user started themselves on their usual machine.
- Before accepting a method, rule out the others with one record each, if budget allows.

## Recognising benign decoys
- Suspicious emails that the recipient reported to IT did not lead to the change.
- Unknown sign-ins that were blocked never produced a session that changed anything.
- Successful approvals that were user-initiated on the usual device are routine.
- Staff linked to outside companies are irrelevant unless those companies actually receive company payments.
- Account changes that match the supplier's published dated schedule are legitimate.

## Choosing the two evidence items
- Pick one record that proves the mechanism: the change record or session that set the wrong account, showing who did it and how.
- Pick one record that proves the motive or beneficiary link: the registry or ownership record tying the wrong account to the orchestrator with a full identity match.
- Avoid filing the payment alone or a decoy alert; they show that money moved, not who caused it or how.
- Make sure the two items point to the same person and the same change; mismatched pairs read as weak.

## Budget management
- A full solve with all discoveries has fit within roughly forty-five commands; plan around that order.
- Spend the first quarter on payments versus published schedules to locate the diversion.
- Spend the middle on the change record, its session, ownership lookup, and registry entry.
- Reserve the last few commands to rule out competing methods and to file.
- Do not exhaustively read every decoy alert; open one only if it plausibly connects to the diverted payment's change or session.
- If a lookup returns nothing useful, pivot to the next link in the chain rather than repeating similar queries.

## Final check before filing
- Wrong account confirmed against an independent, date-appropriate source.
- Change record precedes the payment and set exactly that account.
- Session ownership and device pattern match the chosen method.
- Beneficiary identity match is exact on name and full address.
- Both evidence items support the same who and the same how.
