-- Seed the templates table with professional legal document templates
-- covering arbitration, contracts, dispute resolution, corporate, and litigation

INSERT INTO templates (category, title, template_type, jurisdiction, framework, variables, content) VALUES

-- ============================================================
-- ARBITRATION — INITIATION
-- ============================================================
(
  'Arbitration — Initiation',
  'Request for Arbitration',
  'arbitration_request',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "claimant_name", "label": "Claimant Name", "type": "text", "required": true, "description": "Full legal name of the claimant"},
    {"name": "claimant_address", "label": "Claimant Address", "type": "textarea", "required": true},
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true, "description": "Full legal name of the respondent"},
    {"name": "respondent_address", "label": "Respondent Address", "type": "textarea", "required": true},
    {"name": "contract_date", "label": "Date of Contract", "type": "date", "required": true},
    {"name": "contract_description", "label": "Contract Description", "type": "textarea", "required": true, "description": "Brief description of the underlying contract"},
    {"name": "dispute_summary", "label": "Summary of Dispute", "type": "textarea", "required": true},
    {"name": "amount_claimed", "label": "Amount Claimed", "type": "text", "required": false, "description": "Total monetary amount claimed (if applicable)"},
    {"name": "relief_sought", "label": "Relief Sought", "type": "textarea", "required": true},
    {"name": "arbitration_clause", "label": "Arbitration Clause Text", "type": "textarea", "required": false, "description": "Text of the arbitration agreement or clause"},
    {"name": "num_arbitrators", "label": "Number of Arbitrators", "type": "select", "required": true, "options": ["1", "3"], "default": "1"},
    {"name": "seat_of_arbitration", "label": "Seat of Arbitration", "type": "text", "required": false, "default": "Accra, Ghana"},
    {"name": "language", "label": "Language of Arbitration", "type": "text", "required": false, "default": "English"}
  ]'::jsonb,
  E'REQUEST FOR ARBITRATION\n\nDate: [DATE]\n\nTo: [ARBITRAL INSTITUTION / AD HOC]\n\n1. PARTIES\n\n1.1 Claimant:\n{{claimant_name}}\n{{claimant_address}}\n\n1.2 Respondent:\n{{respondent_name}}\n{{respondent_address}}\n\n2. ARBITRATION AGREEMENT\n\nThis Request for Arbitration is submitted pursuant to the arbitration clause contained in the agreement dated {{contract_date}} between the Claimant and the Respondent.\n\n{{arbitration_clause}}\n\n3. DESCRIPTION OF THE CONTRACT\n\n{{contract_description}}\n\n4. SUMMARY OF THE DISPUTE\n\n{{dispute_summary}}\n\n5. CLAIMS AND RELIEF SOUGHT\n\nThe Claimant claims the sum of {{amount_claimed}} and seeks the following relief:\n\n{{relief_sought}}\n\n6. PROPOSED PROCEDURAL ARRANGEMENTS\n\n6.1 Number of Arbitrators: {{num_arbitrators}}\n6.2 Seat of Arbitration: {{seat_of_arbitration}}\n6.3 Language of Arbitration: {{language}}\n\n7. APPLICABLE LAW\n\nThe substantive law governing the dispute is the law of Ghana. The arbitration shall be conducted in accordance with the Alternative Dispute Resolution Act, 2010 (Act 798).\n\nRespectfully submitted,\n\n________________________\nCounsel for the Claimant'
),

(
  'Arbitration — Initiation',
  'Notice of Arbitration (UNCITRAL)',
  'notice_of_arbitration',
  'international',
  'UNCITRAL Arbitration Rules 2021',
  '[
    {"name": "claimant_name", "label": "Claimant Name", "type": "text", "required": true},
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true},
    {"name": "claimant_address", "label": "Claimant Address", "type": "textarea", "required": true},
    {"name": "respondent_address", "label": "Respondent Address", "type": "textarea", "required": true},
    {"name": "arbitration_agreement_ref", "label": "Reference to Arbitration Agreement", "type": "textarea", "required": true, "description": "Identify the contract and arbitration clause"},
    {"name": "nature_of_dispute", "label": "Nature of the Dispute", "type": "textarea", "required": true},
    {"name": "amount_claimed", "label": "Amount Claimed", "type": "text", "required": false},
    {"name": "relief_sought", "label": "Relief Sought", "type": "textarea", "required": true},
    {"name": "num_arbitrators", "label": "Number of Arbitrators", "type": "select", "required": true, "options": ["1", "3"], "default": "3"},
    {"name": "seat_of_arbitration", "label": "Seat of Arbitration", "type": "text", "required": true},
    {"name": "language", "label": "Language", "type": "text", "default": "English"},
    {"name": "applicable_law", "label": "Applicable Substantive Law", "type": "text", "required": false}
  ]'::jsonb,
  E'NOTICE OF ARBITRATION\nPursuant to Article 3 of the UNCITRAL Arbitration Rules (2021)\n\nDate: [DATE]\n\n1. PARTIES\n\nClaimant: {{claimant_name}}\nAddress: {{claimant_address}}\n\nRespondent: {{respondent_name}}\nAddress: {{respondent_address}}\n\n2. ARBITRATION AGREEMENT\n\n{{arbitration_agreement_ref}}\n\n3. NATURE OF THE DISPUTE\n\n{{nature_of_dispute}}\n\n4. RELIEF SOUGHT\n\n{{relief_sought}}\n\n{{amount_claimed}}\n\n5. PROPOSAL AS TO NUMBER OF ARBITRATORS\n\nThe Claimant proposes that the arbitral tribunal consist of {{num_arbitrators}} arbitrator(s) in accordance with Article 7 of the UNCITRAL Arbitration Rules.\n\n6. SEAT AND LANGUAGE\n\nSeat of Arbitration: {{seat_of_arbitration}}\nLanguage of Arbitration: {{language}}\n\n7. APPLICABLE LAW\n\n{{applicable_law}}\n\nRespectfully submitted,\n\n________________________\nCounsel for the Claimant'
),

(
  'Arbitration — Initiation',
  'Response to Request for Arbitration',
  'arbitration_response',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true},
    {"name": "claimant_name", "label": "Claimant Name", "type": "text", "required": true},
    {"name": "case_reference", "label": "Case Reference Number", "type": "text", "required": false},
    {"name": "response_to_claims", "label": "Response to Claims", "type": "textarea", "required": true, "description": "Respondent''s position on each claim"},
    {"name": "counterclaim", "label": "Counterclaim (if any)", "type": "textarea", "required": false},
    {"name": "objections", "label": "Jurisdictional Objections", "type": "textarea", "required": false, "description": "Any objections to jurisdiction or admissibility"},
    {"name": "num_arbitrators", "label": "Number of Arbitrators", "type": "select", "required": true, "options": ["1", "3"], "default": "1"},
    {"name": "nominated_arbitrator", "label": "Nominated Arbitrator", "type": "text", "required": false}
  ]'::jsonb,
  E'RESPONSE TO REQUEST FOR ARBITRATION\n\nCase Reference: {{case_reference}}\nDate: [DATE]\n\n1. PARTIES\n\nRespondent: {{respondent_name}}\nClaimant: {{claimant_name}}\n\n2. RESPONSE TO CLAIMS\n\n{{response_to_claims}}\n\n3. JURISDICTIONAL OBJECTIONS\n\n{{objections}}\n\n4. COUNTERCLAIM\n\n{{counterclaim}}\n\n5. PROCEDURAL PROPOSALS\n\n5.1 Number of Arbitrators: {{num_arbitrators}}\n5.2 Nominated Arbitrator: {{nominated_arbitrator}}\n\nRespectfully submitted,\n\n________________________\nCounsel for the Respondent'
),

-- ============================================================
-- ARBITRATION — PLEADINGS
-- ============================================================
(
  'Arbitration — Pleadings',
  'Statement of Claim',
  'statement_of_claim',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "claimant_name", "label": "Claimant Name", "type": "text", "required": true},
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true},
    {"name": "case_reference", "label": "Case Reference", "type": "text", "required": false},
    {"name": "factual_background", "label": "Factual Background", "type": "textarea", "required": true, "description": "Detailed statement of facts"},
    {"name": "legal_basis", "label": "Legal Basis for Claims", "type": "textarea", "required": true, "description": "Legal arguments and authorities relied upon"},
    {"name": "damages_calculation", "label": "Damages / Quantum", "type": "textarea", "required": false, "description": "Breakdown of damages claimed"},
    {"name": "relief_sought", "label": "Relief Sought", "type": "textarea", "required": true},
    {"name": "witness_list", "label": "Witnesses", "type": "textarea", "required": false, "description": "Names and topics of witness testimony"},
    {"name": "exhibits_list", "label": "Exhibits List", "type": "textarea", "required": false}
  ]'::jsonb,
  E'STATEMENT OF CLAIM\n\nCase Reference: {{case_reference}}\n\n{{claimant_name}} (Claimant)\nv.\n{{respondent_name}} (Respondent)\n\n1. INTRODUCTION\n\n[To be completed by AI based on facts provided]\n\n2. FACTUAL BACKGROUND\n\n{{factual_background}}\n\n3. LEGAL BASIS\n\n{{legal_basis}}\n\n4. DAMAGES AND QUANTUM\n\n{{damages_calculation}}\n\n5. RELIEF SOUGHT\n\nThe Claimant respectfully requests the Tribunal to:\n\n{{relief_sought}}\n\n6. WITNESSES\n\n{{witness_list}}\n\n7. LIST OF EXHIBITS\n\n{{exhibits_list}}\n\nRespectfully submitted,\n\n________________________\nCounsel for the Claimant'
),

(
  'Arbitration — Pleadings',
  'Statement of Defence',
  'statement_of_defence',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true},
    {"name": "claimant_name", "label": "Claimant Name", "type": "text", "required": true},
    {"name": "case_reference", "label": "Case Reference", "type": "text", "required": false},
    {"name": "response_to_facts", "label": "Response to Claimant''s Facts", "type": "textarea", "required": true, "description": "Admit, deny, or state no knowledge of each factual allegation"},
    {"name": "legal_defence", "label": "Legal Defence", "type": "textarea", "required": true},
    {"name": "counterclaim_facts", "label": "Counterclaim Facts (if any)", "type": "textarea", "required": false},
    {"name": "counterclaim_relief", "label": "Counterclaim Relief (if any)", "type": "textarea", "required": false},
    {"name": "relief_sought", "label": "Relief Sought by Respondent", "type": "textarea", "required": true}
  ]'::jsonb,
  E'STATEMENT OF DEFENCE\n\nCase Reference: {{case_reference}}\n\n{{claimant_name}} (Claimant)\nv.\n{{respondent_name}} (Respondent)\n\n1. INTRODUCTION\n\n[To be completed by AI]\n\n2. RESPONSE TO CLAIMANT''S FACTUAL ALLEGATIONS\n\n{{response_to_facts}}\n\n3. LEGAL DEFENCE\n\n{{legal_defence}}\n\n4. COUNTERCLAIM\n\n{{counterclaim_facts}}\n\n{{counterclaim_relief}}\n\n5. RELIEF SOUGHT\n\n{{relief_sought}}\n\nRespectfully submitted,\n\n________________________\nCounsel for the Respondent'
),

-- ============================================================
-- ARBITRATION — PROCEDURE
-- ============================================================
(
  'Arbitration — Procedure',
  'Procedural Order No. 1',
  'procedural_order_1',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "case_reference", "label": "Case Reference", "type": "text", "required": true},
    {"name": "claimant_name", "label": "Claimant", "type": "text", "required": true},
    {"name": "respondent_name", "label": "Respondent", "type": "text", "required": true},
    {"name": "arbitrator_names", "label": "Arbitrator(s)", "type": "textarea", "required": true, "description": "Names and roles of arbitrator(s)"},
    {"name": "seat", "label": "Seat of Arbitration", "type": "text", "default": "Accra, Ghana"},
    {"name": "language", "label": "Language", "type": "text", "default": "English"},
    {"name": "applicable_law", "label": "Applicable Substantive Law", "type": "text", "default": "Laws of Ghana"},
    {"name": "procedural_rules", "label": "Procedural Rules", "type": "text", "default": "Ghana ADR Act 2010 (Act 798)"},
    {"name": "statement_of_claim_deadline", "label": "Statement of Claim Deadline", "type": "date", "required": true},
    {"name": "statement_of_defence_deadline", "label": "Statement of Defence Deadline", "type": "date", "required": true},
    {"name": "document_production_deadline", "label": "Document Production Deadline", "type": "date", "required": false},
    {"name": "hearing_date", "label": "Hearing Date", "type": "date", "required": false}
  ]'::jsonb,
  E'PROCEDURAL ORDER NO. 1\n\nCase Reference: {{case_reference}}\n\n{{claimant_name}} (Claimant)\nv.\n{{respondent_name}} (Respondent)\n\nArbitral Tribunal: {{arbitrator_names}}\n\n1. CONSTITUTION OF THE TRIBUNAL\n\n[To be completed by AI]\n\n2. SEAT AND LANGUAGE\n\nSeat: {{seat}}\nLanguage: {{language}}\n\n3. APPLICABLE LAW\n\nSubstantive Law: {{applicable_law}}\nProcedural Rules: {{procedural_rules}}\n\n4. PROCEDURAL TIMETABLE\n\n4.1 Statement of Claim: {{statement_of_claim_deadline}}\n4.2 Statement of Defence: {{statement_of_defence_deadline}}\n4.3 Document Production: {{document_production_deadline}}\n4.4 Hearing: {{hearing_date}}\n\n5. GENERAL PROCEDURAL DIRECTIONS\n\n[To be completed by AI with standard procedural directions]\n\nSigned,\n\n________________________\nThe Arbitral Tribunal'
),

(
  'Arbitration — Procedure',
  'Application for Interim Measures',
  'interim_measures',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "applicant_name", "label": "Applicant Name", "type": "text", "required": true},
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true},
    {"name": "case_reference", "label": "Case Reference", "type": "text", "required": false},
    {"name": "measure_sought", "label": "Interim Measure Sought", "type": "textarea", "required": true, "description": "Describe the specific interim relief requested"},
    {"name": "grounds", "label": "Grounds for Application", "type": "textarea", "required": true, "description": "Why the measure is necessary and urgent"},
    {"name": "harm_if_denied", "label": "Harm if Measure Not Granted", "type": "textarea", "required": true},
    {"name": "undertaking_in_damages", "label": "Undertaking in Damages", "type": "select", "options": ["Yes, applicant provides undertaking", "No undertaking offered"], "default": "Yes, applicant provides undertaking"}
  ]'::jsonb,
  E'APPLICATION FOR INTERIM MEASURES\n\nCase Reference: {{case_reference}}\n\nApplicant: {{applicant_name}}\nRespondent: {{respondent_name}}\n\n1. INTERIM MEASURE SOUGHT\n\n{{measure_sought}}\n\n2. GROUNDS\n\n{{grounds}}\n\n3. URGENCY AND IRREPARABLE HARM\n\n{{harm_if_denied}}\n\n4. UNDERTAKING IN DAMAGES\n\n{{undertaking_in_damages}}\n\n5. LEGAL BASIS\n\n[To be completed by AI citing applicable provisions of the Ghana ADR Act 2010 and relevant case law]\n\nRespectfully submitted,\n\n________________________\nCounsel for the Applicant'
),

-- ============================================================
-- ARBITRATION — AWARDS
-- ============================================================
(
  'Arbitration — Awards',
  'Final Arbitral Award',
  'final_award',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "case_reference", "label": "Case Reference", "type": "text", "required": true},
    {"name": "claimant_name", "label": "Claimant", "type": "text", "required": true},
    {"name": "respondent_name", "label": "Respondent", "type": "text", "required": true},
    {"name": "arbitrator_names", "label": "Arbitral Tribunal", "type": "textarea", "required": true},
    {"name": "seat", "label": "Seat", "type": "text", "default": "Accra, Ghana"},
    {"name": "summary_of_dispute", "label": "Summary of the Dispute", "type": "textarea", "required": true},
    {"name": "claimant_position", "label": "Claimant''s Position", "type": "textarea", "required": true},
    {"name": "respondent_position", "label": "Respondent''s Position", "type": "textarea", "required": true},
    {"name": "tribunal_findings", "label": "Key Findings", "type": "textarea", "required": true},
    {"name": "award_amount", "label": "Award Amount", "type": "text", "required": false},
    {"name": "costs_allocation", "label": "Costs Allocation", "type": "textarea", "required": false}
  ]'::jsonb,
  E'FINAL ARBITRAL AWARD\n\nCase Reference: {{case_reference}}\n\n{{claimant_name}} (Claimant)\nv.\n{{respondent_name}} (Respondent)\n\nArbitral Tribunal: {{arbitrator_names}}\nSeat of Arbitration: {{seat}}\n\n1. PROCEDURAL HISTORY\n\n[To be completed by AI]\n\n2. SUMMARY OF THE DISPUTE\n\n{{summary_of_dispute}}\n\n3. CLAIMANT''S POSITION\n\n{{claimant_position}}\n\n4. RESPONDENT''S POSITION\n\n{{respondent_position}}\n\n5. TRIBUNAL''S ANALYSIS AND FINDINGS\n\n{{tribunal_findings}}\n\n6. AWARD\n\nFor the reasons set forth above, the Tribunal AWARDS as follows:\n\n{{award_amount}}\n\n7. COSTS\n\n{{costs_allocation}}\n\nDated: [DATE]\nSeat: {{seat}}\n\n________________________\nThe Arbitral Tribunal'
),

-- ============================================================
-- CONTRACTS — COMMERCIAL
-- ============================================================
(
  'Contracts — Commercial',
  'Non-Disclosure Agreement (NDA)',
  'nda',
  'ghana',
  'Common Law / Ghana Contract Law',
  '[
    {"name": "disclosing_party", "label": "Disclosing Party", "type": "text", "required": true},
    {"name": "receiving_party", "label": "Receiving Party", "type": "text", "required": true},
    {"name": "purpose", "label": "Purpose of Disclosure", "type": "textarea", "required": true, "description": "Why confidential information is being shared"},
    {"name": "duration_years", "label": "Duration (Years)", "type": "select", "required": true, "options": ["1", "2", "3", "5"], "default": "2"},
    {"name": "governing_law", "label": "Governing Law", "type": "text", "default": "Laws of Ghana"},
    {"name": "mutual", "label": "Type", "type": "select", "required": true, "options": ["Mutual (both parties)", "One-way (disclosing to receiving)"], "default": "Mutual (both parties)"}
  ]'::jsonb,
  E'NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement ("Agreement") is entered into as of [DATE] between:\n\nDisclosing Party: {{disclosing_party}}\nReceiving Party: {{receiving_party}}\n\nType: {{mutual}}\n\n1. PURPOSE\n\n{{purpose}}\n\n2. DEFINITION OF CONFIDENTIAL INFORMATION\n\n[To be completed by AI]\n\n3. OBLIGATIONS\n\n[To be completed by AI]\n\n4. TERM\n\nThis Agreement shall remain in effect for {{duration_years}} years from the date hereof.\n\n5. GOVERNING LAW\n\n{{governing_law}}\n\n[AI to complete with standard NDA provisions]'
),

(
  'Contracts — Commercial',
  'Service Agreement',
  'service_agreement',
  'ghana',
  'Common Law / Ghana Contract Law',
  '[
    {"name": "client_name", "label": "Client Name", "type": "text", "required": true},
    {"name": "provider_name", "label": "Service Provider Name", "type": "text", "required": true},
    {"name": "services_description", "label": "Description of Services", "type": "textarea", "required": true},
    {"name": "compensation", "label": "Compensation / Fee", "type": "text", "required": true},
    {"name": "payment_terms", "label": "Payment Terms", "type": "select", "options": ["Monthly in arrears", "Quarterly in advance", "Upon completion", "50% upfront, 50% on completion", "Custom"], "default": "Monthly in arrears"},
    {"name": "commencement_date", "label": "Commencement Date", "type": "date", "required": true},
    {"name": "term", "label": "Term / Duration", "type": "text", "required": true, "description": "e.g., 12 months, indefinite with 30-day notice"},
    {"name": "governing_law", "label": "Governing Law", "type": "text", "default": "Laws of Ghana"}
  ]'::jsonb,
  E'SERVICE AGREEMENT\n\nThis Service Agreement ("Agreement") is entered into as of {{commencement_date}} between:\n\nClient: {{client_name}}\nService Provider: {{provider_name}}\n\n1. SERVICES\n\n{{services_description}}\n\n2. COMPENSATION\n\nFee: {{compensation}}\nPayment Terms: {{payment_terms}}\n\n3. TERM\n\n{{term}}\n\n4. GOVERNING LAW\n\n{{governing_law}}\n\n[AI to complete with standard service agreement provisions including warranties, limitation of liability, termination, confidentiality, and dispute resolution]'
),

(
  'Contracts — Commercial',
  'Sales / Supply Agreement',
  'sales_agreement',
  'ghana',
  'Sale of Goods Act 1962 (Act 137)',
  '[
    {"name": "seller_name", "label": "Seller Name", "type": "text", "required": true},
    {"name": "buyer_name", "label": "Buyer Name", "type": "text", "required": true},
    {"name": "goods_description", "label": "Description of Goods", "type": "textarea", "required": true},
    {"name": "quantity", "label": "Quantity", "type": "text", "required": true},
    {"name": "price", "label": "Price", "type": "text", "required": true},
    {"name": "delivery_terms", "label": "Delivery Terms", "type": "select", "options": ["Ex Works", "FOB", "CIF", "DDP", "Custom"], "default": "FOB"},
    {"name": "delivery_date", "label": "Delivery Date", "type": "date", "required": false},
    {"name": "payment_terms", "label": "Payment Terms", "type": "text", "default": "Net 30 days from invoice"},
    {"name": "warranty_period", "label": "Warranty Period", "type": "text", "default": "12 months"}
  ]'::jsonb,
  E'SALE / SUPPLY AGREEMENT\n\nThis Agreement is entered into as of [DATE] between:\n\nSeller: {{seller_name}}\nBuyer: {{buyer_name}}\n\n1. GOODS\n\n{{goods_description}}\nQuantity: {{quantity}}\n\n2. PRICE AND PAYMENT\n\nPrice: {{price}}\nPayment Terms: {{payment_terms}}\n\n3. DELIVERY\n\nTerms: {{delivery_terms}}\nDate: {{delivery_date}}\n\n4. WARRANTY\n\n{{warranty_period}}\n\n[AI to complete with standard sale of goods provisions under Ghanaian law including inspection, acceptance, risk transfer, limitation of liability, and dispute resolution]'
),

(
  'Contracts — Commercial',
  'Joint Venture Agreement',
  'joint_venture',
  'ghana',
  'Common Law / Ghana Contract Law',
  '[
    {"name": "party_a_name", "label": "Party A Name", "type": "text", "required": true},
    {"name": "party_b_name", "label": "Party B Name", "type": "text", "required": true},
    {"name": "jv_purpose", "label": "Purpose of Joint Venture", "type": "textarea", "required": true},
    {"name": "contributions", "label": "Contributions of Each Party", "type": "textarea", "required": true, "description": "Capital, assets, expertise, or other contributions"},
    {"name": "profit_sharing", "label": "Profit/Loss Sharing Ratio", "type": "text", "required": true, "default": "50:50"},
    {"name": "management_structure", "label": "Management Structure", "type": "textarea", "required": false, "description": "How the JV will be managed"},
    {"name": "duration", "label": "Duration", "type": "text", "required": true},
    {"name": "governing_law", "label": "Governing Law", "type": "text", "default": "Laws of Ghana"}
  ]'::jsonb,
  E'JOINT VENTURE AGREEMENT\n\nThis Joint Venture Agreement ("Agreement") is entered into as of [DATE] between:\n\nParty A: {{party_a_name}}\nParty B: {{party_b_name}}\n\n1. PURPOSE\n\n{{jv_purpose}}\n\n2. CONTRIBUTIONS\n\n{{contributions}}\n\n3. PROFIT AND LOSS SHARING\n\n{{profit_sharing}}\n\n4. MANAGEMENT\n\n{{management_structure}}\n\n5. DURATION\n\n{{duration}}\n\n6. GOVERNING LAW\n\n{{governing_law}}\n\n[AI to complete with standard JV provisions including decision-making, deadlock resolution, intellectual property, confidentiality, termination, and dispute resolution]'
),

-- ============================================================
-- CONTRACTS — EMPLOYMENT
-- ============================================================
(
  'Contracts — Employment',
  'Employment Contract',
  'employment_contract',
  'ghana',
  'Labour Act 2003 (Act 651)',
  '[
    {"name": "employer_name", "label": "Employer Name", "type": "text", "required": true},
    {"name": "employee_name", "label": "Employee Name", "type": "text", "required": true},
    {"name": "position", "label": "Position / Job Title", "type": "text", "required": true},
    {"name": "start_date", "label": "Start Date", "type": "date", "required": true},
    {"name": "salary", "label": "Monthly Salary (GHS)", "type": "text", "required": true},
    {"name": "probation_period", "label": "Probation Period", "type": "select", "options": ["3 months", "6 months", "None"], "default": "3 months"},
    {"name": "working_hours", "label": "Working Hours", "type": "text", "default": "8:00 AM to 5:00 PM, Monday to Friday"},
    {"name": "annual_leave", "label": "Annual Leave (Days)", "type": "number", "default": "15"},
    {"name": "notice_period", "label": "Notice Period", "type": "select", "options": ["1 month", "2 months", "3 months"], "default": "1 month"},
    {"name": "job_description", "label": "Key Responsibilities", "type": "textarea", "required": true}
  ]'::jsonb,
  E'EMPLOYMENT CONTRACT\n\nThis Employment Contract is entered into as of {{start_date}} between:\n\nEmployer: {{employer_name}}\nEmployee: {{employee_name}}\n\n1. POSITION\n\n{{position}}\n\n2. KEY RESPONSIBILITIES\n\n{{job_description}}\n\n3. REMUNERATION\n\nMonthly Salary: GHS {{salary}}\n\n4. WORKING HOURS\n\n{{working_hours}}\n\n5. PROBATION\n\n{{probation_period}}\n\n6. LEAVE\n\nAnnual Leave: {{annual_leave}} working days\n\n7. NOTICE PERIOD\n\n{{notice_period}}\n\n[AI to complete with provisions compliant with Ghana Labour Act 2003 (Act 651) including social security (SSNIT), termination, disciplinary procedures, confidentiality, and dispute resolution]'
),

-- ============================================================
-- CONTRACTS — PROPERTY
-- ============================================================
(
  'Contracts — Property',
  'Lease Agreement',
  'lease_agreement',
  'ghana',
  'Common Law / Conveyancing Decree 1973',
  '[
    {"name": "landlord_name", "label": "Landlord Name", "type": "text", "required": true},
    {"name": "tenant_name", "label": "Tenant Name", "type": "text", "required": true},
    {"name": "property_description", "label": "Property Description", "type": "textarea", "required": true, "description": "Address and description of the premises"},
    {"name": "monthly_rent", "label": "Monthly Rent", "type": "text", "required": true},
    {"name": "rent_advance", "label": "Rent Advance Required", "type": "select", "options": ["1 month", "3 months", "6 months", "12 months", "24 months"], "default": "12 months"},
    {"name": "lease_term", "label": "Lease Term", "type": "select", "options": ["1 year", "2 years", "3 years", "5 years"], "default": "2 years"},
    {"name": "commencement_date", "label": "Commencement Date", "type": "date", "required": true},
    {"name": "permitted_use", "label": "Permitted Use", "type": "select", "options": ["Residential", "Commercial", "Office", "Mixed Use"], "default": "Residential"},
    {"name": "security_deposit", "label": "Security Deposit", "type": "text", "required": false}
  ]'::jsonb,
  E'LEASE AGREEMENT\n\nThis Lease Agreement is entered into as of {{commencement_date}} between:\n\nLandlord: {{landlord_name}}\nTenant: {{tenant_name}}\n\n1. PREMISES\n\n{{property_description}}\n\n2. TERM\n\n{{lease_term}} commencing {{commencement_date}}\n\n3. RENT\n\nMonthly Rent: {{monthly_rent}}\nRent Advance: {{rent_advance}}\nSecurity Deposit: {{security_deposit}}\n\n4. PERMITTED USE\n\n{{permitted_use}}\n\n[AI to complete with standard lease provisions under Ghanaian law including maintenance obligations, insurance, assignment/subletting, termination, rent review, and dispute resolution. Note: Ghana Rent Act 1963 (Act 220) caps residential rent advance at 6 months per the Rent Control Department guidelines]'
),

-- ============================================================
-- DISPUTE RESOLUTION
-- ============================================================
(
  'Dispute Resolution',
  'Mediation Agreement',
  'mediation_agreement',
  'ghana',
  'Ghana ADR Act 2010 (Act 798)',
  '[
    {"name": "party_a_name", "label": "Party A Name", "type": "text", "required": true},
    {"name": "party_b_name", "label": "Party B Name", "type": "text", "required": true},
    {"name": "dispute_description", "label": "Description of Dispute", "type": "textarea", "required": true},
    {"name": "mediator_name", "label": "Mediator Name", "type": "text", "required": false},
    {"name": "mediation_venue", "label": "Venue", "type": "text", "default": "Accra, Ghana"},
    {"name": "costs_sharing", "label": "Costs Sharing", "type": "select", "options": ["Equally shared", "Party A bears costs", "Party B bears costs", "As agreed by mediator"], "default": "Equally shared"},
    {"name": "confidentiality", "label": "Confidentiality", "type": "select", "options": ["Strictly confidential", "Confidential with exceptions"], "default": "Strictly confidential"}
  ]'::jsonb,
  E'MEDIATION AGREEMENT\n\nThis Mediation Agreement is entered into as of [DATE] between:\n\nParty A: {{party_a_name}}\nParty B: {{party_b_name}}\n\nMediator: {{mediator_name}}\n\n1. DISPUTE\n\n{{dispute_description}}\n\n2. VENUE\n\n{{mediation_venue}}\n\n3. COSTS\n\n{{costs_sharing}}\n\n4. CONFIDENTIALITY\n\n{{confidentiality}}\n\n[AI to complete with standard mediation provisions under the Ghana ADR Act 2010 including role of mediator, good faith participation, settlement authority, enforceability of settlement, and termination of mediation]'
),

(
  'Dispute Resolution',
  'Settlement Agreement',
  'settlement_agreement',
  'ghana',
  'Common Law / Ghana ADR Act 2010',
  '[
    {"name": "party_a_name", "label": "Party A Name", "type": "text", "required": true},
    {"name": "party_b_name", "label": "Party B Name", "type": "text", "required": true},
    {"name": "dispute_background", "label": "Background of Dispute", "type": "textarea", "required": true},
    {"name": "settlement_terms", "label": "Settlement Terms", "type": "textarea", "required": true, "description": "Key terms agreed by the parties"},
    {"name": "payment_amount", "label": "Settlement Amount", "type": "text", "required": false},
    {"name": "payment_schedule", "label": "Payment Schedule", "type": "textarea", "required": false},
    {"name": "mutual_release", "label": "Mutual Release", "type": "select", "options": ["Full mutual release", "Partial release (specify)"], "default": "Full mutual release"},
    {"name": "confidentiality", "label": "Confidentiality of Settlement", "type": "select", "options": ["Confidential", "Non-confidential"], "default": "Confidential"}
  ]'::jsonb,
  E'SETTLEMENT AGREEMENT\n\nThis Settlement Agreement ("Agreement") is entered into as of [DATE] between:\n\nParty A: {{party_a_name}}\nParty B: {{party_b_name}}\n\n1. BACKGROUND\n\n{{dispute_background}}\n\n2. SETTLEMENT TERMS\n\n{{settlement_terms}}\n\n3. PAYMENT\n\nAmount: {{payment_amount}}\nSchedule: {{payment_schedule}}\n\n4. RELEASE\n\n{{mutual_release}}\n\n5. CONFIDENTIALITY\n\n{{confidentiality}}\n\n[AI to complete with standard settlement provisions including representations and warranties, indemnification, non-admission of liability, enforcement, and governing law]'
),

-- ============================================================
-- CORPORATE
-- ============================================================
(
  'Corporate',
  'Board Resolution',
  'board_resolution',
  'ghana',
  'Companies Act 2019 (Act 992)',
  '[
    {"name": "company_name", "label": "Company Name", "type": "text", "required": true},
    {"name": "meeting_date", "label": "Meeting Date", "type": "date", "required": true},
    {"name": "meeting_type", "label": "Meeting Type", "type": "select", "options": ["Regular Board Meeting", "Special Board Meeting", "Written Resolution"], "default": "Regular Board Meeting"},
    {"name": "directors_present", "label": "Directors Present", "type": "textarea", "required": true},
    {"name": "resolution_subject", "label": "Subject of Resolution", "type": "text", "required": true},
    {"name": "resolution_details", "label": "Resolution Details", "type": "textarea", "required": true, "description": "Full text or summary of what is being resolved"},
    {"name": "chairman_name", "label": "Chairman Name", "type": "text", "required": true}
  ]'::jsonb,
  E'BOARD RESOLUTION\n\n{{company_name}}\n(Incorporated under the Companies Act, 2019 (Act 992))\n\nMeeting Type: {{meeting_type}}\nDate: {{meeting_date}}\n\nDirectors Present:\n{{directors_present}}\n\nChairman: {{chairman_name}}\n\nRESOLUTION: {{resolution_subject}}\n\n{{resolution_details}}\n\n[AI to complete with proper corporate resolution format, voting record, and compliance with Companies Act 2019]'
),

(
  'Corporate',
  'Shareholders Agreement',
  'shareholders_agreement',
  'ghana',
  'Companies Act 2019 (Act 992)',
  '[
    {"name": "company_name", "label": "Company Name", "type": "text", "required": true},
    {"name": "shareholders", "label": "Shareholders and Shareholdings", "type": "textarea", "required": true, "description": "List each shareholder with their shareholding percentage"},
    {"name": "business_purpose", "label": "Business Purpose", "type": "textarea", "required": true},
    {"name": "board_composition", "label": "Board Composition", "type": "textarea", "required": false, "description": "How directors are nominated"},
    {"name": "dividend_policy", "label": "Dividend Policy", "type": "textarea", "required": false},
    {"name": "transfer_restrictions", "label": "Share Transfer Restrictions", "type": "select", "options": ["Right of first refusal", "Tag-along and drag-along", "Board approval required", "No restrictions"], "default": "Right of first refusal"},
    {"name": "deadlock_mechanism", "label": "Deadlock Resolution", "type": "select", "options": ["Mediation then arbitration", "Russian roulette (buy/sell)", "Chairman casting vote", "Expert determination"], "default": "Mediation then arbitration"},
    {"name": "governing_law", "label": "Governing Law", "type": "text", "default": "Laws of Ghana"}
  ]'::jsonb,
  E'SHAREHOLDERS AGREEMENT\n\nThis Shareholders Agreement is entered into as of [DATE] in respect of:\n\nCompany: {{company_name}}\n\nShareholders:\n{{shareholders}}\n\n1. BUSINESS PURPOSE\n\n{{business_purpose}}\n\n2. BOARD COMPOSITION\n\n{{board_composition}}\n\n3. SHARE TRANSFERS\n\n{{transfer_restrictions}}\n\n4. DIVIDENDS\n\n{{dividend_policy}}\n\n5. DEADLOCK\n\n{{deadlock_mechanism}}\n\n6. GOVERNING LAW\n\n{{governing_law}}\n\n[AI to complete with standard shareholders agreement provisions under Ghana Companies Act 2019 including reserved matters, information rights, anti-dilution, exit provisions, non-compete, confidentiality, and dispute resolution]'
),

-- ============================================================
-- LITIGATION
-- ============================================================
(
  'Litigation',
  'Legal Opinion / Memorandum',
  'legal_opinion',
  'ghana',
  'Common Law',
  '[
    {"name": "client_name", "label": "Client Name", "type": "text", "required": true},
    {"name": "matter_description", "label": "Matter Description", "type": "text", "required": true},
    {"name": "questions_presented", "label": "Questions Presented", "type": "textarea", "required": true, "description": "The specific legal questions to be addressed"},
    {"name": "facts", "label": "Relevant Facts", "type": "textarea", "required": true},
    {"name": "jurisdiction", "label": "Jurisdiction", "type": "text", "default": "Ghana"},
    {"name": "confidentiality_notice", "label": "Confidentiality", "type": "select", "options": ["Privileged and Confidential", "For internal use only", "May be shared with third parties"], "default": "Privileged and Confidential"}
  ]'::jsonb,
  E'LEGAL OPINION\n\n{{confidentiality_notice}}\n\nTo: {{client_name}}\nRe: {{matter_description}}\nDate: [DATE]\nJurisdiction: {{jurisdiction}}\n\n1. QUESTIONS PRESENTED\n\n{{questions_presented}}\n\n2. BRIEF ANSWER\n\n[To be completed by AI]\n\n3. FACTS\n\n{{facts}}\n\n4. ANALYSIS\n\n[To be completed by AI with detailed legal analysis, citing relevant Ghanaian statutes, case law, and legal principles]\n\n5. CONCLUSION AND RECOMMENDATIONS\n\n[To be completed by AI]\n\nDisclaimer: This opinion is based on the facts as presented and the law as at the date hereof. It should not be relied upon for any purpose other than that for which it was prepared.'
),

(
  'Litigation',
  'Demand Letter / Letter Before Action',
  'demand_letter',
  'ghana',
  'Common Law',
  '[
    {"name": "sender_name", "label": "Sender (Law Firm / Lawyer)", "type": "text", "required": true},
    {"name": "recipient_name", "label": "Recipient Name", "type": "text", "required": true},
    {"name": "recipient_address", "label": "Recipient Address", "type": "textarea", "required": true},
    {"name": "client_name", "label": "Client Name", "type": "text", "required": true},
    {"name": "claim_description", "label": "Description of Claim", "type": "textarea", "required": true},
    {"name": "amount_demanded", "label": "Amount Demanded", "type": "text", "required": false},
    {"name": "deadline_days", "label": "Response Deadline (Days)", "type": "select", "options": ["7", "14", "21", "30"], "default": "14"},
    {"name": "consequences", "label": "Consequences of Non-Compliance", "type": "textarea", "required": false, "default": "We shall have no option but to institute legal proceedings without further notice, and shall seek costs and interest."}
  ]'::jsonb,
  E'[LETTERHEAD]\n\n{{sender_name}}\n\nDate: [DATE]\n\nBY HAND / REGISTERED POST / EMAIL\n\n{{recipient_name}}\n{{recipient_address}}\n\nDear Sir/Madam,\n\nRE: {{client_name}} — DEMAND / LETTER BEFORE ACTION\n\nWe act for and on behalf of our client, {{client_name}}, and write on their express instructions.\n\n{{claim_description}}\n\nAmount Due: {{amount_demanded}}\n\nWe hereby demand that you {{amount_demanded}} within {{deadline_days}} days of the date of this letter.\n\n{{consequences}}\n\n[AI to complete with proper legal demand letter format, citing any relevant legal basis, and including appropriate closing]\n\nYours faithfully,\n\n________________________\n{{sender_name}}'
);
