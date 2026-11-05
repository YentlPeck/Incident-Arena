# Diverted Supplier Payment Playbook

## Goal and framing
- Answer three questions: who orchestrated the diversion, how the receiving bank details were changed, and which two records together prove it.
- Treat every story hint, email, chat, and note as a claim to verify against records, not as fact.
- Expect decoys: several suspicious-looking events that turn out benign. Usually only one chain ends in money leaving to a wrong account.

## Opening sequence (cheap, high yield)
- Start from money, not from people. List payment executions and their receiving accounts first.
- For each supplier, find an independently published source of its genuine bank details, ideally a dated schedule. Judge the source by independence and dating, not by whether its domain resembles the supplier name.
- Compare each execution's receiving account to the genuine account valid on that date. A mismatch marks the diverted payment; a match clears it even if other things look odd.
- Confirm the diverted payment is the only one before going deeper, unless the budget is tight.

## Clocks and timing
- Different systems may log in different time zones, such as payments and sign-ins in one, supplier changes and chat in another, and supplier mail in a third. Find each source's offset first.
- Convert every timestamp to one zone before ordering events. Unconverted times can make a change appear outside its session or after the payment.
- Check the stated session lifetime: a change belongs to a session only if its converted time falls between sign-in and sign-in plus that lifetime.
- Rebuild the order: any request message, then sign-in, then change, then payment.

## Linking the chain
- From the diverted payment, open the invoice it settled and the supplier master record it used.
- Find the change record that set the receiving account before the payment ran. Note author, converted time, and session.
- Open that session. Check whether it belongs to the change author, uses their usual device and location, and whether unusual prompts or approvals preceded it.
- Run an account ownership or bank-check lookup on the wrong account to find the holder entity. Holder names may mimic the supplier's name; similarity proves nothing.
- Open the registry entry for that holder and compare its directors or owners to staff and to the change author.
- Demand a strong identity match: exact full name plus full home address down to unit or flat. Same surname, same street, or same building without the unit are typical decoys.

## Telling the change methods apart
- Insider using their own session: author owns the session, usual device, no prior suspicious prompts, and the beneficiary links back to them.
- Account takeover: session from an unfamiliar device or location, often after phishing or a burst of prompts. The owner is a victim; follow the beneficiary link for the orchestrator.
- Supplier impersonation: a bank change request came from a lookalike or spoofed sender and staff applied it in good faith. Compare sender domain to the genuine one.
- Approval fatigue: a prompt approved soon after many denials, or from an odd place. Distinguish from routine user-initiated approvals on the usual machine.
- Before accepting a method, rule out the others with one record each if budget allows.

## Recognising benign decoys
- Suspicious emails the recipient reported to IT did not lead to the change.
- Unknown sign-ins that were blocked never produced a session that changed anything.
- Successful approvals that were user-initiated on the usual device are routine.
- Staff linked to outside companies are irrelevant unless those companies receive company payments.
- Account changes matching the supplier's published dated schedule are legitimate.

## Choosing the two evidence items
- One record proving mechanism: the change record or session that set the wrong account, showing who and how.
- One record proving beneficiary link: the registry or ownership record tying the wrong account to the orchestrator with a full identity match.
- Avoid filing the payment alone or a decoy alert; they show money moved, not who or how.
- Make sure both items point to the same person and the same change.

## Budget management
- Full solves with all discoveries have fit within roughly forty to forty-five commands; plan around forty.
- Spend the first quarter on payments versus published schedules to locate the diversion.
- Spend the middle on change record, session, ownership lookup, and registry entry, converting times as you go.
- Reserve the last few commands to rule out competing methods and to file.
- Open a decoy alert only if it plausibly connects to the diverted change or session. If a lookup returns nothing, pivot instead of repeating similar queries.

## Final check before filing
- Wrong account confirmed against an independent, date-appropriate source.
- All times converted to one zone; change precedes payment and set exactly that account.
- Change falls inside the session's lifetime; ownership and device fit the chosen method.
- Beneficiary identity match is exact on name and full address.
- Both evidence items support the same who and the same how.
