-- Gap 8: Interim Measures Application + Jurisdictional Objection
-- Gap 10: Mediation Settlement Agreement + Joint Statement of Agreed Facts

INSERT INTO templates (category, title, template_type, jurisdiction, framework, variables, content) VALUES

-- ============================================================
-- INTERIM MEASURES APPLICATION
-- ============================================================
(
  'Arbitration — Procedure',
  'Application for Interim Measures',
  'interim_measures_application',
  'ghana',
  'Ghana ADR Act 2010 (Act 798) / UNCITRAL Arbitration Rules 2021',
  '[
    {"name": "applicant_name", "label": "Applicant Name", "type": "text", "required": true},
    {"name": "applicant_counsel", "label": "Applicant Counsel", "type": "text", "required": false},
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true},
    {"name": "case_reference", "label": "Case / Matter Reference", "type": "text", "required": false},
    {"name": "tribunal_composition", "label": "Arbitral Tribunal", "type": "text", "required": false, "description": "Name(s) of arbitrator(s) if constituted"},
    {"name": "measure_sought", "label": "Interim Measure Sought", "type": "select", "required": true, "options": ["Preservation Order", "Injunction", "Order to maintain status quo", "Security for costs", "Order for preservation of evidence", "Freezing order"], "default": "Preservation Order"},
    {"name": "measure_description", "label": "Description of Relief Sought", "type": "textarea", "required": true, "description": "Describe the specific interim measure or order requested"},
    {"name": "factual_background", "label": "Factual Background", "type": "textarea", "required": true},
    {"name": "grounds_for_measure", "label": "Grounds for Interim Measure", "type": "textarea", "required": true, "description": "Why is the measure necessary? What harm will result if refused?"},
    {"name": "urgency_grounds", "label": "Urgency (if applicable)", "type": "textarea", "required": false, "description": "If applying ex parte or on urgent basis, explain why"},
    {"name": "undertaking_in_damages", "label": "Undertaking in Damages", "type": "select", "required": false, "options": ["Yes — undertaking offered", "No — undertaking not offered"], "default": "Yes — undertaking offered"},
    {"name": "seat_of_arbitration", "label": "Seat of Arbitration", "type": "text", "required": false, "default": "Accra, Ghana"},
    {"name": "application_date", "label": "Date of Application", "type": "date", "required": true}
  ]'::jsonb,
  E'APPLICATION FOR INTERIM MEASURES\n\nCase Reference: {{case_reference}}\nDate: {{application_date}}\n\n---\n\n1. PARTIES\n\n1.1 Applicant: {{applicant_name}}{{applicant_counsel ? " (Counsel: " + applicant_counsel + ")" : ""}}\n1.2 Respondent: {{respondent_name}}\n1.3 Arbitral Tribunal: {{tribunal_composition}}\n\n---\n\n2. INTERIM MEASURE SOUGHT\n\n2.1 The Applicant applies for the following interim measure: **{{measure_sought}}**.\n\n2.2 Specifically, the Applicant requests the following order:\n\n{{measure_description}}\n\n---\n\n3. FACTUAL BACKGROUND\n\n3.1 {{factual_background}}\n\n---\n\n4. LEGAL GROUNDS\n\n4.1 The Applicant submits that the Tribunal has jurisdiction to grant interim measures under the applicable rules and the seat law.\n\n4.2 The criteria for granting the interim measure are satisfied:\n\n(a) **Prima Facie Case / Likelihood of Success:** The Applicant has a prima facie case on the merits. [To be elaborated by Tribunal]\n\n(b) **Risk of Irreparable Harm:** If the measure is not granted, the Applicant will suffer harm that cannot adequately be compensated in damages:\n\n{{grounds_for_measure}}\n\n(c) **Balance of Convenience:** The balance of harm favours the grant of the measure. The harm to the Applicant if relief is refused outweighs the harm to the Respondent if relief is granted.\n\n(d) **Urgency:** {{urgency_grounds}}\n\n---\n\n5. UNDERTAKING IN DAMAGES\n\n5.1 {{undertaking_in_damages}}. The Applicant undertakes to compensate the Respondent for any loss caused by the interim measure if the Tribunal later finds that the measure was wrongly granted.\n\n---\n\n6. RELIEF SOUGHT\n\n6.1 The Applicant respectfully requests that the Tribunal:\n\n(a) Grant the interim measure described in paragraph 2 above;\n\n(b) Issue the order with immediate effect [or: on [DATE]];\n\n(c) Order costs of this application in the Applicant''s favour; and\n\n(d) Grant such further or other relief as the Tribunal considers just.\n\n---\n\nRespectfully submitted,\n\nSignature: _________________________\nName: _________________________\nCounsel for the Applicant\nDate: {{application_date}}\nSeat of Arbitration: {{seat_of_arbitration}}'
),

-- ============================================================
-- JURISDICTIONAL OBJECTION
-- ============================================================
(
  'Arbitration — Procedure',
  'Jurisdictional Objection',
  'jurisdictional_objection',
  'ghana',
  'Ghana ADR Act 2010 (Act 798) / UNCITRAL Arbitration Rules 2021',
  '[
    {"name": "objecting_party", "label": "Objecting Party Name", "type": "text", "required": true},
    {"name": "objecting_party_role", "label": "Role", "type": "select", "required": true, "options": ["Respondent", "Claimant"], "default": "Respondent"},
    {"name": "opposing_party", "label": "Opposing Party Name", "type": "text", "required": true},
    {"name": "case_reference", "label": "Case / Matter Reference", "type": "text", "required": false},
    {"name": "objection_grounds", "label": "Primary Grounds for Objection", "type": "select", "required": true, "options": ["No valid arbitration agreement", "Dispute falls outside scope of arbitration agreement", "Arbitration agreement is null and void", "Arbitration agreement is inoperative or incapable of being performed", "Claimant lacks standing to bring the claim", "Time bar — claim filed out of time", "Prior settlement of the dispute"], "default": "No valid arbitration agreement"},
    {"name": "factual_basis", "label": "Factual Basis for Objection", "type": "textarea", "required": true},
    {"name": "legal_submissions", "label": "Legal Submissions", "type": "textarea", "required": true, "description": "Key legal arguments supporting the objection"},
    {"name": "relief_sought", "label": "Relief Sought", "type": "textarea", "required": false, "default": "A declaration that the Tribunal lacks jurisdiction over this dispute and an order dismissing the claims."},
    {"name": "applicable_rules", "label": "Applicable Rules", "type": "text", "required": false, "default": "Ghana ADR Act 2010 (Act 798)"},
    {"name": "objection_date", "label": "Date of Objection", "type": "date", "required": true}
  ]'::jsonb,
  E'JURISDICTIONAL OBJECTION\n\nCase Reference: {{case_reference}}\nDate: {{objection_date}}\n\n---\n\n1. PARTIES\n\n1.1 Objecting Party ({{objecting_party_role}}): {{objecting_party}}\n1.2 Opposing Party: {{opposing_party}}\n\n---\n\n2. INTRODUCTION\n\n2.1 The {{objecting_party_role}}, {{objecting_party}}, hereby raises a preliminary objection to the jurisdiction of the Arbitral Tribunal pursuant to {{applicable_rules}} and the principle of Kompetenz-Kompetenz.\n\n2.2 The {{objecting_party_role}} submits that the Tribunal lacks jurisdiction over this dispute on the following ground(s): **{{objection_grounds}}**.\n\n---\n\n3. FACTUAL BACKGROUND\n\n3.1 {{factual_basis}}\n\n---\n\n4. LEGAL SUBMISSIONS\n\n4.1 The following legal submissions are advanced in support of this objection:\n\n{{legal_submissions}}\n\n4.2 Specifically, the {{objecting_party_role}} submits that:\n\n(a) The burden of proving the existence and scope of a valid arbitration agreement rests on the party seeking to invoke arbitration;\n\n(b) An arbitral tribunal''s jurisdiction is strictly limited to the terms of the arbitration agreement;\n\n(c) Any doubt as to the scope of the agreement must be resolved in favour of the party challenging jurisdiction; and\n\n(d) The [[applicable legislation/rules]] requires a valid, operative arbitration agreement as a prerequisite to jurisdiction.\n\n---\n\n5. APPLICABLE LEGAL FRAMEWORK\n\n5.1 The applicable rules are {{applicable_rules}}.\n\n5.2 The {{objecting_party_role}} relies on the following legal authorities: [TO BE INSERTED]\n\n---\n\n6. RELIEF SOUGHT\n\n6.1 The {{objecting_party_role}} respectfully requests that the Tribunal:\n\n{{relief_sought}}\n\n---\n\nRespectfully submitted,\n\nSignature: _________________________\nName: _________________________\n{{objecting_party_role}} / Counsel for the {{objecting_party_role}}\nDate: {{objection_date}}'
),

-- ============================================================
-- MEDIATION SETTLEMENT AGREEMENT
-- ============================================================
(
  'Settlement Documents',
  'Mediation Settlement Agreement',
  'mediation_settlement_agreement',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "party_1_name", "label": "Party 1 (First Party) Name", "type": "text", "required": true},
    {"name": "party_1_address", "label": "Party 1 Address", "type": "textarea", "required": true},
    {"name": "party_2_name", "label": "Party 2 (Second Party) Name", "type": "text", "required": true},
    {"name": "party_2_address", "label": "Party 2 Address", "type": "textarea", "required": true},
    {"name": "mediator_name", "label": "Mediator Name", "type": "text", "required": true},
    {"name": "mediation_date", "label": "Date of Mediation", "type": "date", "required": true},
    {"name": "dispute_description", "label": "Description of Dispute", "type": "textarea", "required": true},
    {"name": "settlement_terms", "label": "Settlement Terms", "type": "textarea", "required": true, "description": "Set out each agreed term clearly and specifically"},
    {"name": "payment_amount", "label": "Settlement Payment Amount (if applicable)", "type": "text", "required": false},
    {"name": "payment_deadline", "label": "Payment Deadline", "type": "date", "required": false},
    {"name": "payment_method", "label": "Payment Method", "type": "text", "required": false, "default": "Bank transfer"},
    {"name": "confidentiality", "label": "Confidentiality Clause", "type": "select", "required": false, "options": ["Yes — include confidentiality clause", "No — no confidentiality clause"], "default": "Yes — include confidentiality clause"},
    {"name": "full_final_settlement", "label": "Full and Final Settlement", "type": "select", "required": false, "options": ["Yes — full and final settlement of all claims", "Yes — partial settlement only"], "default": "Yes — full and final settlement of all claims"},
    {"name": "governing_law", "label": "Governing Law", "type": "text", "required": false, "default": "Laws of Ghana"},
    {"name": "agreement_date", "label": "Agreement Date", "type": "date", "required": true}
  ]'::jsonb,
  E'MEDIATION SETTLEMENT AGREEMENT\n\nDate: {{agreement_date}}\n\n---\n\nTHIS MEDIATION SETTLEMENT AGREEMENT ("Agreement") is made on {{agreement_date}} between:\n\n1. **{{party_1_name}}** of {{party_1_address}} ("First Party"); and\n\n2. **{{party_2_name}}** of {{party_2_address}} ("Second Party").\n\n(The First Party and the Second Party are together referred to as the "Parties".)\n\n---\n\nBACKGROUND\n\nA. The Parties have been involved in a dispute concerning {{dispute_description}} (the "Dispute").\n\nB. The Parties participated in a mediation conducted by {{mediator_name}} on {{mediation_date}} under the Alternative Dispute Resolution Act, 2010 (Act 798) of Ghana.\n\nC. The Parties have agreed to resolve the Dispute on the terms and conditions set out in this Agreement.\n\n---\n\nAGREED TERMS\n\n1. SETTLEMENT\n\n1.1 In full and final settlement of the Dispute [and all claims and counterclaims arising out of or in connection with the Dispute], the Parties agree as follows:\n\n{{settlement_terms}}\n\n2. PAYMENT\n\n2.1 {{payment_amount ? party_2_name + " shall pay " + party_1_name + " the sum of " + payment_amount + " no later than " + payment_deadline + " by " + payment_method + "." : "No monetary payment is required under this Agreement."}}\n\n2.2 Time shall be of the essence in respect of all payment obligations under this Agreement.\n\n3. FULL AND FINAL SETTLEMENT\n\n3.1 This Agreement constitutes {{full_final_settlement}}. Each Party releases and forever discharges the other Party from all actions, claims, demands, damages, and liabilities of every nature arising out of or in connection with the Dispute, whether known or unknown at the date of this Agreement.\n\n4. CONFIDENTIALITY\n\n4.1 The Parties agree to keep the terms of this Agreement and the mediation proceedings strictly confidential, save as required by law or court order.\n\n5. MEDIATOR''S ROLE\n\n5.1 This Agreement has been reached with the assistance of the mediator {{mediator_name}}. The mediator has not provided legal advice to either Party and each Party is advised to obtain independent legal advice before signing this Agreement.\n\n6. COMPLIANCE\n\n6.1 Each Party shall promptly take all steps and execute all documents necessary to give effect to this Agreement.\n\n7. BREACH\n\n7.1 In the event of breach of this Agreement, the non-defaulting Party shall be entitled to enforce this Agreement before the courts of Ghana or refer the breach to arbitration.\n\n8. GOVERNING LAW\n\n8.1 This Agreement shall be governed by and construed in accordance with the {{governing_law}}.\n\n---\n\nSIGNATURES\n\nSigned by the First Party:\n\nSignature: _________________________\nName: {{party_1_name}}\nDate: _________________________\n\nSigned by the Second Party:\n\nSignature: _________________________\nName: {{party_2_name}}\nDate: _________________________\n\nWITNESSED by the Mediator:\n\nSignature: _________________________\nName: {{mediator_name}}\nDate: _________________________'
),

-- ============================================================
-- JOINT STATEMENT OF AGREED AND DISPUTED FACTS
-- ============================================================
(
  'Arbitration — Procedure',
  'Joint Statement of Agreed and Disputed Facts',
  'joint_statement_facts',
  'ghana',
  'Ghana ADR Act 2010 (Act 798) / UNCITRAL Arbitration Rules 2021',
  '[
    {"name": "claimant_name", "label": "Claimant Name", "type": "text", "required": true},
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true},
    {"name": "case_reference", "label": "Case / Matter Reference", "type": "text", "required": false},
    {"name": "tribunal_name", "label": "Arbitral Tribunal", "type": "text", "required": false},
    {"name": "agreed_facts", "label": "Agreed Facts", "type": "textarea", "required": true, "description": "List each agreed fact on a new line, numbered"},
    {"name": "disputed_facts_claimant", "label": "Facts Asserted by Claimant (Disputed)", "type": "textarea", "required": false, "description": "Facts the Claimant asserts but the Respondent disputes"},
    {"name": "disputed_facts_respondent", "label": "Facts Asserted by Respondent (Disputed)", "type": "textarea", "required": false, "description": "Facts the Respondent asserts but the Claimant disputes"},
    {"name": "agreed_documents", "label": "Agreed Authentic Documents", "type": "textarea", "required": false, "description": "List documents whose authenticity (but not necessarily meaning) both parties accept"},
    {"name": "reservation", "label": "Reservation of Rights", "type": "select", "required": false, "options": ["Yes — include reservation clause", "No — no reservation"], "default": "Yes — include reservation clause"},
    {"name": "statement_date", "label": "Date of Statement", "type": "date", "required": true}
  ]'::jsonb,
  E'JOINT STATEMENT OF AGREED AND DISPUTED FACTS\n\nCase Reference: {{case_reference}}\nDate: {{statement_date}}\n\n---\n\n1. PARTIES AND TRIBUNAL\n\n1.1 Claimant: {{claimant_name}}\n1.2 Respondent: {{respondent_name}}\n1.3 Arbitral Tribunal: {{tribunal_name}}\n\n---\n\n2. PURPOSE\n\n2.1 This Joint Statement is submitted by the Parties to assist the Tribunal by identifying:\n\n(a) facts which both Parties agree are established;\n(b) facts which remain in dispute; and\n(c) documents whose authenticity both Parties accept.\n\n2.2 This Joint Statement does not constitute any admission by either Party beyond the facts expressly agreed herein.\n\n---\n\n3. AGREED FACTS\n\n3.1 The Parties agree that the following facts are established and do not require further proof:\n\n{{agreed_facts}}\n\n---\n\n4. DISPUTED FACTS\n\n4.1 The following facts asserted by the Claimant are disputed by the Respondent:\n\n{{disputed_facts_claimant}}\n\n4.2 The following facts asserted by the Respondent are disputed by the Claimant:\n\n{{disputed_facts_respondent}}\n\n---\n\n5. AGREED AUTHENTIC DOCUMENTS\n\n5.1 The Parties agree that the following documents are authentic (i.e., they were created as they appear), without prejudice to any dispute as to their meaning, effect, or relevance:\n\n{{agreed_documents}}\n\n---\n\n6. RESERVATION OF RIGHTS\n\n6.1 This Joint Statement is submitted without prejudice to the Parties'' respective positions on legal issues, the characterisation of the agreed facts, or any other matters in dispute in these proceedings. The Parties reserve all rights.\n\n---\n\n7. SIGNATURES\n\nFor and on behalf of the Claimant:\n\nSignature: _________________________\nName / Counsel: _________________________\nDate: _________________________\n\nFor and on behalf of the Respondent:\n\nSignature: _________________________\nName / Counsel: _________________________\nDate: _________________________'
);
