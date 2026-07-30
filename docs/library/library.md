A Retrieval-Augmented Generation (RAG) system with a legal knowledge library. This is the standard architecture used by platforms such as Eskwai, Harvey, CoCounsel, and other legal AI tools.
For CIMA AI, I would recommend the following architecture:
1. Store the original documents
Keep every law, regulation, arbitration rule, case, textbook, or precedent in its original form.
Supabase Storage

/laws/
    ADR Act 2010.pdf
    Companies Act 2019.pdf

/cases/
    Republic v ...
    Tetteh v ...

/rules/
    UNCITRAL Rules.pdf

/books/
Store metadata in a database table:
documents
------------
id
title
category
jurisdiction
court
year
file_url
summary
This allows users to:
Search documents
Download or view the original PDF
Filter by country, court, subject, or year

2. Extract the text
Whenever a PDF or DOCX is uploaded:
Read the document
Extract all text
Clean formatting
Split into chunks (around 500–1,000 words)
Example:
Chunk 1
Sections 1–5

Chunk 2
Sections 6–12

Chunk 3
Definitions

3. Generate embeddings
Convert every chunk into an embedding using models such as:
OpenAI text-embedding-3-large
Gemini embeddings
Voyage AI
Jina AI
Store the embeddings in PostgreSQL with the pgvector extension.
document_chunks

id
document_id
chunk_number
text
embedding
page_number

4. Retrieval
When the user asks:
What are the grounds for setting aside an arbitral award under the ADR Act?
The AI:
Creates an embedding of the question.
Searches the vector database.
Retrieves the most relevant chunks.
Sends only those chunks to the LLM.
The AI answers using the retrieved legal text instead of relying on memory.

5. Citations
Every answer should include references such as:
ADR Act, 2010 (Act 798), Section 58
or
Republic v. High Court, Accra; Ex Parte XYZ [2018]
Each citation should link back to the source document.

6. Built-in document viewer
When a user opens a law or case:
---------------------------------
| PDF Viewer                   |
|-------------------------------|
| Pages                         |
| Search within document        |
| Bookmarks                     |
| AI Assistant                  |
---------------------------------

Ask CIMA AI:

"What does Section 72 mean?"
The AI already knows which document is open, making responses more accurate.

7. Chat with a document
Allow users to upload or select a document and ask questions like:
Summarise this Act.
Explain Section 42.
List the obligations.
Compare with UNCITRAL Rules.
Find contradictory clauses.
Draft a legal opinion.
The AI should answer only from that document unless instructed otherwise.

8. Cross-document reasoning
Enable questions like:
Compare the ADR Act with the UNCITRAL Model Law.
The system retrieves relevant sections from both documents and compares them.

9. Legal grounding rules
To minimise hallucinations:
Always retrieve source documents before generating an answer.
Instruct the model not to invent authorities.
If no supporting authority is found, it should state:"I could not locate authority for this proposition in the available legal library."

Recommended technology stack
Frontend: Flutter
Storage: Supabase Storage
Database: PostgreSQL (Supabase)
Vector Search: pgvector
Embeddings: OpenAI, Gemini, Voyage AI, or Jina AI
AI Model: GPT-5.5, Gemini 2.5, or another high-quality reasoning model
Backend: Supabase Edge Functions or a FastAPI service
A feature that would set CIMA AI apart
Create a Legal Knowledge Workspace where every law, case, treaty, arbitration rule, or uploaded file has:
A full PDF/DOCX viewer.
AI chat specifically for that document.
Automatic summaries and key principles.
Extracted citations and cross-references.
Links to related legislation and cases.
AI-generated timelines for cases.
One-click drafting of legal opinions, submissions, and arbitration documents based on the selected authorities.
This approach gives users both access to the original legal materials and trustworthy AI responses grounded in those materials, which is essential for a professional legal research platform.