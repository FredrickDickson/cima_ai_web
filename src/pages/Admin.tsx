import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("rules");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Load existing documents
  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('ghana_laws')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError("");
      // Auto-fill title from filename
      if (!title) {
        setTitle(selectedFile.name.replace('.pdf', ''));
      }
    } else {
      setError("Please select a PDF file");
      setFile(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!file || !title) {
      setError("Please select a file and enter a title");
      return;
    }

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('legal-documents')
        .getPublicUrl(fileName);

      // Create document record using existing ghana_laws table
      const { error: dbError } = await supabase
        .from('ghana_laws')
        .insert({
          title,
          description,
          file_path: urlData.publicUrl,
          file_size: file.size,
          source_type: documentType === 'rules' ? 'regulation' : documentType,
          jurisdiction: 'ghana',
          uploaded_by: user?.id,
          processing_status: 'pending'
        } as any);

      if (dbError) throw dbError;

      setSuccess("Document uploaded successfully!");
      setFile(null);
      setTitle("");
      setDescription("");
      
      // Reload documents
      loadDocuments();

    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Delete from database using ghana_laws table
      const { error: dbError } = await supabase
        .from('ghana_laws')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      // Delete from storage (extract filename from path)
      const fileName = filePath.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('legal-documents')
          .remove([fileName]);
      }

      // Reload documents
      loadDocuments();
      setSuccess("Document deleted successfully");

    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-navy-950 text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-300 hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-navy-950 mb-4 flex items-center gap-2">
              <Upload size={20} />
              Upload Legal Document
            </h2>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-sm text-green-700">
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">
                  PDF File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  />
                  {file && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <FileText size={16} />
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  placeholder="e.g., Accra Arbitration Rules 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  placeholder="Brief description of the document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent bg-white"
                >
                  <option value="rules">Rules & Regulations</option>
                  <option value="precedents">Case Precedents</option>
                  <option value="statutes">Statutes & Acts</option>
                  <option value="guidelines">Guidelines</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full py-2.5 px-4 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload Document
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Document List */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-navy-950 mb-4 flex items-center gap-2">
              <FileText size={20} />
              Uploaded Documents
            </h2>

            {loadingDocs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">
                No documents uploaded yet
              </p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <FileText size={20} className="text-navy-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-navy-950 text-sm truncate">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {doc.file_name} • {(doc.file_size / 1024).toFixed(1)} KB
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {doc.document_type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id, doc.file_path)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-navy-950 mb-2">Document Processing</h3>
          <p className="text-sm text-slate-600 mb-3">
            After uploading a PDF, it will be automatically processed and indexed for semantic search. 
            The AI will be able to retrieve relevant sections from these documents when drafting or reviewing legal content.
          </p>
          <p className="text-sm text-slate-600">
            <strong>Note:</strong> For the ACCRA ARB RULES 2025.pdf, you can also use the ingestion script:
            <code className="ml-2 px-2 py-1 bg-slate-200 rounded text-xs">node scripts/ingest-pdf.mjs</code>
          </p>
        </div>
      </main>
    </div>
  );
}
