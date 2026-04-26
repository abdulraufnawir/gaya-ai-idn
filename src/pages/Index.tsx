import { useEffect } from 'react';
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import MarketplaceTrust from "@/components/MarketplaceTrust";
import ProductTiers from "@/components/ProductTiers";
import Stats from "@/components/Stats";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

const Index = () => {
  useEffect(() => {
    console.log('Index page is rendering on route:', window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-0">
      <Navigation />
      <Hero />
      <MarketplaceTrust />
      <ProductTiers />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <Footer />
    </div>
  );
};

export default Index;
