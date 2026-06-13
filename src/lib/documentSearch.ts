import { supabase } from './supabase';

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_index: number;
  content: string;
  similarity: number;
  metadata: any;
}

/**
 * Generate embedding for a query text
 * Note: This requires a Supabase Edge Function or RPC function that generates embeddings
 * For now, we'll use a placeholder - you'll need to implement the actual embedding generation
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // This calls a Supabase RPC function that should be created separately
    // For now, return a placeholder zero vector
    // TODO: Implement actual embedding generation using OpenAI or similar
    const { data, error } = await supabase.rpc('generate_embedding', {
      input_text: text
    }) as any;
    
    if (error) {
      console.error('Error generating embedding:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
    
    return data || new Array(1536).fill(0);
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return new Array(1536).fill(0);
  }
}

/**
 * Search for relevant document chunks using semantic search
 * Uses existing ghana_laws and legal_chunks tables
 */
export async function searchDocumentChunks(
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {}
): Promise<SearchResult[]> {
  const {
    matchThreshold = 0.7,
    matchCount = 5
  } = options;

  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    
    // Perform semantic search using cosine similarity on existing tables
    const { data, error } = await supabase
      .from('legal_chunks')
      .select(`
        id,
        document_id,
        chunk_index,
        content,
        metadata,
        ghana_laws!inner (
          id,
          title,
          source_type,
          jurisdiction
        )
      `)
      .gte('similarity', matchThreshold)
      .order('embedding', { ascending: false })
      .limit(matchCount);

    if (error) {
      console.error('Error searching document chunks:', error);
      throw error;
    }

    // Transform data to match SearchResult interface
    const results = (data || []).map((item: any) => ({
      chunk_id: item.id,
      document_id: item.document_id,
      document_title: item.ghana_laws.title,
      chunk_index: item.chunk_index,
      content: item.content,
      similarity: 1 - (item.embedding ? calculateCosineSimilarity(embedding, item.embedding) : 0),
      metadata: item.metadata
    }));

    return results;
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Get formatted context from search results for AI prompts
 */
export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return '';
  }

  return results
    .map((result) => {
      return `[Source: ${result.document_title}, Section ${result.chunk_index + 1}]
${result.content}`;
    })
    .join('\n\n');
}

/**
 * Search and return formatted context for AI
 */
export async function getRelevantRulesContext(
  query: string,
  maxResults: number = 3
): Promise<string> {
  const results = await searchDocumentChunks(query, {
    matchCount: maxResults
  });

  if (results.length === 0) {
    return '';
  }

  return `Relevant Rules and Regulations:\n${formatSearchContext(results)}`;
}
