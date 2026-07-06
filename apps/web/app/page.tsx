import Nav from "./components/nav";
import Hero from "./components/hero";
import Features from "./components/features";
import Personas from "./components/personas";
import CTASection from "./components/cta-section";
import Footer from "./components/footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <Personas />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}