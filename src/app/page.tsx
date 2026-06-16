import { Hero } from "@/components/chapters/hero/Hero";
import { Globe } from "@/components/chapters/globe/Globe";
import { Species } from "@/components/chapters/species/Species";

export default function Home() {
  return (
    <main className="relative">
      <Hero />
      <Globe />
      <Species />
    </main>
  );
}
