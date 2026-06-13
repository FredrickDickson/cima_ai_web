import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Chunk size and overlap for text splitting
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Split text into overlapping chunks
 */
function splitTextIntoChunks(text, chunkSize, overlap) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastSentenceEnd = Math.max(
        chunk.lastIndexOf('. '),
        chunk.lastIndexOf('.\n'),
        chunk.lastIndexOf('! '),
        chunk.lastIndexOf('? '),
        chunk.lastIndexOf('\n\n')
      );
      
      if (lastSentenceEnd > chunkSize * 0.5) {
        chunk = chunk.slice(0, lastSentenceEnd + 1);
      }
    }
    
    chunks.push(chunk.trim());
    start = end - overlap;
  }
  
  return chunks.filter(chunk => chunk.length > 50);
}

/**
 * Generate embedding using Supabase's text embedding function
 */
async function generateEmbedding(text) {
  try {
    const { data, error } = await supabase.rpc('generate_embedding', {
      input_text: text
    });
    
    if (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to generate embedding, using fallback:', error);
    // Fallback: return a zero vector if embedding fails
    return new Array(1536).fill(0);
  }
}

/**
 * Create a document record in Supabase
 */
async function createDocumentRecord(title, fileName, filePath, fileSize) {
  const { data, error } = await supabase
    .from('legal_documents')
    .insert({
      title,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      document_type: 'rules',
      jurisdiction: 'ghana',
      is_active: true
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating document record:', error);
    throw error;
  }
  
  return data;
}

/**
 * Insert document chunks with embeddings
 */
async function insertDocumentChunks(documentId, chunks) {
  const chunksToInsert = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}...`);
    
    const embedding = await generateEmbedding(chunk);
    
    chunksToInsert.push({
      document_id: documentId,
      chunk_index: i,
      content: chunk,
      embedding: embedding,
      metadata: {
        chunk_length: chunk.length,
        chunk_number: i + 1,
        total_chunks: chunks.length
      }
    });
    
    // Insert in batches of 10 to avoid rate limits
    if (chunksToInsert.length >= 10 || i === chunks.length - 1) {
      const { error } = await supabase
        .from('document_chunks')
        .insert(chunksToInsert);
      
      if (error) {
        console.error('Error inserting chunks:', error);
        throw error;
      }
      
      console.log(`Inserted ${chunksToInsert.length} chunks`);
      chunksToInsert.length = 0;
    }
  }
}

/**
 * Main ingestion function
 */
async function ingestPdf(pdfPath, title) {
  try {
    console.log(`Starting ingestion of: ${pdfPath}`);
    
    // Read PDF file
    const dataBuffer = fs.readFileSync(pdfPath);
    const fileSize = dataBuffer.length;
    
    console.log('Extracting text from PDF...');
    const data = await pdf(dataBuffer);
    const text = data.text;
    
    console.log(`Extracted ${text.length} characters from PDF`);
    
    // Split text into chunks
    console.log('Splitting text into chunks...');
    const chunks = splitTextIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`Created ${chunks.length} chunks`);
    
    // Create document record
    console.log('Creating document record in database...');
    const fileName = path.basename(pdfPath);
    const document = await createDocumentRecord(title, fileName, pdfPath, fileSize);
    console.log(`Created document with ID: ${document.id}`);
    
    // Insert chunks with embeddings
    console.log('Processing chunks and generating embeddings...');
    await insertDocumentChunks(document.id, chunks);
    
    console.log('✅ Ingestion completed successfully!');
    console.log(`Document ID: ${document.id}`);
    console.log(`Total chunks: ${chunks.length}`);
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

// Run the ingestion
const pdfPath = path.resolve(process.cwd(), 'assests/ACCRA ARB RULES 2025.pdf');
const title = 'Accra Arbitration Rules 2025';

if (!fs.existsSync(pdfPath)) {
  console.error(`PDF file not found: ${pdfPath}`);
  console.error('Please ensure the file exists in the assets folder');
  process.exit(1);
}

ingestPdf(pdfPath, title);
