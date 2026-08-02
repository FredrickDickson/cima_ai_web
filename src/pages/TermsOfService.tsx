import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export default function TermsOfService() {
  useDocumentTitle("Terms of Service — CIMA AI");
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-navy-950 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500">
            <Scale className="w-4 h-4 text-navy-950" />
          </div>
          <span className="font-bold text-lg">CIMA AI</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-navy-950 mb-2">Terms of Service</h1>
        <p className="text-slate-500 mb-8">Last updated: June 13, 2026</p>

        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing and using CIMA AI ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">2. Description of Service</h2>
            <p className="text-slate-600 leading-relaxed">
              CIMA AI provides AI-powered legal intelligence services including legal research, contract review, 
              document drafting, and case management tools specifically designed for arbitration practitioners, 
              lawyers, and legal professionals in Ghana and beyond.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">3. User Responsibilities</h2>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>You must be at least 18 years old to use this Service</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You agree to use the Service only for lawful purposes and in accordance with these Terms</li>
              <li>You must not use the Service to provide legal advice unless you are a licensed legal professional</li>
              <li>You are responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">4. Intellectual Property</h2>
            <p className="text-slate-600 leading-relaxed">
              All content, features, and functionality of CIMA AI are owned by CIMA AI and are protected by 
              international copyright, trademark, and other intellectual property laws. You may not reproduce, 
              modify, or distribute any part of the Service without explicit written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">5. AI-Generated Content Disclaimer</h2>
            <p className="text-slate-600 leading-relaxed">
              CIMA AI uses artificial intelligence to assist with legal research and document analysis. 
              While we strive for accuracy, AI-generated content should be reviewed and verified by qualified 
              legal professionals before use in legal proceedings. CIMA AI is not responsible for decisions 
              made based on AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">6. Privacy and Data Protection</h2>
            <p className="text-slate-600 leading-relaxed">
              Your privacy is important to us. Please review our <Link to="/privacy" className="text-navy-700 hover:text-gold-600 underline">Privacy Policy</Link> 
              to understand how we collect, use, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">7. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              CIMA AI shall not be liable for any indirect, incidental, special, consequential, or punitive 
              damages resulting from your use or inability to use the Service. The Service is provided "as is" 
              without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">8. Termination</h2>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these 
              Terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">9. Governing Law</h2>
            <p className="text-slate-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Ghana. 
              Any disputes arising under these Terms shall be resolved in the courts of Ghana.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">10. Contact Information</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions about these Terms of Service, please contact us at info@thecima.org
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-navy-700 hover:text-gold-600 font-medium">
            ← Back to Login
          </Link>
        </div>
      </main>
    </div>
  );
}
