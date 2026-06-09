-- Add Terms of Reference template to the templates library

INSERT INTO templates (category, title, template_type, jurisdiction, framework, variables, content) VALUES
(
  'Arbitration — Procedure',
  'Terms of Reference',
  'terms_of_reference',
  'ghana',
  'Ghana ADR Act 2010 (Act 798) / UNCITRAL',
  '[
    {"name": "claimant_name", "label": "Claimant Name", "type": "text", "required": true},
    {"name": "claimant_address", "label": "Claimant Address", "type": "textarea", "required": true},
    {"name": "claimant_counsel", "label": "Claimant Counsel", "type": "text", "required": false},
    {"name": "respondent_name", "label": "Respondent Name", "type": "text", "required": true},
    {"name": "respondent_address", "label": "Respondent Address", "type": "textarea", "required": true},
    {"name": "respondent_counsel", "label": "Respondent Counsel", "type": "text", "required": false},
    {"name": "arbitrator_name", "label": "Arbitrator / Tribunal Name", "type": "text", "required": true},
    {"name": "arbitrator_address", "label": "Arbitrator Address", "type": "textarea", "required": false},
    {"name": "case_reference", "label": "Case / Matter Reference", "type": "text", "required": false},
    {"name": "underlying_contract", "label": "Underlying Contract Description", "type": "textarea", "required": true, "description": "Brief description of the contract giving rise to the dispute"},
    {"name": "contract_date", "label": "Date of Underlying Contract", "type": "date", "required": true},
    {"name": "dispute_summary", "label": "Summary of Dispute", "type": "textarea", "required": true},
    {"name": "claimant_claims", "label": "Claimant Claims & Relief Sought", "type": "textarea", "required": true},
    {"name": "respondent_defence", "label": "Respondent Defence & Counterclaims (if any)", "type": "textarea", "required": false},
    {"name": "issues_for_determination", "label": "Issues for Determination", "type": "textarea", "required": true, "description": "List each issue on a separate line"},
    {"name": "applicable_rules", "label": "Applicable Arbitration Rules", "type": "text", "required": true, "default": "Ghana ADR Act 2010 (Act 798)"},
    {"name": "governing_law", "label": "Governing Law", "type": "text", "required": true, "default": "Laws of Ghana"},
    {"name": "seat_of_arbitration", "label": "Seat of Arbitration", "type": "text", "required": true, "default": "Accra, Ghana"},
    {"name": "language", "label": "Language of Arbitration", "type": "text", "required": false, "default": "English"},
    {"name": "place_of_hearings", "label": "Place of Hearings", "type": "text", "required": false, "default": "Accra, Ghana"},
    {"name": "mem_of_claim_deadline", "label": "Deadline — Memorial / Statement of Claim", "type": "text", "required": false},
    {"name": "mem_of_defence_deadline", "label": "Deadline — Memorial / Statement of Defence", "type": "text", "required": false},
    {"name": "hearing_date", "label": "Hearing Date (if fixed)", "type": "text", "required": false},
    {"name": "confidentiality", "label": "Confidentiality", "type": "select", "required": false, "options": ["The proceedings shall be confidential.", "The proceedings shall not be confidential."], "default": "The proceedings shall be confidential."},
    {"name": "tor_date", "label": "Date of Terms of Reference", "type": "date", "required": true}
  ]'::jsonb,
  E'TERMS OF REFERENCE\n\nCase Reference: {{case_reference}}\nDate: {{tor_date}}\n\n---\n\n1. PARTIES\n\n1.1 CLAIMANT\n{{claimant_name}}\n{{claimant_address}}\n{{claimant_counsel}}\n\n1.2 RESPONDENT\n{{respondent_name}}\n{{respondent_address}}\n{{respondent_counsel}}\n\n1.3 ARBITRAL TRIBUNAL\n{{arbitrator_name}}\n{{arbitrator_address}}\n\n---\n\n2. BACKGROUND AND UNDERLYING CONTRACT\n\n2.1 This arbitration arises out of a dispute concerning {{underlying_contract}} entered into on {{contract_date}} between the Claimant and the Respondent (the "Contract").\n\n2.2 {{dispute_summary}}\n\n---\n\n3. SUMMARY OF CLAIMS AND DEFENCES\n\n3.1 The Claimant claims and seeks the following relief:\n{{claimant_claims}}\n\n3.2 The Respondent's position and defences (including any counterclaims) are as follows:\n{{respondent_defence}}\n\n---\n\n4. ISSUES FOR DETERMINATION\n\nWithout prejudice to the right of any party to raise additional issues in the course of the proceedings, the following issues are submitted to the Arbitral Tribunal for determination:\n\n{{issues_for_determination}}\n\n---\n\n5. APPLICABLE LAW AND RULES\n\n5.1 The arbitration shall be conducted in accordance with: {{applicable_rules}}.\n\n5.2 The substantive law governing the dispute and the Contract shall be the {{governing_law}}.\n\n5.3 The seat of arbitration shall be {{seat_of_arbitration}}.\n\n5.4 The language of the arbitration shall be {{language}}.\n\n---\n\n6. PROCEDURAL TIMETABLE\n\n6.1 Memorial / Statement of Claim: {{mem_of_claim_deadline}}\n\n6.2 Memorial / Statement of Defence: {{mem_of_defence_deadline}}\n\n6.3 Hearing: {{hearing_date}}\n\n6.4 The Arbitral Tribunal reserves the right to issue further procedural orders as the arbitration progresses.\n\n---\n\n7. PLACE OF HEARINGS\n\nUnless otherwise agreed by the parties or directed by the Tribunal, hearings shall take place at {{place_of_hearings}}.\n\n---\n\n8. CONFIDENTIALITY\n\n{{confidentiality}} All documents, submissions, awards, and information disclosed in or for the purpose of these proceedings shall be treated as confidential by the parties, their representatives, witnesses, and the Tribunal.\n\n---\n\n9. POWERS OF THE TRIBUNAL\n\n9.1 The Tribunal shall have full powers to conduct the arbitration, including: (a) deciding procedural matters; (b) granting interim measures; (c) determining its own jurisdiction; (d) ordering disclosure of documents; and (e) awarding costs.\n\n9.2 The Tribunal may issue further procedural orders as necessary.\n\n---\n\n10. COSTS\n\nThe costs of the arbitration, including the Tribunal''s fees and expenses, shall be determined and allocated by the Tribunal in the final award.\n\n---\n\n11. SIGNATURES\n\nThe parties and the Arbitral Tribunal agree to these Terms of Reference.\n\nFor and on behalf of the CLAIMANT:\n\nSignature: _________________________\nName: _________________________\nDate: _________________________\n\nFor and on behalf of the RESPONDENT:\n\nSignature: _________________________\nName: _________________________\nDate: _________________________\n\nARBITRAL TRIBUNAL:\n\nSignature: _________________________\nName: {{arbitrator_name}}\nDate: _________________________'
);
