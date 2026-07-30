import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { count: completed } = await supabase.from('legal_library_documents').select('*', { count: 'exact', head: true }).eq('ingestion_status', 'completed');
const { count: failed } = await supabase.from('legal_library_documents').select('*', { count: 'exact', head: true }).eq('ingestion_status', 'failed');
console.log(`completed=${completed} failed=${failed} of 18248 total`);
