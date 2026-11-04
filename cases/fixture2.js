/* Standalone generated CASE2 fixture, seed 7. Load directly or require this file. */
(function (root) {
  'use strict';
  const C = {
  "family": "invoice",
  "seed": 7,
  "title": "Case #7",
  "name": "The fake invoice",
  "date": "Tuesday 27 January",
  "dateISO": "2026-01-27",
  "intro": "<p>A supplier says an invoice is still unpaid, but Finance recorded an executed payment. You have access to Pixelforge mail, chat, Finance, Security and supplier records.</p><p>Investigate, flag the fraudulent payment and the bank-detail change, then file one report. Discoveries for who, how and evidence are awarded when the report is filed. Every click on the desktop counts.</p>",
  "goal": "<p>Trace the unpaid invoice, identify the executed payment and the supplier change that diverted it, then prove who orchestrated the diversion and how. A deceived employee is not the orchestrator.</p>",
  "milestones": [
    {
      "id": "payment",
      "name": "Fraudulent payment traced"
    },
    {
      "id": "change",
      "name": "Bank-detail change found"
    },
    {
      "id": "who",
      "name": "Right orchestrator"
    },
    {
      "id": "how",
      "name": "Right method"
    },
    {
      "id": "evidence",
      "name": "Right evidence"
    }
  ],
  "staff": [
    {
      "id": "leonie_vos",
      "name": "Leonie Vos",
      "role": "Animator",
      "dept": "Production",
      "email": "leonie.vos@pixelforge.studio",
      "user": "leonie.vos",
      "handle": "leonie_atelier",
      "pc": "PC-40"
    },
    {
      "id": "petra_bergman",
      "name": "Petra Bergman",
      "role": "IT administrator",
      "dept": "Production",
      "email": "petra.bergman@pixelforge.studio",
      "user": "petra.bergman",
      "handle": "petra_atelier",
      "pc": "PC-39"
    },
    {
      "id": "ada_verhoeven",
      "name": "Ada Verhoeven",
      "role": "Studio manager",
      "dept": "Production",
      "email": "ada.verhoeven@pixelforge.studio",
      "user": "ada.verhoeven",
      "handle": "ada_atelier",
      "pc": "PC-41"
    },
    {
      "id": "valentin_demir",
      "name": "Valentin Demir",
      "role": "Payroll accountant",
      "dept": "Finance",
      "email": "valentin.demir@pixelforge.studio",
      "user": "valentin.demir",
      "handle": "valentin_atelier",
      "pc": "PC-34"
    },
    {
      "id": "xenia_haddad",
      "name": "Xenia Haddad",
      "role": "Accounts payable",
      "dept": "Finance",
      "email": "xenia.haddad@pixelforge.studio",
      "user": "xenia.haddad",
      "handle": "xenia_atelier",
      "pc": "PC-32"
    },
    {
      "id": "katja_laurent",
      "name": "Katja Laurent",
      "role": "Audio designer",
      "dept": "Production",
      "email": "katja.laurent@pixelforge.studio",
      "user": "katja.laurent",
      "handle": "katja_atelier",
      "pc": "PC-38"
    },
    {
      "id": "timo_faure",
      "name": "Timo Faure",
      "role": "Producer",
      "dept": "Production",
      "email": "timo.faure@pixelforge.studio",
      "user": "timo.faure",
      "handle": "timo_atelier",
      "pc": "PC-36"
    },
    {
      "id": "jules_dumont",
      "name": "Jules Dumont",
      "role": "Finance assistant",
      "dept": "Finance",
      "email": "jules.dumont@pixelforge.studio",
      "user": "jules.dumont",
      "handle": "jules_atelier",
      "pc": "PC-35"
    },
    {
      "id": "yusuf_varga",
      "name": "Yusuf Varga",
      "role": "Finance lead",
      "dept": "Finance",
      "email": "yusuf.varga@pixelforge.studio",
      "user": "yusuf.varga",
      "handle": "yusuf_atelier",
      "pc": "PC-31"
    },
    {
      "id": "bram_aerts",
      "name": "Bram Aerts",
      "role": "Finance analyst",
      "dept": "Finance",
      "email": "bram.aerts@pixelforge.studio",
      "user": "bram.aerts",
      "handle": "bram_atelier",
      "pc": "PC-33"
    },
    {
      "id": "una_peeters",
      "name": "Una Peeters",
      "role": "Environment artist",
      "dept": "Production",
      "email": "una.peeters@pixelforge.studio",
      "user": "una.peeters",
      "handle": "una_atelier",
      "pc": "PC-37"
    }
  ],
  "emails": [
    {
      "id": "mail-5398876",
      "name": "A concerned colleague",
      "addr": "tip@quiet-post.eu",
      "to": "yusuf.varga@pixelforge.studio",
      "time": "Sun 25 Jan 2026 05:08",
      "subject": "A private suspicion",
      "body": "<p>I think Xenia Haddad arranged this. You should report them. This is an unverified accusation.</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-5714284",
      "name": "Sunday Brass Association SRL",
      "addr": "accounts@copperfinch.audio",
      "to": "yusuf.varga@pixelforge.studio",
      "time": "Sun 25 Jan 2026 04:58",
      "subject": "Still unpaid: INV-5094",
      "body": "<p>Invoice <b>INV-5094</b> is still unpaid. Could you trace the payment? Our payment details remain on <a href=\"https://copperfinch.audio/payment-details\">our website</a>.</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-8099013",
      "name": "Bank reconciliation",
      "addr": "operations@pixelforge.studio",
      "to": "yusuf.varga@pixelforge.studio",
      "time": "Sun 25 Jan 2026 02:18",
      "subject": "Separate reconciliation account",
      "body": "<p>Unrelated reconciliation ledger account: <b>FR20 7860 5197 7454 1674 0479 672</b>. This is not a supplier change instruction.</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-4225950",
      "name": "IT service desk",
      "addr": "it@pixelforge.studio",
      "to": "yusuf.varga@pixelforge.studio",
      "time": "Sun 25 Jan 2026 02:13",
      "subject": "Suspicious supplier requests",
      "body": "<p>Please report unexpected requests to change payment details. A familiar display name does not verify a sender.</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-9163424",
      "name": "Sunday Brass Association SRL",
      "addr": "accounts@copper-finch.audio",
      "to": "yusuf.varga@pixelforge.studio",
      "time": "Sat 24 Jan 2026 23:59",
      "subject": "Bank details update REQ-7986",
      "body": "<p>Supplier: SUP-2647566 / Sunday Brass Association SRL.</p><p>Reference <b>REQ-7986</b>. Please use the new IBAN <b>BE05 7539 6661 3551</b> for future payments.</p><p>https://copper-finch.audio/payment-details</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-1825319",
      "name": "River Loom Services Association",
      "addr": "accounts@blue-thistle.art",
      "to": "jules.dumont@pixelforge.studio",
      "time": "Sat 24 Jan 2026 23:47",
      "subject": "Bank details update REQ-5350",
      "body": "<p>Supplier: SUP-2195606 / River Loom Services Association.</p><p>Reference <b>REQ-5350</b>. Please use the new IBAN <b>BE05 7539 6661 3551</b> for future payments.</p><p>https://blue-thistle.art/payment-details</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-7844762",
      "name": "Sunday Brass Association SRL",
      "addr": "accounts@copper-finch.audio",
      "to": "xenia.haddad@pixelforge.studio",
      "time": "Sat 24 Jan 2026 23:39",
      "subject": "Bank details update REQ-6075",
      "body": "<p>Supplier: SUP-2647566 / Sunday Brass Association SRL.</p><p>Reference <b>REQ-6075</b>. Please use the new IBAN <b>DE43 2798 0478 9729 4859 08</b> for future payments.</p><p>https://copper-finch.audio/payment-details</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, jules.dumont@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-7667611",
      "name": "Westhaven Services BV",
      "addr": "accounts@silver-fern.audio",
      "to": "valentin.demir@pixelforge.studio",
      "time": "Sat 24 Jan 2026 23:13",
      "subject": "Bank details update REQ-8028",
      "body": "<p>Supplier: SUP-2727623 / Westhaven Services BV.</p><p>Reference <b>REQ-8028</b>. Please use the new IBAN <b>BE05 7539 6661 3551</b> for future payments.</p><p>https://silver-fern.audio/payment-details</p><p class=\"mail-copies\">Finance archive copies: xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-0662318",
      "name": "Westhaven Services BV",
      "addr": "accounts@silver-fern.audio",
      "to": "bram.aerts@pixelforge.studio",
      "time": "Sat 24 Jan 2026 23:08",
      "subject": "Bank details update REQ-6906",
      "body": "<p>Supplier: SUP-2727623 / Westhaven Services BV.</p><p>Reference <b>REQ-6906</b>. Please use the new IBAN <b>BE05 7539 6661 3551</b> for future payments.</p><p>https://silver-fern.audio/payment-details</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, yusuf.varga@pixelforge.studio.</p>"
    },
    {
      "id": "mail-0339131",
      "name": "Studio operations",
      "addr": "operations@pixelforge.studio",
      "to": "ada.verhoeven@pixelforge.studio",
      "time": "Wed 21 Jan 2026 09:02",
      "subject": "Office update 3",
      "body": "<p>Lunch orders close at eleven.</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-4325905",
      "name": "Studio operations",
      "addr": "operations@pixelforge.studio",
      "to": "petra.bergman@pixelforge.studio",
      "time": "Wed 21 Jan 2026 09:01",
      "subject": "Office update 2",
      "body": "<p>The review pack is ready for tomorrow.</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-6612314",
      "name": "Studio operations",
      "addr": "operations@pixelforge.studio",
      "to": "leonie.vos@pixelforge.studio",
      "time": "Wed 21 Jan 2026 09:00",
      "subject": "Office update 1",
      "body": "<p>The review pack is ready for tomorrow.</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-1329215",
      "name": "Studio operations",
      "addr": "operations@pixelforge.studio",
      "to": "yusuf.varga@pixelforge.studio",
      "time": "Wed 21 Jan 2026 08:00",
      "subject": "Quarter-end cover",
      "body": "<p>Finance has late cover this week. Trusted PCs and new browser sign-ins are listed separately.</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-6368786",
      "name": "River Loom Services Association",
      "addr": "accounts@bluethistle.art",
      "to": "jules.dumont@pixelforge.studio",
      "time": "Mon 19 Jan 2026 12:02",
      "subject": "Remittance details - Blue Thistle Assets",
      "body": "<p>Our genuine payment account: <b>DE53 0870 6979 4885 6434 27</b>. Payment details: https://bluethistle.art/payment-details</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, xenia.haddad@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-0574485",
      "name": "Westhaven Services BV",
      "addr": "accounts@silverfern.audio",
      "to": "xenia.haddad@pixelforge.studio",
      "time": "Mon 19 Jan 2026 12:01",
      "subject": "Remittance details - Silver Fern Foley",
      "body": "<p>Our genuine payment account: <b>FR34 1598 1900 9730 3864 6020 817</b>. Payment details: https://silverfern.audio/payment-details</p><p class=\"mail-copies\">Finance archive copies: valentin.demir@pixelforge.studio, jules.dumont@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    },
    {
      "id": "mail-8991416",
      "name": "Sunday Brass Association SRL",
      "addr": "accounts@copperfinch.audio",
      "to": "valentin.demir@pixelforge.studio",
      "time": "Mon 19 Jan 2026 12:00",
      "subject": "Remittance details - Copper Finch Audio",
      "body": "<p>Our genuine payment account: <b>DE73 3188 7585 5408 3959 85</b>. Payment details: https://copperfinch.audio/payment-details</p><p class=\"mail-copies\">Finance archive copies: xenia.haddad@pixelforge.studio, jules.dumont@pixelforge.studio, yusuf.varga@pixelforge.studio, bram.aerts@pixelforge.studio.</p>"
    }
  ],
  "mailTz": "Mail times: office time (UTC+1)",
  "chats": [
    {
      "id": "finance",
      "title": "#finance",
      "kind": "channel",
      "msgs": [
        [
          "Valentin Demir",
          "Sun 25 Jan 2026 00:16",
          "My phone kept buzzing with sign-in prompts. I tapped approve to make it stop. I did not initiate a sign-in; I was still at my desk."
        ],
        [
          "Xenia Haddad",
          "Sun 25 Jan 2026 00:16",
          "My phone kept buzzing with sign-in prompts. I tapped approve to make it stop. I did not initiate a sign-in; I was still at my desk."
        ],
        [
          "Jules Dumont",
          "Sun 25 Jan 2026 00:16",
          "My phone kept buzzing with sign-in prompts. I tapped approve to make it stop. I did not initiate a sign-in; I was still at my desk."
        ],
        [
          "Bram Aerts",
          "Sun 25 Jan 2026 00:16",
          "My phone kept buzzing with sign-in prompts. I tapped approve to make it stop. I did not initiate a sign-in; I was still at my desk."
        ],
        [
          "Yusuf Varga",
          "Sun 25 Jan 2026 00:16",
          "My phone kept buzzing with sign-in prompts. I tapped approve to make it stop. I did not initiate a sign-in; I was still at my desk."
        ]
      ]
    },
    {
      "id": "studio",
      "title": "#studio",
      "kind": "channel",
      "msgs": [
        [
          "Leonie Vos",
          "Wed 21 Jan 2026 09:00",
          "The audio preview sounds good."
        ],
        [
          "Petra Bergman",
          "Wed 21 Jan 2026 09:01",
          "I booked the small meeting room."
        ],
        [
          "Ada Verhoeven",
          "Wed 21 Jan 2026 09:02",
          "The review pack is ready for tomorrow."
        ],
        [
          "Valentin Demir",
          "Wed 21 Jan 2026 09:03",
          "I booked the small meeting room."
        ],
        [
          "Xenia Haddad",
          "Wed 21 Jan 2026 09:04",
          "The boiler repair wiped out my savings this month."
        ],
        [
          "Katja Laurent",
          "Wed 21 Jan 2026 09:05",
          "The boiler repair wiped out my savings this month."
        ],
        [
          "Timo Faure",
          "Wed 21 Jan 2026 09:06",
          "I am still paying off that dental bill."
        ],
        [
          "Jules Dumont",
          "Wed 21 Jan 2026 09:07",
          "I booked the small meeting room."
        ],
        [
          "Yusuf Varga",
          "Wed 21 Jan 2026 09:08",
          "Lunch orders close at eleven."
        ],
        [
          "Bram Aerts",
          "Wed 21 Jan 2026 09:09",
          "The boiler repair wiped out my savings this month."
        ],
        [
          "Una Peeters",
          "Wed 21 Jan 2026 09:10",
          "I am still paying off that dental bill."
        ]
      ]
    },
    {
      "id": "ops",
      "title": "IT / Finance clocks",
      "kind": "dm",
      "msgs": [
        [
          "IT service desk",
          "Tue 20 Jan 2026 15:00",
          "All systems and mail use office time, UTC+1. Check the date on every record."
        ],
        [
          "Yusuf Varga",
          "Sun 25 Jan 2026 00:38",
          "The REQ-5350 request was reported and the SUP-2727623 account is scheduled for independent verification. Verify the final account before paying."
        ]
      ]
    },
    {
      "id": "lunch",
      "title": "#lunch",
      "kind": "channel",
      "msgs": [
        [
          "Leonie Vos",
          "Wed 21 Jan 2026 11:00",
          "Soup or sandwiches today?"
        ]
      ]
    }
  ],
  "chatTz": "Times in office time (UTC+1)",
  "files": [
    {
      "id": "finance-guide",
      "name": "Finance record guide",
      "text": "<h3>Reading the audit trail</h3><p>Every change records the supplier ID, the account and the session used. Finance sessions expire exactly 120 minutes after a successful sign-in. A change must fall within that session. An existing trusted device is a normal sign-in on that staff member's assigned PC. A new browser sign-in lists the MFA challenge which created it.</p><p>Company directors can share a legal name. Compare the full address, including the unit, with Accounts before identifying a person. A service address match alone is not a money trail: first link the receiving IBAN to the company.</p>"
    },
    {
      "id": "supplier-guide",
      "name": "Supplier payment policy",
      "text": "<p>Independently check the supplier website. The current master record is not independent evidence. Cancelled payments do not move money. Use the last IBAN change before the executed payment, for the same supplier.</p>"
    },
    {
      "id": "studio-note",
      "name": "Late cover rota",
      "text": "<p>Quarter-end cover: Valentin Demir, Xenia Haddad, Jules Dumont, Yusuf Varga, Bram Aerts. All have their assigned trusted PCs available.</p><p>Yusuf Varga is openly a director of Garden Gate Theatre Association SRL, a legitimate local business. It is separate from our suppliers.</p>"
    }
  ],
  "finance": {
    "suppliers": [
      {
        "id": "SUP-2195606",
        "name": "River Loom Services Association",
        "domain": "bluethistle.art",
        "contact": "accounts@bluethistle.art",
        "ibanOnFile": "BE05 7539 6661 3551",
        "since": "2022-09-12"
      },
      {
        "id": "SUP-2727623",
        "name": "Westhaven Services BV",
        "domain": "silverfern.audio",
        "contact": "accounts@silverfern.audio",
        "ibanOnFile": "DE43 2798 0478 9729 4859 08",
        "since": "2022-09-12"
      },
      {
        "id": "SUP-2647566",
        "name": "Sunday Brass Association SRL",
        "domain": "copperfinch.audio",
        "contact": "accounts@copperfinch.audio",
        "ibanOnFile": "FR20 7860 5197 7454 1674 0479 672",
        "since": "2022-09-12"
      }
    ],
    "payments": {
      "tz": "Times in office time (UTC+1)",
      "columns": [
        "Executed",
        "Payment ID",
        "Invoice",
        "Supplier",
        "Amount",
        "Status",
        "To IBAN"
      ],
      "rows": [
        [
          "Sun 25 Jan 2026 01:58",
          "PAY-3798544",
          "INV-5094",
          "SUP-2647566",
          "EUR 5635.00",
          "Executed",
          "FR20 7860 5197 7454 1674 0479 672"
        ],
        [
          "Wed 21 Jan 2026 03:35",
          "PAY-2935984",
          "INV-0387",
          "SUP-2727623",
          "EUR 5744.00",
          "Executed",
          "FR34 1598 1900 9730 3864 6020 817"
        ],
        [
          "Sat 24 Jan 2026 03:15",
          "PAY-3541812",
          "INV-9619",
          "SUP-2647566",
          "EUR 1631.00",
          "Executed",
          "DE73 3188 7585 5408 3959 85"
        ],
        [
          "Thu 22 Jan 2026 23:49",
          "PAY-3177187",
          "INV-0729",
          "SUP-2727623",
          "EUR 6928.00",
          "Executed",
          "FR34 1598 1900 9730 3864 6020 817"
        ],
        [
          "Thu 22 Jan 2026 01:58",
          "PAY-7002047",
          "INV-9228",
          "SUP-2195606",
          "EUR 4724.00",
          "Executed",
          "BE05 7539 6661 3551"
        ],
        [
          "Wed 21 Jan 2026 01:58",
          "PAY-5771964",
          "INV-0387",
          "SUP-2727623",
          "EUR 4639.00",
          "Executed",
          "DE43 2798 0478 9729 4859 08"
        ],
        [
          "Mon 26 Jan 2026 01:58",
          "PAY-7326277",
          "INV-7025",
          "SUP-2195606",
          "EUR 8126.00",
          "Executed",
          "BE05 7539 6661 3551"
        ],
        [
          "Sun 25 Jan 2026 23:42",
          "PAY-9785879",
          "INV-7025",
          "SUP-2195606",
          "EUR 6211.00",
          "Executed",
          "DE53 0870 6979 4885 6434 27"
        ],
        [
          "Thu 22 Jan 2026 03:36",
          "PAY-4024834",
          "INV-9228",
          "SUP-2195606",
          "EUR 2094.00",
          "Executed",
          "DE53 0870 6979 4885 6434 27"
        ],
        [
          "Sat 24 Jan 2026 23:28",
          "PAY-8710596",
          "INV-5094",
          "SUP-2647566",
          "EUR 3191.00",
          "Executed",
          "DE73 3188 7585 5408 3959 85"
        ],
        [
          "Fri 23 Jan 2026 01:58",
          "PAY-9918341",
          "INV-0729",
          "SUP-2727623",
          "EUR 8437.00",
          "Executed",
          "DE43 2798 0478 9729 4859 08"
        ],
        [
          "Sat 24 Jan 2026 01:58",
          "PAY-8037620",
          "INV-9619",
          "SUP-2647566",
          "EUR 2950.00",
          "Executed",
          "FR20 7860 5197 7454 1674 0479 672"
        ],
        [
          "Mon 26 Jan 2026 07:35",
          "PAY-7246420",
          "INV-9619",
          "SUP-2195606",
          "EUR 7731.00",
          "Cancelled",
          "FR34 1598 1900 9730 3864 6020 817"
        ]
      ]
    },
    "changes": {
      "tz": "Times in office time (UTC+1)",
      "columns": [
        "When",
        "Change ID",
        "Supplier",
        "Field",
        "Old value",
        "New value",
        "By account",
        "Session",
        "Note"
      ],
      "rows": [
        [
          "Tue 27 Jan 2026 04:03",
          "CHG-2630267",
          "SUP-2727623",
          "Payment terms",
          "Net 30 days",
          "Net 45 days",
          "bram.aerts",
          "SES-9693447",
          "Bank details update; reference REQ-2362"
        ],
        [
          "Mon 26 Jan 2026 00:23",
          "CHG-5530827",
          "SUP-2195606",
          "IBAN",
          "DE53 0870 6979 4885 6434 27",
          "BE05 7539 6661 3551",
          "yusuf.varga",
          "SES-1379215",
          "Supplier request; reference REQ-9175"
        ],
        [
          "Thu 22 Jan 2026 00:23",
          "CHG-8573301",
          "SUP-2195606",
          "IBAN",
          "DE53 0870 6979 4885 6434 27",
          "BE05 7539 6661 3551",
          "jules.dumont",
          "SES-0597865",
          "Bank details update; reference REQ-6049"
        ],
        [
          "Wed 21 Jan 2026 03:08",
          "CHG-0879683",
          "SUP-2727623",
          "IBAN",
          "DE43 2798 0478 9729 4859 08",
          "FR34 1598 1900 9730 3864 6020 817",
          "jules.dumont",
          "SES-6873625",
          "Payment routing amendment; reference REQ-0598"
        ],
        [
          "Sat 24 Jan 2026 02:41",
          "CHG-0592949",
          "SUP-2647566",
          "IBAN",
          "FR20 7860 5197 7454 1674 0479 672",
          "DE73 3188 7585 5408 3959 85",
          "valentin.demir",
          "SES-9424246",
          "Bank details update; reference REQ-0896"
        ],
        [
          "Tue 27 Jan 2026 04:53",
          "CHG-7543655",
          "SUP-2195606",
          "Payment terms",
          "Net 60 days",
          "Net 70 days",
          "bram.aerts",
          "SES-3368806",
          "Bank details update; reference REQ-6569"
        ],
        [
          "Sun 25 Jan 2026 00:23",
          "CHG-1169038",
          "SUP-2647566",
          "IBAN",
          "DE73 3188 7585 5408 3959 85",
          "FR20 7860 5197 7454 1674 0479 672",
          "xenia.haddad",
          "SES-6838333",
          "Vendor record maintenance; reference REQ-6075"
        ],
        [
          "Tue 27 Jan 2026 04:13",
          "CHG-9876837",
          "SUP-2647566",
          "Payment terms",
          "Net 30 days",
          "Net 50 days",
          "valentin.demir",
          "SES-9345955",
          "Vendor record maintenance; reference REQ-6181"
        ],
        [
          "Tue 27 Jan 2026 04:43",
          "CHG-9055399",
          "SUP-2647566",
          "Payment terms",
          "Net 50 days",
          "Net 65 days",
          "valentin.demir",
          "SES-9863545",
          "Bank details update; reference REQ-2182"
        ],
        [
          "Fri 23 Jan 2026 00:23",
          "CHG-4919703",
          "SUP-2727623",
          "IBAN",
          "FR34 1598 1900 9730 3864 6020 817",
          "DE43 2798 0478 9729 4859 08",
          "xenia.haddad",
          "SES-1132635",
          "Payment routing amendment; reference REQ-5350"
        ],
        [
          "Thu 22 Jan 2026 02:49",
          "CHG-0012451",
          "SUP-2195606",
          "IBAN",
          "BE05 7539 6661 3551",
          "DE53 0870 6979 4885 6434 27",
          "bram.aerts",
          "SES-9749218",
          "Supplier request; reference REQ-6049"
        ],
        [
          "Tue 27 Jan 2026 04:33",
          "CHG-1219833",
          "SUP-2195606",
          "Payment terms",
          "Net 55 days",
          "Net 60 days",
          "yusuf.varga",
          "SES-5999396",
          "Bank details update; reference REQ-6733"
        ],
        [
          "Sat 24 Jan 2026 00:23",
          "CHG-4021515",
          "SUP-2647566",
          "IBAN",
          "DE73 3188 7585 5408 3959 85",
          "FR20 7860 5197 7454 1674 0479 672",
          "jules.dumont",
          "SES-0622104",
          "Bank details update; reference REQ-0896"
        ],
        [
          "Wed 21 Jan 2026 00:23",
          "CHG-3317881",
          "SUP-2727623",
          "IBAN",
          "FR34 1598 1900 9730 3864 6020 817",
          "DE43 2798 0478 9729 4859 08",
          "xenia.haddad",
          "SES-4189407",
          "Supplier request; reference REQ-0598"
        ],
        [
          "Tue 27 Jan 2026 04:23",
          "CHG-0580798",
          "SUP-2195606",
          "Payment terms",
          "Net 30 days",
          "Net 55 days",
          "yusuf.varga",
          "SES-2729690",
          "Vendor record maintenance; reference REQ-7678"
        ]
      ]
    }
  },
  "security": {
    "tabs": [
      {
        "id": "signins",
        "label": "Sign-ins",
        "tz": "Times in office time (UTC+1)",
        "search": "user",
        "columns": [
          "When",
          "Session",
          "Device",
          "Location / IP",
          "MFA challenge",
          "Result"
        ],
        "byUser": {
          "leonie.vos": [
            [
              "Tue 20 Jan 2026 10:00",
              "SES-3337647",
              "PC-40",
              "Pixelforge office / 192.0.2.10",
              "CH-4487826",
              "Success"
            ]
          ],
          "petra.bergman": [
            [
              "Tue 20 Jan 2026 10:01",
              "SES-5517480",
              "PC-39",
              "Pixelforge office / 192.0.2.10",
              "CH-0320223",
              "Success"
            ]
          ],
          "ada.verhoeven": [
            [
              "Tue 20 Jan 2026 10:02",
              "SES-6053455",
              "PC-41",
              "Pixelforge office / 192.0.2.10",
              "CH-9744811",
              "Success"
            ]
          ],
          "valentin.demir": [
            [
              "Mon 19 Jan 2026 10:00",
              "SES-3045038",
              "PC-34",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 20 Jan 2026 10:03",
              "SES-0362841",
              "PC-34",
              "Pixelforge office / 192.0.2.10",
              "CH-6933084",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:13",
              "SES-4190121",
              "PC-34",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:15",
              "SES-6799446",
              "Web browser",
              "Paris, FR (cloud server) / 198.51.100.23",
              "CH-8325032",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 02:03",
              "SES-1542651",
              "PC-34",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Sat 24 Jan 2026 02:32",
              "SES-9424246",
              "PC-34",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 27 Jan 2026 04:06",
              "SES-9345955",
              "PC-34",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 27 Jan 2026 04:34",
              "SES-9863545",
              "PC-34",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ]
          ],
          "xenia.haddad": [
            [
              "Mon 19 Jan 2026 10:00",
              "SES-2696847",
              "PC-32",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 20 Jan 2026 10:04",
              "SES-7581126",
              "PC-32",
              "Pixelforge office / 192.0.2.10",
              "CH-8432303",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:13",
              "SES-6838333",
              "PC-32",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:15",
              "SES-2639914",
              "Web browser",
              "Dublin, IE (cloud server) / 198.51.100.24",
              "CH-2121121",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 02:03",
              "SES-8363719",
              "PC-32",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Wed 21 Jan 2026 00:21",
              "SES-4189407",
              "PC-32",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Fri 23 Jan 2026 00:17",
              "SES-1132635",
              "PC-32",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:11",
              "SES-7149705",
              "PC-32",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ]
          ],
          "katja.laurent": [
            [
              "Tue 20 Jan 2026 10:05",
              "SES-9089055",
              "PC-38",
              "Pixelforge office / 192.0.2.10",
              "CH-7303249",
              "Success"
            ]
          ],
          "timo.faure": [
            [
              "Tue 20 Jan 2026 10:06",
              "SES-6638153",
              "PC-36",
              "Pixelforge office / 192.0.2.10",
              "CH-7274391",
              "Success"
            ]
          ],
          "jules.dumont": [
            [
              "Mon 19 Jan 2026 10:00",
              "SES-1088869",
              "PC-35",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 20 Jan 2026 10:07",
              "SES-3543166",
              "PC-35",
              "Pixelforge office / 192.0.2.10",
              "CH-6985172",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:13",
              "SES-1980925",
              "PC-35",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:15",
              "SES-7920146",
              "Web browser",
              "Dublin, IE (cloud server) / 198.51.100.27",
              "CH-8090986",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 02:03",
              "SES-1725927",
              "PC-35",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Wed 21 Jan 2026 03:04",
              "SES-6873625",
              "PC-35",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Thu 22 Jan 2026 00:14",
              "SES-0597865",
              "PC-35",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Sat 24 Jan 2026 00:13",
              "SES-0622104",
              "PC-35",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ]
          ],
          "yusuf.varga": [
            [
              "Mon 19 Jan 2026 10:00",
              "SES-7115511",
              "PC-31",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 20 Jan 2026 10:08",
              "SES-2337463",
              "PC-31",
              "Pixelforge office / 192.0.2.10",
              "CH-4293069",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:13",
              "SES-7129368",
              "PC-31",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:15",
              "SES-4780500",
              "Web browser",
              "Paris, FR (cloud server) / 198.51.100.28",
              "CH-2019993",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 02:03",
              "SES-4235182",
              "PC-31",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Mon 26 Jan 2026 00:13",
              "SES-1379215",
              "PC-31",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 27 Jan 2026 04:20",
              "SES-2729690",
              "PC-31",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 27 Jan 2026 04:18",
              "SES-5999396",
              "PC-31",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ]
          ],
          "bram.aerts": [
            [
              "Mon 19 Jan 2026 10:00",
              "SES-8405723",
              "PC-33",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 20 Jan 2026 10:09",
              "SES-6247505",
              "PC-33",
              "Pixelforge office / 192.0.2.10",
              "CH-7420050",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:13",
              "SES-5706667",
              "PC-33",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 00:15",
              "SES-9974833",
              "Web browser",
              "Dublin, IE (cloud server) / 198.51.100.29",
              "CH-6309012",
              "Success"
            ],
            [
              "Sun 25 Jan 2026 02:03",
              "SES-4346099",
              "PC-33",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Thu 22 Jan 2026 02:43",
              "SES-9749218",
              "PC-33",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 27 Jan 2026 03:58",
              "SES-9693447",
              "PC-33",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ],
            [
              "Tue 27 Jan 2026 04:41",
              "SES-3368806",
              "PC-33",
              "Pixelforge office / 192.0.2.10",
              "Existing trusted device",
              "Success"
            ]
          ],
          "una.peeters": [
            [
              "Tue 20 Jan 2026 10:10",
              "SES-1119078",
              "PC-37",
              "Pixelforge office / 192.0.2.10",
              "CH-4460349",
              "Success"
            ]
          ]
        }
      },
      {
        "id": "mfa",
        "label": "MFA prompts",
        "tz": "Times in office time (UTC+1)",
        "search": "user",
        "columns": [
          "When",
          "Challenge ID",
          "Result",
          "Requested from"
        ],
        "byUser": {
          "leonie.vos": [
            [
              "Tue 20 Jan 2026 09:59",
              "CH-4487826",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ]
          ],
          "petra.bergman": [
            [
              "Tue 20 Jan 2026 10:00",
              "CH-0320223",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ]
          ],
          "ada.verhoeven": [
            [
              "Tue 20 Jan 2026 10:01",
              "CH-9744811",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ]
          ],
          "valentin.demir": [
            [
              "Tue 20 Jan 2026 10:02",
              "CH-6933084",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ],
            [
              "Sun 25 Jan 2026 00:10",
              "CH-2227349",
              "Denied",
              "Paris, FR (cloud server) / 198.51.100.23"
            ],
            [
              "Sun 25 Jan 2026 00:11",
              "CH-5552652",
              "Denied",
              "Paris, FR (cloud server) / 198.51.100.23"
            ],
            [
              "Sun 25 Jan 2026 00:14",
              "CH-8325032",
              "Approved",
              "Paris, FR (cloud server) / 198.51.100.23"
            ]
          ],
          "xenia.haddad": [
            [
              "Tue 20 Jan 2026 10:03",
              "CH-8432303",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ],
            [
              "Sun 25 Jan 2026 00:10",
              "CH-3235874",
              "Denied",
              "Dublin, IE (cloud server) / 198.51.100.24"
            ],
            [
              "Sun 25 Jan 2026 00:11",
              "CH-8834830",
              "Denied",
              "Dublin, IE (cloud server) / 198.51.100.24"
            ],
            [
              "Sun 25 Jan 2026 00:14",
              "CH-2121121",
              "Approved",
              "Dublin, IE (cloud server) / 198.51.100.24"
            ]
          ],
          "katja.laurent": [
            [
              "Tue 20 Jan 2026 10:04",
              "CH-7303249",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ]
          ],
          "timo.faure": [
            [
              "Tue 20 Jan 2026 10:05",
              "CH-7274391",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ]
          ],
          "jules.dumont": [
            [
              "Tue 20 Jan 2026 10:06",
              "CH-6985172",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ],
            [
              "Sun 25 Jan 2026 00:10",
              "CH-2258525",
              "Denied",
              "Dublin, IE (cloud server) / 198.51.100.27"
            ],
            [
              "Sun 25 Jan 2026 00:11",
              "CH-2020145",
              "Denied",
              "Dublin, IE (cloud server) / 198.51.100.27"
            ],
            [
              "Sun 25 Jan 2026 00:14",
              "CH-8090986",
              "Approved",
              "Dublin, IE (cloud server) / 198.51.100.27"
            ]
          ],
          "yusuf.varga": [
            [
              "Tue 20 Jan 2026 10:07",
              "CH-4293069",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ],
            [
              "Sun 25 Jan 2026 00:10",
              "CH-8126205",
              "Denied",
              "Paris, FR (cloud server) / 198.51.100.28"
            ],
            [
              "Sun 25 Jan 2026 00:11",
              "CH-2193438",
              "Denied",
              "Paris, FR (cloud server) / 198.51.100.28"
            ],
            [
              "Sun 25 Jan 2026 00:14",
              "CH-2019993",
              "Approved",
              "Paris, FR (cloud server) / 198.51.100.28"
            ]
          ],
          "bram.aerts": [
            [
              "Tue 20 Jan 2026 10:08",
              "CH-7420050",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ],
            [
              "Sun 25 Jan 2026 00:10",
              "CH-2912288",
              "Denied",
              "Dublin, IE (cloud server) / 198.51.100.29"
            ],
            [
              "Sun 25 Jan 2026 00:11",
              "CH-4042456",
              "Denied",
              "Dublin, IE (cloud server) / 198.51.100.29"
            ],
            [
              "Sun 25 Jan 2026 00:14",
              "CH-6309012",
              "Approved",
              "Dublin, IE (cloud server) / 198.51.100.29"
            ]
          ],
          "una.peeters": [
            [
              "Tue 20 Jan 2026 10:09",
              "CH-4460349",
              "Approved",
              "Pixelforge office / 192.0.2.10"
            ]
          ]
        }
      },
      {
        "id": "accounts",
        "label": "Accounts",
        "kind": "accounts",
        "accounts": {
          "leonie_vos": [
            [
              "Role",
              "Animator"
            ],
            [
              "Dept",
              "Production"
            ],
            [
              "Home address",
              "Lindenlaan 108, unit 66, 1000 Brussels, BE"
            ],
            [
              "Device",
              "PC-40"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "petra_bergman": [
            [
              "Role",
              "IT administrator"
            ],
            [
              "Dept",
              "Production"
            ],
            [
              "Home address",
              "Lindenlaan 128, unit 73, 1000 Brussels, BE"
            ],
            [
              "Device",
              "PC-39"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "ada_verhoeven": [
            [
              "Role",
              "Studio manager"
            ],
            [
              "Dept",
              "Production"
            ],
            [
              "Home address",
              "Kadeweg 28, unit 42, 3011 Rotterdam, NL"
            ],
            [
              "Device",
              "PC-41"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "valentin_demir": [
            [
              "Role",
              "Payroll accountant"
            ],
            [
              "Dept",
              "Finance"
            ],
            [
              "Home address",
              "Lindenlaan 40, unit 37, 1000 Brussels, BE"
            ],
            [
              "Device",
              "PC-34"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "xenia_haddad": [
            [
              "Role",
              "Accounts payable"
            ],
            [
              "Dept",
              "Finance"
            ],
            [
              "Home address",
              "Rue des Tilleuls 167, unit 40, 59000 Lille, FR"
            ],
            [
              "Device",
              "PC-32"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "katja_laurent": [
            [
              "Role",
              "Audio designer"
            ],
            [
              "Dept",
              "Production"
            ],
            [
              "Home address",
              "Lindenlaan 148, unit 81, 1000 Brussels, BE"
            ],
            [
              "Device",
              "PC-38"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "timo_faure": [
            [
              "Role",
              "Producer"
            ],
            [
              "Dept",
              "Production"
            ],
            [
              "Home address",
              "Kadeweg 114, unit 27, 3011 Rotterdam, NL"
            ],
            [
              "Device",
              "PC-36"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "jules_dumont": [
            [
              "Role",
              "Finance assistant"
            ],
            [
              "Dept",
              "Finance"
            ],
            [
              "Home address",
              "Rue des Tilleuls 143, unit 57, 59000 Lille, FR"
            ],
            [
              "Device",
              "PC-35"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "yusuf_varga": [
            [
              "Role",
              "Finance lead"
            ],
            [
              "Dept",
              "Finance"
            ],
            [
              "Home address",
              "Rue des Tilleuls 78, unit 63, 59000 Lille, FR"
            ],
            [
              "Device",
              "PC-31"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "bram_aerts": [
            [
              "Role",
              "Finance analyst"
            ],
            [
              "Dept",
              "Finance"
            ],
            [
              "Home address",
              "Birkenweg 175, unit 56, 52062 Aachen, DE"
            ],
            [
              "Device",
              "PC-33"
            ],
            [
              "Status",
              "Active"
            ]
          ],
          "una_peeters": [
            [
              "Role",
              "Environment artist"
            ],
            [
              "Dept",
              "Production"
            ],
            [
              "Home address",
              "Kadeweg 70, unit 54, 3011 Rotterdam, NL"
            ],
            [
              "Device",
              "PC-37"
            ],
            [
              "Status",
              "Active"
            ]
          ]
        }
      }
    ]
  },
  "web": {
    "company": {
      "host": "pixelforge.studio",
      "news": "<h2>Pixelforge</h2><p>An independent game studio. Our office uses UTC+1 throughout this case.</p>"
    },
    "suppliers": {
      "copperfinch.audio": {
        "name": "Sunday Brass Association SRL",
        "html": "<h2>Sunday Brass Association SRL</h2><p>Environment artwork for independent studios.</p><h3>Payment details</h3><p>IBAN: <b>DE73 3188 7585 5408 3959 85</b></p><p>Contact: accounts@copperfinch.audio</p><p>We have used this account since 2022. Confirm changes using our existing contact address.</p>"
      },
      "silverfern.audio": {
        "name": "Westhaven Services BV",
        "html": "<h2>Westhaven Services BV</h2><p>Environment artwork for independent studios.</p><h3>Payment details</h3><p>IBAN: <b>FR34 1598 1900 9730 3864 6020 817</b></p><p>Contact: accounts@silverfern.audio</p><p>We have used this account since 2022. Confirm changes using our existing contact address.</p>"
      },
      "bluethistle.art": {
        "name": "River Loom Services Association",
        "html": "<h2>River Loom Services Association</h2><p>Animation services for independent studios.</p><h3>Payment details</h3><p>IBAN: <b>DE53 0870 6979 4885 6434 27</b></p><p>Contact: accounts@bluethistle.art</p><p>We have used this account since 2022. Confirm changes using our existing contact address.</p>"
      }
    },
    "whois": {
      "copperfinch.audio": [
        [
          "Domain",
          "copperfinch.audio"
        ],
        [
          "Created",
          "2018-04-18"
        ],
        [
          "Registrant",
          "Sunday Brass Association SRL"
        ],
        [
          "Registrant email",
          "accounts@copperfinch.audio"
        ]
      ],
      "silverfern.audio": [
        [
          "Domain",
          "silverfern.audio"
        ],
        [
          "Created",
          "2018-04-18"
        ],
        [
          "Registrant",
          "Westhaven Services BV"
        ],
        [
          "Registrant email",
          "accounts@silverfern.audio"
        ]
      ],
      "bluethistle.art": [
        [
          "Domain",
          "bluethistle.art"
        ],
        [
          "Created",
          "2018-04-18"
        ],
        [
          "Registrant",
          "River Loom Services Association"
        ],
        [
          "Registrant email",
          "accounts@bluethistle.art"
        ]
      ],
      "copper-finch.audio": [
        [
          "Domain",
          "copper-finch.audio"
        ],
        [
          "Created",
          "2026-01-18"
        ],
        [
          "Registrant",
          "Privacy relay"
        ],
        [
          "Registrant email",
          "contact@copper-finch.audio"
        ]
      ],
      "silver-fern.audio": [
        [
          "Domain",
          "silver-fern.audio"
        ],
        [
          "Created",
          "2026-01-18"
        ],
        [
          "Registrant",
          "Privacy relay"
        ],
        [
          "Registrant email",
          "contact@silver-fern.audio"
        ]
      ],
      "blue-thistle.art": [
        [
          "Domain",
          "blue-thistle.art"
        ],
        [
          "Created",
          "2026-01-18"
        ],
        [
          "Registrant",
          "Privacy relay"
        ],
        [
          "Registrant email",
          "contact@blue-thistle.art"
        ]
      ]
    },
    "registry": {
      "companies": [
        {
          "id": "EU-6068512",
          "name": "Elm Gate Trading SRL",
          "director": "Yusuf Varga",
          "address": "Rue des Tilleuls 78, unit 63, 59000 Lille, FR",
          "founded": "2025-11-04",
          "activity": "Sound recording"
        },
        {
          "id": "EU-0399773",
          "name": "Copper Finch Audio Cooperative",
          "director": "Yusuf Varga",
          "address": "Rue des Tilleuls 78, unit 64, 59000 Lille, FR",
          "founded": "2025-11-04",
          "activity": "Concept artwork"
        },
        {
          "id": "EU-5101737",
          "name": "Amber Kite Studio BV",
          "director": "Sabine Renaud",
          "address": "Quai du Port 28, unit 4, 13002 Marseille, FR",
          "founded": "2019-02-14",
          "activity": "3D asset production"
        },
        {
          "id": "EU-9430032",
          "name": "Garden Gate Theatre Association SRL",
          "director": "Yusuf Varga",
          "address": "Rue des Tilleuls 78, unit 63, 59000 Lille, FR",
          "founded": "2016-08-09",
          "activity": "Concept artwork"
        },
        {
          "id": "EU-0685400",
          "name": "Birch Quay Trading Association",
          "director": "Jules Dumont",
          "address": "Rue des Tilleuls 143, unit 58, 59000 Lille, FR",
          "founded": "2025-11-04",
          "activity": "3D asset production"
        },
        {
          "id": "EU-4211662",
          "name": "Blue Thistle Assets SRL",
          "director": "Bram Aerts",
          "address": "Birkenweg 175, unit 56, 52062 Aachen, DE",
          "founded": "2025-11-04",
          "activity": "3D asset production"
        },
        {
          "id": "EU-7006625",
          "name": "Kestrel Bridge SRL",
          "director": "Xenia Haddad",
          "address": "Rue des Tilleuls 167, unit 20, 59000 Lille, FR",
          "founded": "2025-11-04",
          "activity": "Concept artwork"
        },
        {
          "id": "EU-3165040",
          "name": "Silver Fern Foley Cooperative",
          "director": "Bram Aerts",
          "address": "Birkenweg 175, unit 57, 52062 Aachen, DE",
          "founded": "2025-11-04",
          "activity": "Audio production"
        },
        {
          "id": "EU-2426123",
          "name": "Paper Lantern Art SRL",
          "director": "Valentin Demir",
          "address": "Lindenlaan 40, unit 37, 1000 Brussels, BE",
          "founded": "2025-11-04",
          "activity": "Audio production"
        },
        {
          "id": "EU-0524048",
          "name": "River Loom Services Association",
          "director": "Celia Lambert",
          "address": "22 Atelierstraat, unit 1, 2000 Antwerp, BE",
          "founded": "2018-04-18",
          "activity": "Animation services"
        },
        {
          "id": "EU-0202430",
          "name": "Neighbourhood String Quartet Cooperative",
          "director": "Valentin Demir",
          "address": "Lindenlaan 40, unit 38, 1000 Brussels, BE",
          "founded": "2025-11-04",
          "activity": "Animation services"
        },
        {
          "id": "EU-2974125",
          "name": "Westhaven Services BV",
          "director": "Floris Willems",
          "address": "21 Atelierstraat, unit 1, 2000 Antwerp, BE",
          "founded": "2018-04-18",
          "activity": "Environment artwork"
        },
        {
          "id": "EU-5292792",
          "name": "Canal Baking Cooperative Association",
          "director": "Jules Dumont",
          "address": "Rue des Tilleuls 143, unit 57, 59000 Lille, FR",
          "founded": "2025-11-04",
          "activity": "Environment artwork"
        },
        {
          "id": "EU-9842445",
          "name": "Moss Ribbon Motion Cooperative",
          "director": "Xenia Haddad",
          "address": "Rue des Tilleuls 167, unit 40, 59000 Lille, FR",
          "founded": "2025-11-04",
          "activity": "3D asset production"
        },
        {
          "id": "EU-6849431",
          "name": "Sunday Brass Association SRL",
          "director": "Malik Bernard",
          "address": "20 Atelierstraat, unit 1, 2000 Antwerp, BE",
          "founded": "2018-04-18",
          "activity": "Environment artwork"
        }
      ]
    },
    "banklookup": {
      "DE73318875855408395985": {
        "holder": "Sunday Brass Association SRL",
        "companyId": "EU-6849431",
        "bank": "GLS Bank"
      },
      "FR3415981900973038646020817": {
        "holder": "Westhaven Services BV",
        "companyId": "EU-2974125",
        "bank": "Credit Cooperatif"
      },
      "DE53087069794885643427": {
        "holder": "River Loom Services Association",
        "companyId": "EU-0524048",
        "bank": "GLS Bank"
      },
      "FR2078605197745416740479672": {
        "holder": "Moss Ribbon Motion Cooperative",
        "companyId": "EU-9842445",
        "bank": "Credit Cooperatif"
      },
      "DE43279804789729485908": {
        "holder": "Garden Gate Theatre Association SRL",
        "companyId": "EU-9430032",
        "bank": "GLS Bank"
      },
      "BE05753966613551": {
        "holder": "Amber Kite Studio BV",
        "companyId": "EU-5101737",
        "bank": "KBC Bank"
      }
    },
    "chirper": {
      "leonie_atelier": {
        "name": "Leonie Vos",
        "bio": "Animator at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:00",
            "text": "Lunch orders close at eleven."
          }
        ]
      },
      "petra_atelier": {
        "name": "Petra Bergman",
        "bio": "IT administrator at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:01",
            "text": "Lunch orders close at eleven."
          }
        ]
      },
      "ada_atelier": {
        "name": "Ada Verhoeven",
        "bio": "Studio manager at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:02",
            "text": "The audio preview sounds good."
          }
        ]
      },
      "valentin_atelier": {
        "name": "Valentin Demir",
        "bio": "Payroll accountant at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:03",
            "text": "I booked the small meeting room."
          }
        ]
      },
      "xenia_atelier": {
        "name": "Xenia Haddad",
        "bio": "Accounts payable at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:04",
            "text": "Lunch orders close at eleven."
          }
        ]
      },
      "katja_atelier": {
        "name": "Katja Laurent",
        "bio": "Audio designer at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:05",
            "text": "Lunch orders close at eleven."
          }
        ]
      },
      "timo_atelier": {
        "name": "Timo Faure",
        "bio": "Producer at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:06",
            "text": "The review pack is ready for tomorrow."
          }
        ]
      },
      "jules_atelier": {
        "name": "Jules Dumont",
        "bio": "Finance assistant at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:07",
            "text": "I booked the small meeting room."
          }
        ]
      },
      "yusuf_atelier": {
        "name": "Yusuf Varga",
        "bio": "Finance lead at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:08",
            "text": "I booked the small meeting room."
          }
        ]
      },
      "bram_atelier": {
        "name": "Bram Aerts",
        "bio": "Finance analyst at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:09",
            "text": "The audio preview sounds good."
          }
        ]
      },
      "una_atelier": {
        "name": "Una Peeters",
        "bio": "Environment artist at Pixelforge",
        "posts": [
          {
            "date": "Tue 20 Jan 2026 00:10",
            "text": "Lunch orders close at eleven."
          }
        ]
      }
    },
    "pages": {
      "copper-finch.audio": {
        "title": "Sunday Brass Association SRL",
        "html": "<h2>Sunday Brass Association SRL</h2><p>Payment administration. Please use the bank account in our recent email.</p>"
      },
      "silver-fern.audio": {
        "title": "Westhaven Services BV",
        "html": "<h2>Westhaven Services BV</h2><p>Payment administration. Please use the bank account in our recent email.</p>"
      },
      "blue-thistle.art": {
        "title": "River Loom Services Association",
        "html": "<h2>River Loom Services Association</h2><p>Payment administration. Please use the bank account in our recent email.</p>"
      },
      "quiet-post.eu": {
        "title": "Quiet Post",
        "html": "<p>Private mail relay. Sender identities are not verified.</p>"
      }
    }
  },
  "bookmarks": [
    [
      "pixelforge.studio",
      "Pixelforge"
    ],
    [
      "copperfinch.audio",
      "Sunday Brass Association SRL"
    ],
    [
      "silverfern.audio",
      "Westhaven Services BV"
    ],
    [
      "bluethistle.art",
      "River Loom Services Association"
    ],
    [
      "domaininfo.net",
      "Domain lookup"
    ],
    [
      "companyregister.eu",
      "Company register"
    ],
    [
      "ibancheck.eu",
      "IBAN check"
    ],
    [
      "chirper.social",
      "Chirper"
    ]
  ],
  "report": {
    "whoQ": "Who orchestrated the payment diversion?",
    "howQ": "How was the bank account changed?",
    "evQ": "Which 2 pieces of evidence prove it?",
    "who": [
      [
        "leonie_vos",
        "Leonie Vos"
      ],
      [
        "petra_bergman",
        "Petra Bergman"
      ],
      [
        "ada_verhoeven",
        "Ada Verhoeven"
      ],
      [
        "valentin_demir",
        "Valentin Demir"
      ],
      [
        "xenia_haddad",
        "Xenia Haddad"
      ],
      [
        "katja_laurent",
        "Katja Laurent"
      ],
      [
        "timo_faure",
        "Timo Faure"
      ],
      [
        "jules_dumont",
        "Jules Dumont"
      ],
      [
        "yusuf_varga",
        "Yusuf Varga"
      ],
      [
        "bram_aerts",
        "Bram Aerts"
      ],
      [
        "una_peeters",
        "Una Peeters"
      ],
      [
        "outsider",
        "An outsider"
      ]
    ],
    "how": [
      [
        "self",
        "Changed it deliberately from their own account"
      ],
      [
        "lookalike",
        "Supplier impersonation email, no account takeover"
      ],
      [
        "mfa",
        "Account takeover by approving an unsolicited MFA prompt"
      ],
      [
        "phish",
        "Password typed on a fake login page"
      ],
      [
        "reuse",
        "Password from an old breach"
      ]
    ],
    "evidence": [
      [
        "auth",
        "Authentication trail: MFA challenge -> sign-in session"
      ],
      [
        "changelog",
        "Supplier change record"
      ],
      [
        "chat",
        "The chat messages"
      ],
      [
        "mail",
        "The bank-change request email"
      ],
      [
        "ownership",
        "Ownership trail: bank lookup -> company register -> home address"
      ],
      [
        "payment",
        "Payment record"
      ],
      [
        "tip",
        "The anonymous tip"
      ],
      [
        "whois",
        "The domain lookup"
      ]
    ]
  },
  "traps": {
    "count": 0,
    "reportName": null,
    "sawHosts": [],
    "confirmHost": null
  },
  "secret": {
    "layout": "insider",
    "who": "xenia_haddad",
    "how": "self",
    "evidence": [
      "changelog+ownership"
    ],
    "paymentRow": 0,
    "changeRow": 6,
    "story": "<p>Invoice <b>INV-5094</b> was paid by <b>PAY-3798544</b> to <b>FR20 7860 5197 7454 1674 0479 672</b>, not the genuine account on copperfinch.audio. Supplier change <b>CHG-1169038</b> set that account before the payment.</p><p><b>Xenia Haddad</b> orchestrated the diversion, using their own trusted PC session <b>SES-6838333</b>. IBAN check links the receiving account to <b>Moss Ribbon Motion Cooperative</b> (EU-9842445). Its director has Xenia Haddad's name AND full home address, <b>Rue des Tilleuls 167, unit 40, 59000 Lille, FR</b>, including the unit shown in Accounts. The change record and ownership trail prove deliberate self-dealing.</p><p>Garden Gate Theatre Association SRL is a legitimate staff affiliation and never received this invoice's money. Other supplier requests do not match this change. Unrelated night approvals, financial worries and planted accusations do not establish who diverted this payment.</p>"
  },
  "twists": [
    "noise",
    "tip"
  ]
};
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
  else root.CASE2 = C;
})(typeof window !== 'undefined' ? window : globalThis);
