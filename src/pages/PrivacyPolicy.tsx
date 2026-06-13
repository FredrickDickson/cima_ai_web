import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold text-navy-950 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 mb-8">Last updated: June 13, 2026</p>

        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              CIMA AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our 
              AI-powered legal intelligence platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-navy-900 mb-2">Personal Information</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
              <li>Name and contact information (email, phone)</li>
              <li>Professional information (role, organization)</li>
              <li>Account credentials (encrypted passwords)</li>
              <li>Payment information (processed securely via third-party providers)</li>
            </ul>
            <h3 className="text-lg font-medium text-navy-900 mb-2">Usage Information</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Documents you upload for analysis and review</li>
              <li>Search queries and research activities</li>
              <li>Drafts and documents you create using our tools</li>
              <li>AI interactions and generated content</li>
              <li>Device information and IP address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">3. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Provide and improve our AI-powered legal services</li>
              <li>Process and analyze legal documents you submit</li>
              <li>Generate insights, summaries, and recommendations</li>
              <li>Authenticate users and secure accounts</li>
              <li>Send important updates and service communications</li>
              <li>Comply with legal obligations</li>
              <li>Prevent fraud and ensure platform security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">4. Data Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mt-3">
              <li>End-to-end encryption for data in transit</li>
              <li>Secure storage with access controls</li>
              <li>Regular security audits and penetration testing</li>
              <li>Compliance with Ghana Data Protection Act 2012</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">5. AI and Machine Learning</h2>
            <p className="text-slate-600 leading-relaxed">
              Our AI models may be trained on anonymized and aggregated data to improve service quality. 
              Your specific documents and conversations are not used to train public AI models. We maintain 
              strict separation between user data and model training processes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">6. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your information for as long as necessary to provide our services and comply with 
              legal obligations. You may request deletion of your account and associated data at any time, 
              subject to legal and regulatory requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">7. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed">
              We may use third-party services for payment processing, analytics, and infrastructure. 
              These services have their own privacy policies, and we are not responsible for their practices. 
              We only share information necessary for these services to function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">8. Your Rights</h2>
            <p className="text-slate-600 leading-relaxed mb-3">Under Ghana's Data Protection Act, you have the right to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">9. Legal Documents and Confidentiality</h2>
            <p className="text-slate-600 leading-relaxed">
              Legal documents you upload are treated with strict confidentiality. We do not share your 
              documents with third parties except as required by law or with your explicit consent. 
              Attorney-client privileged documents remain protected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">10. Children's Privacy</h2>
            <p className="text-slate-600 leading-relaxed">
              Our Service is not intended for children under 18. We do not knowingly collect personal 
              information from minors. If we become aware of such collection, we will take immediate steps 
              to delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">11. International Data Transfers</h2>
            <p className="text-slate-600 leading-relaxed">
              Your data may be transferred to and processed in countries other than Ghana. We ensure 
              appropriate safeguards are in place to protect your data in accordance with applicable 
              data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">12. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes by email or through our platform. Your continued use of the Service after such 
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-950 mb-3">13. Contact Information</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions about this Privacy Policy or to exercise your data rights, please contact us at:
            </p>
            <p className="text-slate-600 mt-2">
              Email: privacy@cimaafrica.com<br />
              Address: Accra, Ghana
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
