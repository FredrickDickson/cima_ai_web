import { Navigation } from '../components/landing/Navigation';
import { Hero } from '../components/landing/Hero';
import { TrustedBy } from '../components/landing/TrustedBy';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { WhyCima } from '../components/landing/WhyCima';
import { Testimonials } from '../components/landing/Testimonials';
import { FAQ } from '../components/landing/FAQ';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';

export default function Landing() {
  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <TrustedBy />
      <Features />
      <HowItWorks />
      <WhyCima />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
