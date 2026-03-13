import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
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
        {/* Open: Hero */}
        <Hero waitlistCount={waitlistCount} />

        {/* Rounded container: Problem */}
        <div className="mx-3 rounded-2xl bg-blue px-5 py-10 sm:mx-6 sm:rounded-3xl sm:px-10 sm:py-12">
          <Problem />
        </div>

        {/* Open: Features */}
        <Features />

        {/* Rounded container: Pricing */}
        <div className="mx-3 rounded-2xl bg-blue px-5 py-10 sm:mx-6 sm:rounded-3xl sm:px-10 sm:py-12">
          <Pricing />
        </div>

        {/* Open: Waitlist */}
        <WaitlistForm />
      </main>
      <Footer />
    </>
  );
}
