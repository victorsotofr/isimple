import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Features />
        <Pricing />
        <WaitlistForm />
      </main>
      <Footer />
    </>
  );
}
