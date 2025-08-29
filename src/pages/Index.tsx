import { useEffect } from 'react';
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

const Index = () => {
  useEffect(() => {
    // Debug log to confirm this component is rendering
    console.log('Index page is rendering on route:', window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-0">
      <Navigation />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  );
};

export default Index;
