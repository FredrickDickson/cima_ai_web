# Document Tab — What It Actually Does

A lot of legal platforms make the mistake of treating documents as files.

CIMA AI should treat documents as **knowledge assets**.

The Documents tab is not:

❌ Google Drive
❌ Dropbox
❌ A file explorer

It is:

# The Legal Intelligence Repository

Every document uploaded to CIMA AI becomes:

* searchable
* analyzable
* linked
* cited
* retrievable
* AI-readable

---

# Difference Between Cases, Contracts, and Documents

Many people confuse these modules.

### Cases

Manages disputes.

```text
Case
├── Parties
├── Evidence
├── Hearings
├── Drafts
└── Documents
```

---

### Contract Review

Analyzes contracts specifically.

```text
Contract
├── Risks
├── Clauses
├── Obligations
└── Redlines
```

---

### Documents

Manages ALL uploaded legal knowledge.

```text
Document Library
├── Contracts
├── Awards
├── Pleadings
├── Statutes
├── Cases
├── Regulations
├── Evidence
├── Reports
└── Research Materials
```

---

# Core Purpose

The Documents module should answer:

> "Where is every legal document in my organization, and what does it contain?"

---

# Main Documents Screen

```text
Documents
──────────────────────

Search Documents

Filters

All Documents
My Documents
Matter Documents
Legal Library
Recent
Favorites
```

---

# Document Types

The system should automatically classify uploads.

## Litigation

* Statement of Claim
* Defence
* Motion
* Brief
* Affidavit

---

## Arbitration

* Notice of Arbitration
* Response
* Award
* Procedural Order
* Terms of Reference

---

## Commercial

* NDA
* Shareholder Agreement
* Service Agreement
* Employment Contract

---

## Legal Authorities

* Statutes
* Regulations
* Treaties
* Judgments
* Arbitral Awards

---

## Evidence

* Emails
* Invoices
* Reports
* Witness Statements
* Expert Reports

---

# Upload Flow

User uploads:

```text
Contract.pdf
```

System automatically:

### Extracts Text

```text
PDF
DOCX
Images
Scans
```

---

### OCR

If scanned:

```text
Image
↓
OCR
↓
Searchable Text
```

---

### Classifies Document

AI determines:

```text
Service Agreement
```

or

```text
Witness Statement
```

or

```text
Arbitral Award
```

---

### Generates Metadata

```text
Document Type

Parties

Date

Jurisdiction

Language

Tags
```

---

### Creates Embeddings

Document becomes searchable through RAG.

Stored in:

```text
Supabase
+
pgvector
```

---

# Document Viewer

This becomes one of the most-used screens.

---

# Layout

```text
┌───────────────────┬──────────────────┐
│ Document Viewer   │ AI Analysis      │
└───────────────────┴──────────────────┘
```

---

# Left Side

Full document.

PDF rendering.

Word rendering.

Search.

Bookmarks.

Annotations.

Highlights.

---

# Right Side

AI intelligence panel.

Actions:

```text
Summarize

Explain

Extract Issues

Extract Obligations

Create Timeline

Find Authorities

Generate Brief

Generate Hearing Notes
```

---

# AI Summary

Every document gets:

```text
Executive Summary
```

Example:

```text
This witness statement
supports the claimant's
position regarding delayed
payment and references
three disputed invoices.
```

---

# Issue Extraction

AI identifies:

```text
Issue 1
Payment Default

Issue 2
Defective Work

Issue 3
Jurisdiction
```

---

# Entity Extraction

AI extracts:

```text
Organizations

People

Courts

Arbitration Institutions

Dates

Contracts
```

This powers search.

---

# Chronology Generation

AI scans:

```text
Emails

Contracts

Statements

Reports
```

Creates:

```text
Jan 1
Contract Signed

Feb 3
Work Commenced

March 8
Invoice Issued

April 15
Default
```

---

# Semantic Search

This is where the Documents tab becomes powerful.

Users should be able to search:

```text
payment dispute
```

instead of:

```text
invoice_34.pdf
```

---

Search results should understand meaning.

Example:

```text
Show documents mentioning
late payment claims
```

AI finds relevant documents.

---

# Legal Library Mode

The Documents module should also house the firm's legal library.

Examples:

* Ghana ADR Act
* UNCITRAL Rules
* New York Convention
* Case Law
* Treaties

These become retrievable through AI.

---

# Cross-Document Intelligence

One huge feature:

AI compares documents.

Example:

```text
Witness Statement A

vs

Witness Statement B
```

AI detects:

```text
Contradictions

Consistencies

Missing Facts
```

---

Another example:

```text
Statement of Claim

vs

Statement of Defence
```

AI extracts:

```text
Disputed Issues
```

---

# Evidence Intelligence

AI can answer:

```text
Which documents support
the claimant's position?
```

or

```text
Which documents mention
Invoice 34?
```

This becomes extremely valuable.

---

# Citation Engine

The document viewer should support:

```text
Generate Citation
```

for:

* cases
* statutes
* treaties
* awards

---

# Link to Cases

Documents can belong to:

```text
Case A

Case B

Case C
```

or

```text
No Case
```

---

This allows users to maintain:

### Global Library

and

### Matter-Specific Documents

simultaneously.

---

# Link to Drafting Studio

While viewing a document:

User clicks:

```text
Use in Draft
```

The document is added to drafting context.

Example:

```text
Draft Award
```

AI automatically references:

* uploaded evidence
* witness statements
* contracts

---

# Link to Research

While reading a document:

User clicks:

```text
Find Supporting Authority
```

Research engine opens.

AI finds:

* statutes
* cases
* treaties

relevant to the selected passage.

---

# Folder Structure

Avoid traditional folders.

Instead use:

### Smart Collections

```text
Arbitration

Contracts

Evidence

Authorities

Drafts

Research
```

generated automatically.

---

# AI-Powered Collections

Example:

```text
Documents Related To:

Jurisdiction Issues

Payment Disputes

Force Majeure

Delay Claims
```

---

# Ultimate Goal

The Documents tab should become:

> The institutional memory of the lawyer, law firm, arbitration center, or legal department.

A user should be able to upload 10,000+ documents and then ask:

```text
Find all documents discussing
liquidated damages.
```

or

```text
Which witness statements
support Issue 3?
```

and receive instant, grounded answers.

So:

* **Cases** organize disputes.
* **Contract Review** analyzes contracts.
* **Drafting Studio** creates legal documents.
* **Research** finds law and authorities.
* **Documents** stores, understands, connects, and retrieves all legal knowledge across the platform.
