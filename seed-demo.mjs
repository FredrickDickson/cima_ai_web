import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.SEED_DEMO_USER_ID || '6a68e6c2-6287-474f-a395-2a6cd900bab9';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function insert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ ${table}:`, JSON.stringify(data));
    return [];
  }
  console.log(`✅ ${table}: inserted ${Array.isArray(data) ? data.length : 1} row(s)`);
  return Array.isArray(data) ? data : [data];
}

// ── 1. CASES ─────────────────────────────────────────────────────────────────
const cases = await insert('cases', [
  {
    user_id: USER_ID,
    title: 'Accra Builders Ltd v Ministry of Roads & Highways',
    matter_number: 'GHIAC/ARB/2024/001',
    type: 'arbitration',
    status: 'active',
    framework: 'GHIAC Rules 2023',
    description: 'Construction payment dispute arising from a FIDIC contract for the Eastern Corridor Road Project. Claimant seeks recovery of GHS 42,000,000 in unpaid interim payment certificates and prolongation costs.',
    parties: [
      { name: 'Accra Builders Ltd', role: 'claimant', counsel: 'Kwame Asante & Co.' },
      { name: 'Ministry of Roads & Highways', role: 'respondent', counsel: 'State Attorneys, Ghana' },
    ],
    next_hearing: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: USER_ID,
    title: 'AfriTech Solutions v DataCore Systems Inc.',
    matter_number: 'ICC/ARB/2024/018',
    type: 'arbitration',
    status: 'active',
    framework: 'ICC Rules 2021',
    description: 'Dispute over software licensing agreement and alleged breach of SLA obligations. Claimant claims USD 2,800,000 in damages for system downtime and loss of business. Seat: Accra, Ghana. Governing law: English law.',
    parties: [
      { name: 'AfriTech Solutions Plc', role: 'claimant', counsel: 'Bentsi-Enchill, Letsa & Ankomah' },
      { name: 'DataCore Systems Inc.', role: 'respondent', counsel: 'Norton Rose Fulbright' },
    ],
    next_hearing: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: USER_ID,
    title: 'Goldfields West Africa v Apex Mining Corp',
    matter_number: 'LCIA/ARB/2024/442',
    type: 'arbitration',
    status: 'pending',
    framework: 'LCIA Rules 2020',
    description: 'Joint venture dispute in the mining sector. Issues include alleged misappropriation of joint venture assets, breach of the joint operating agreement, and fraudulent misrepresentation. Claimant seeks USD 18,500,000 plus interest.',
    parties: [
      { name: 'Goldfields West Africa Ltd', role: 'claimant', counsel: 'Reindorf Chambers' },
      { name: 'Apex Mining Corp', role: 'respondent', counsel: 'Clifford Chance LLP' },
    ],
    next_hearing: null,
  },
]);

const [case1, case2, case3] = cases;

// ── 2. HEARINGS ───────────────────────────────────────────────────────────────
await insert('hearings', [
  {
    case_id: case1.id,
    user_id: USER_ID,
    title: 'Preliminary Hearing — Jurisdiction & Bifurcation',
    scheduled_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Ghana International Arbitration Centre, Accra',
    type: 'preliminary',
    notes: 'Tribunal to rule on jurisdictional objections raised by Respondent. Parties to submit written submissions 5 days prior.',
    status: 'scheduled',
  },
  {
    case_id: case1.id,
    user_id: USER_ID,
    title: 'Substantive Hearing — Quantum of Damages',
    scheduled_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Ghana International Arbitration Centre, Accra',
    type: 'substantive',
    notes: 'Expert witnesses on quantum to be cross-examined. Parties to exchange expert reports 21 days prior.',
    status: 'scheduled',
  },
  {
    case_id: case2.id,
    user_id: USER_ID,
    title: 'Case Management Conference',
    scheduled_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'ICC Hearing Centre, Paris (Video)',
    type: 'procedural',
    notes: 'Discuss procedural timetable and document production protocol.',
    status: 'scheduled',
  },
]);

// ── 3. DEADLINES ──────────────────────────────────────────────────────────────
await insert('deadlines', [
  {
    case_id: case1.id,
    user_id: USER_ID,
    title: 'File Statement of Claim',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'pleading',
    status: 'pending',
    notes: 'Include all documentary evidence and expert reports. Word limit: 50,000 words.',
  },
  {
    case_id: case1.id,
    user_id: USER_ID,
    title: 'Document Production Request',
    due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'disclosure',
    status: 'pending',
    notes: 'Redfern Schedule to be exchanged between parties.',
  },
  {
    case_id: case2.id,
    user_id: USER_ID,
    title: 'Submit Terms of Reference',
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'procedural',
    status: 'pending',
    notes: 'Agreed by both parties. To be signed at Case Management Conference.',
  },
  {
    case_id: case1.id,
    user_id: USER_ID,
    title: 'Jurisdictional Submissions Due',
    due_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'pleading',
    status: 'pending',
    notes: '5 days before preliminary hearing.',
  },
]);

// ── 4. ISSUES ─────────────────────────────────────────────────────────────────
await insert('issues', [
  {
    case_id: case1.id,
    user_id: USER_ID,
    issue_number: 1,
    description: 'Whether the Tribunal has jurisdiction over the dispute under Clause 20 of the FIDIC contract.',
    claimant_position: 'The arbitration clause is valid and broadly drafted to encompass all disputes arising out of or in connection with the contract.',
    respondent_position: 'The clause requires DAB determination as a condition precedent to arbitration, which was not fulfilled.',
    status: 'open',
  },
  {
    case_id: case1.id,
    user_id: USER_ID,
    issue_number: 2,
    description: 'Whether Interim Payment Certificates No. 14–22 were wrongfully withheld by the Respondent.',
    claimant_position: 'Payment was certified by the Engineer and became due. Withholding constitutes breach of contract.',
    respondent_position: 'Defects in workmanship entitle the Employer to withhold payment under Clause 14.9.',
    status: 'open',
  },
  {
    case_id: case1.id,
    user_id: USER_ID,
    issue_number: 3,
    description: 'Quantum: whether Claimant is entitled to prolongation costs of GHS 8,200,000.',
    claimant_position: 'Delay was caused by Employer variations and late possession of site. Claimant is entitled to EOT and associated costs.',
    respondent_position: 'Delay was due to Contractor\'s own inefficiency. No concurrent delay analysis has been provided.',
    status: 'open',
  },
]);

// ── 5. EVIDENCE ───────────────────────────────────────────────────────────────
await insert('evidence', [
  {
    case_id: case1.id,
    user_id: USER_ID,
    title: 'FIDIC Contract — Eastern Corridor Road Project (Signed)',
    type: 'contract',
    summary: 'The main construction contract including Special Conditions. Key provisions include Clause 20 (arbitration), Clause 14 (payment), and Clause 8 (time for completion).',
  },
  {
    case_id: case1.id,
    user_id: USER_ID,
    title: 'Interim Payment Certificates No. 14 to 22',
    type: 'financial',
    summary: 'Certified by Engineer on various dates. Total certified amount: GHS 42,000,000. Respondent withheld payment citing defects notice issued under Clause 11.',
  },
  {
    case_id: case1.id,
    user_id: USER_ID,
    title: 'Engineer\'s Determination — Claim for EOT',
    type: 'determination',
    summary: 'Engineer granted 47 days EOT but rejected prolongation cost claim. Claimant disputes basis of determination.',
  },
  {
    case_id: case2.id,
    user_id: USER_ID,
    title: 'Software Licensing Agreement (SLA) — Executed 12 March 2022',
    type: 'contract',
    summary: 'Master SLA between AfriTech and DataCore. Includes uptime guarantees of 99.9%, penalty clauses, and ICC arbitration clause.',
  },
]);

// ── 6. DOCUMENTS ─────────────────────────────────────────────────────────────
await insert('documents', [
  {
    user_id: USER_ID,
    case_id: case1.id,
    name: 'Notice of Arbitration — Accra Builders v MRH.pdf',
    type: 'brief',
    file_path: 'demo/notice-of-arbitration.pdf',
    file_size: 245000,
    mime_type: 'application/pdf',
    extracted_text: 'NOTICE OF ARBITRATION\n\nTo: Ministry of Roads & Highways, Accra, Ghana\n\nPursuant to Clause 20.6 of the FIDIC Conditions of Contract...',
    ai_summary: 'Formal Notice of Arbitration filed by Accra Builders Ltd commencing ICC arbitration proceedings against the Ministry of Roads & Highways for GHS 42,000,000 in unpaid construction payments.',
    risk_score: 0,
    status: 'ready',
    metadata: { pages: 12 },
  },
  {
    user_id: USER_ID,
    case_id: case1.id,
    name: 'FIDIC Contract — Eastern Corridor Road Project.pdf',
    type: 'contract',
    file_path: 'demo/fidic-contract.pdf',
    file_size: 1840000,
    mime_type: 'application/pdf',
    extracted_text: 'CONDITIONS OF CONTRACT FOR CONSTRUCTION\nFor Building and Engineering Works Designed by the Employer\nFirst Edition 1999...',
    ai_summary: 'FIDIC Red Book contract for construction of the Eastern Corridor Road Project. Contains 20 clauses covering general obligations, time, testing, payment, force majeure, and dispute resolution.',
    risk_score: 62,
    status: 'ready',
    metadata: { pages: 128 },
  },
  {
    user_id: USER_ID,
    case_id: case2.id,
    name: 'Software Licensing Agreement — AfriTech v DataCore.pdf',
    type: 'contract',
    file_path: 'demo/sla-afritech.pdf',
    file_size: 520000,
    mime_type: 'application/pdf',
    extracted_text: 'MASTER SOFTWARE LICENSE AND SERVICES AGREEMENT\nThis Agreement is entered into as of 12 March 2022...',
    ai_summary: 'Master SLA governing software licensing and support services. Key risk areas: broad indemnification clause, weak data protection provisions, unilateral price variation right, and inadequate force majeure coverage.',
    risk_score: 78,
    status: 'ready',
    metadata: { pages: 47 },
  },
  {
    user_id: USER_ID,
    case_id: null,
    name: 'Ghana ADR Act 2010 — Annotated.pdf',
    type: 'statute',
    file_path: 'demo/ghana-adr-act.pdf',
    file_size: 890000,
    mime_type: 'application/pdf',
    extracted_text: 'ALTERNATIVE DISPUTE RESOLUTION ACT, 2010\nACT 798\nAN ACT to provide for the settlement of disputes by arbitration...',
    ai_summary: 'Full text of the Ghana Alternative Dispute Resolution Act 2010 (Act 798), the primary legislation governing domestic arbitration, mediation, and customary arbitration in Ghana. Annotated with key cases.',
    risk_score: 0,
    status: 'ready',
    metadata: { pages: 64 },
  },
  {
    user_id: USER_ID,
    case_id: case1.id,
    name: 'Draft Award — Quantum Analysis.docx',
    type: 'award',
    file_path: 'demo/draft-award.docx',
    file_size: 180000,
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extracted_text: 'DRAFT ARBITRAL AWARD\n\nIn the Matter of Accra Builders Ltd v Ministry of Roads & Highways...',
    ai_summary: 'Working draft of arbitral award covering liability findings and quantum analysis. Sections on prolongation costs, loss of productivity, and interest remain under review.',
    risk_score: 0,
    status: 'ready',
    metadata: { pages: 38 },
  },
]);

// ── 7. RESEARCH SESSIONS ─────────────────────────────────────────────────────
await insert('research_sessions', [
  {
    user_id: USER_ID,
    query: 'Enforcement of arbitration agreements under Ghanaian law — conditions precedent',
    jurisdiction: 'Ghana',
    results: [
      {
        title: 'Ghana ADR Act 2010 (Act 798) — Section 2–5',
        citation: 'Act 798, Ghana, 2010',
        type: 'statute',
        jurisdiction: 'Ghana',
        summary: 'Sections 2–5 govern the validity and enforceability of arbitration agreements. An arbitration agreement must be in writing and may be incorporated by reference. Courts are required to stay proceedings where a valid arbitration agreement exists.',
        relevance: 0.97,
      },
      {
        title: 'Scanship AS v Ghana Ports & Harbours Authority',
        citation: '[2019] GHSC 14',
        type: 'case',
        jurisdiction: 'Ghana',
        summary: 'Supreme Court held that a DAB condition precedent clause in a FIDIC contract is a mandatory step before arbitration. Failure to refer a dispute to the DAB renders the arbitration premature.',
        relevance: 0.94,
      },
      {
        title: 'UNCITRAL Model Law on International Commercial Arbitration (2006)',
        citation: 'UNCITRAL Model Law, Art. 8',
        type: 'rule',
        jurisdiction: 'International',
        summary: 'Article 8 requires courts to refer parties to arbitration at the request of a party unless the agreement is null, void, inoperative, or incapable of being performed.',
        relevance: 0.89,
      },
    ],
    ai_analysis: 'Under Ghanaian law, an arbitration agreement is enforceable if it is in writing and covers the dispute at hand. The key risk in construction FIDIC contracts is the condition precedent requirement for DAB reference. Ghanaian courts have followed the approach in Scanship v GPHA in requiring strict compliance. However, where both parties have failed to constitute the DAB, courts have discretion to refer directly to arbitration under the principle in Atlanska Plovidba v Consigni Anagram SpA.',
  },
  {
    user_id: USER_ID,
    query: 'Standard for awarding prolongation costs in construction arbitration under FIDIC',
    jurisdiction: 'International',
    results: [
      {
        title: 'FIDIC Red Book 1999 — Clause 20: Claims, Disputes and Arbitration',
        citation: 'FIDIC Red Book 1999, Cl. 20.1',
        type: 'rule',
        jurisdiction: 'International',
        summary: 'Clause 20.1 sets out the notice requirement for claims. A contractor must give notice within 28 days of becoming aware of the event giving rise to the claim. Failure to give timely notice bars the claim.',
        relevance: 0.96,
      },
      {
        title: 'Emden\'s Construction Law — Prolongation Costs',
        citation: 'Emden\'s Construction Law, Vol. 2, Ch. 8',
        type: 'article',
        jurisdiction: 'UK',
        summary: 'Prolongation costs are recoverable where the contractor proves: (1) entitlement to an extension of time; (2) actual loss caused by the delay; (3) causation between the employer-risk event and the loss.',
        relevance: 0.91,
      },
    ],
    ai_analysis: 'Prolongation costs in FIDIC arbitration require proof of a compensable delay event, actual prolongation of the contract period, and loss caused by that prolongation. The SCL Delay and Disruption Protocol (2nd ed.) provides the industry-accepted methodology for quantification. Tribunals generally require a contemporaneous programme analysis and reject claims based solely on global loss calculations.',
  },
  {
    user_id: USER_ID,
    query: 'ICC arbitration — applicable law for technology disputes, seat Ghana',
    jurisdiction: 'Ghana',
    results: [
      {
        title: 'ICC Rules of Arbitration 2021 — Article 21',
        citation: 'ICC Rules 2021, Art. 21',
        type: 'rule',
        jurisdiction: 'International',
        summary: 'Article 21 provides that the tribunal shall apply the rules of law agreed upon by the parties, or in the absence of agreement, the most appropriate rules of law. The lex mercatoria and general principles of law may be applied.',
        relevance: 0.93,
      },
      {
        title: 'Contracts Act 1960 (Act 25) — Ghana',
        citation: 'Act 25, Ghana, 1960',
        type: 'statute',
        jurisdiction: 'Ghana',
        summary: 'Governs formation, performance, and breach of contracts in Ghana. Applies to the interpretation of the SLA insofar as Ghanaian law is the governing law.',
        relevance: 0.85,
      },
    ],
    ai_analysis: 'Where the parties have chosen English law as the governing law in an ICC arbitration seated in Ghana, the tribunal will apply English law to the substantive dispute but Ghanaian law (ADR Act 2010) to the procedural and enforcement aspects. The seat of arbitration determines the lex arbitri.',
  },
]);

// ── 8. DRAFTS ─────────────────────────────────────────────────────────────────
await insert('drafts', [
  {
    user_id: USER_ID,
    case_id: case1.id,
    title: 'Statement of Claim — Accra Builders v MRH',
    template_type: 'statement_of_claim',
    content: `# STATEMENT OF CLAIM

**In the Matter of Arbitration Under the GHIAC Rules 2023**

**Accra Builders Ltd** (Claimant)
v.
**Ministry of Roads & Highways** (Respondent)

**Case No.:** GHIAC/ARB/2024/001

---

## I. INTRODUCTION

1. This Statement of Claim is filed by Accra Builders Ltd ("Claimant") pursuant to Article 18 of the GHIAC Rules 2023 and Clause 20 of the Conditions of Contract.

2. The Claimant seeks recovery of GHS 42,000,000 representing unpaid Interim Payment Certificates Nos. 14–22, prolongation costs of GHS 8,200,000, and interest thereon.

## II. PARTIES

3. The **Claimant**, Accra Builders Ltd, is a company incorporated under the laws of Ghana (Reg. No. CS-2010-4821), engaged in civil engineering and construction.

4. The **Respondent**, the Ministry of Roads & Highways, is a government ministry of the Republic of Ghana responsible for road infrastructure development.

## III. THE CONTRACT

5. By a contract executed on 14 February 2021, the parties entered into a FIDIC Red Book (1999 edition) contract for the construction of the Eastern Corridor Road, Phase 2 ("the Contract"). The Contract Sum was GHS 185,000,000.

## IV. FACTUAL BACKGROUND

6. The Claimant commenced works on 1 April 2021. The original completion date was 31 March 2023.

7. During the course of the works, the Respondent issued 47 variation orders, several of which required significant additional work and caused delay to the critical path.

8. The Engineer issued Interim Payment Certificates Nos. 14–22 certifying payment totalling GHS 42,000,000. The Respondent has failed and refused to make payment.

## V. CLAIMS FOR RELIEF

The Claimant respectfully requests the Tribunal to:

(a) Declare that the Respondent is in breach of the Contract;
(b) Award the Claimant GHS 42,000,000 in unpaid certified amounts;
(c) Award the Claimant GHS 8,200,000 in prolongation costs;
(d) Award compound interest at the rate of 30% per annum;
(e) Award the Claimant its costs of the arbitration.`,
    jurisdiction: 'Ghana',
    status: 'draft',
  },
  {
    user_id: USER_ID,
    case_id: case1.id,
    title: 'Procedural Order No. 1 — Timetable & Document Production',
    template_type: 'procedural_order',
    content: `# PROCEDURAL ORDER NO. 1

**Arbitration:** Accra Builders Ltd v Ministry of Roads & Highways
**Case No.:** GHIAC/ARB/2024/001
**Date:** ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

---

## THE TRIBUNAL, having consulted with the parties, HEREBY ORDERS:

### 1. PROCEDURAL TIMETABLE

| Step | Party | Deadline |
|------|-------|----------|
| Statement of Claim | Claimant | Day 0 + 30 days |
| Statement of Defence | Respondent | Day 0 + 75 days |
| Reply | Claimant | Day 0 + 105 days |
| Rejoinder | Respondent | Day 0 + 120 days |
| Redfern Schedule | Both | Day 0 + 90 days |
| Expert Reports | Both | Day 0 + 150 days |

### 2. DOCUMENT PRODUCTION

2.1 Each party shall produce all documents on which it relies with its pleadings.

2.2 Further document production shall follow the IBA Rules on the Taking of Evidence in International Arbitration (2020).

### 3. CONFIDENTIALITY

3.1 All pleadings, evidence, and hearing transcripts shall be kept confidential.`,
    jurisdiction: 'Ghana',
    status: 'finalized',
  },
  {
    user_id: USER_ID,
    case_id: null,
    title: 'Non-Disclosure Agreement — Standard Template',
    template_type: 'nda',
    content: `# MUTUAL NON-DISCLOSURE AGREEMENT

**Date:** [DATE]
**Party A:** [PARTY A NAME], a company incorporated under the laws of Ghana
**Party B:** [PARTY B NAME], a company incorporated under the laws of Ghana

---

## 1. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any information disclosed by either party to the other, either directly or indirectly, in writing, orally or by inspection of tangible objects...

## 2. OBLIGATIONS

Each party agrees to: (a) hold the other's Confidential Information in strict confidence; (b) not disclose it to third parties without prior written consent; (c) use it solely for the Purpose defined herein.

## 3. TERM

This Agreement shall remain in force for a period of three (3) years from the date of execution.`,
    jurisdiction: 'Ghana',
    status: 'draft',
  },
]);

// ── 9. CONTRACT ANALYSIS ─────────────────────────────────────────────────────
await insert('contract_analyses', [
  {
    user_id: USER_ID,
    case_id: case2.id,
    document_id: null,
    overall_risk_score: 78,
    risk_items: [
      { title: 'Unilateral Price Variation', risk_level: 'critical', explanation: 'Clause 12.3 permits DataCore to increase licensing fees by up to 20% annually with 30 days\' notice, with no cap over the contract term.', impact: 'AfriTech may face significant cost escalation with limited ability to exit.', recommendation: 'Cap annual increases at CPI + 3% and include exit right if increase exceeds threshold.' },
      { title: 'Broad Indemnification Clause', risk_level: 'high', explanation: 'Clause 18 requires AfriTech to indemnify DataCore against all third-party claims arising from AfriTech\'s use of the software, including claims DataCore could have prevented.', impact: 'Potentially unlimited liability exposure.', recommendation: 'Limit indemnity to direct infringement caused solely by AfriTech\'s unauthorized use.' },
      { title: 'Weak Force Majeure', risk_level: 'high', explanation: 'Force majeure clause excludes cyber attacks and infrastructure outages — the primary risks in a SaaS environment.', impact: 'DataCore may claim force majeure for system outages that are foreseeable in cloud services.', recommendation: 'Expand definition to include cyber incidents; add SLA credits for force majeure events.' },
      { title: 'Missing Data Protection Provisions', risk_level: 'high', explanation: 'No GDPR or Ghana Data Protection Act 2012 compliance provisions. No data processing agreement or DPA schedule attached.', impact: 'Regulatory exposure and inability to transfer personal data lawfully.', recommendation: 'Add a Data Processing Addendum compliant with Ghana DPA 2012 and GDPR.' },
    ],
    clauses_data: [
      { clause_name: 'Arbitration Clause', risk_level: 'medium', analysis: 'ICC arbitration clause is valid but lacks specification of number of arbitrators and language of proceedings.', start_phrase: 'Any dispute arising out of' },
      { clause_name: 'Limitation of Liability', risk_level: 'high', analysis: 'Liability cap of USD 500,000 is disproportionately low relative to contract value of USD 4,200,000.', start_phrase: 'In no event shall either party' },
      { clause_name: 'Governing Law', risk_level: 'low', analysis: 'English law is a well-developed system appropriate for technology agreements.', start_phrase: 'This Agreement shall be governed by' },
    ],
    missing_clauses: [
      { clause_type: 'Data Processing Agreement', importance: 'critical', consequence_of_omission: 'Non-compliance with Ghana Data Protection Act 2012 and GDPR.' },
      { clause_type: 'Business Continuity / Disaster Recovery', importance: 'high', consequence_of_omission: 'No contractual obligation on DataCore to maintain DR capabilities.' },
      { clause_type: 'Audit Rights', importance: 'medium', consequence_of_omission: 'AfriTech cannot verify DataCore\'s compliance with security standards.' },
    ],
    obligations: [
      { party: 'AfriTech', obligation: 'Pay monthly license fees within 30 days of invoice', deadline: 'Monthly' },
      { party: 'DataCore', obligation: 'Maintain 99.9% uptime SLA', deadline: 'Continuous' },
      { party: 'DataCore', obligation: 'Provide 30 days\' notice of price changes', deadline: 'As applicable' },
    ],
    recommendations: [
      'Immediately negotiate a Data Processing Addendum to ensure Ghana DPA compliance.',
      'Cap annual price increases at CPI + 3% with exit right on excessive increases.',
      'Increase liability cap to at least 12 months\' fees paid.',
      'Add cyber incidents and infrastructure outages to force majeure definition.',
      'Include audit rights to verify security and compliance obligations.',
    ],
    ai_summary: 'This Software Licensing Agreement presents a HIGH overall risk profile (78/100). The most critical issues are the absence of data protection provisions, the unilateral price variation right, and the broad indemnification clause. The arbitration clause is valid but incomplete. Immediate renegotiation is recommended before the agreement is relied upon for live operations.',
    contract_text: 'MASTER SOFTWARE LICENSE AND SERVICES AGREEMENT...',
    arbitration_clause_valid: true,
    arbitration_clause_issues: 'Clause does not specify number of arbitrators or language of proceedings.',
    governing_law_found: true,
    governing_law: 'English Law',
  },
]);

console.log('\n🎉 Demo data seeded successfully!');
console.log('   Cases: 3 (2 active, 1 pending)');
console.log('   Hearings: 3');
console.log('   Deadlines: 4');
console.log('   Issues: 3');
console.log('   Evidence: 4');
console.log('   Documents: 5');
console.log('   Research Sessions: 3');
console.log('   Drafts: 3');
console.log('   Contract Analysis: 1');
