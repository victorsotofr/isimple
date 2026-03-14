import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Founder } from "@/components/Founder";
import { Problem } from "@/components/Problem";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Footer } from "@/components/Footer";
import { getWaitlistCount } from "@/lib/kv";

export const revalidate = 60;

export default async function Home() {
  let waitlistCount = 0;
  try {
    waitlistCount = await getWaitlistCount();
  } catch {
    // KV may not be available in dev
  }

  return (
    <>
      <Nav />
      <main>
        <Hero waitlistCount={waitlistCount} />
        <Founder />
        <Problem />
        <Features />
        <Pricing />
        <WaitlistForm />
      </main>
      <Footer />
    </>
  );
}
