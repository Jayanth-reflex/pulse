import { Hero } from "@/components/chapters/hero/Hero";
import { Globe } from "@/components/chapters/globe/Globe";
import { Species } from "@/components/chapters/species/Species";
import { Blooms } from "@/components/chapters/blooms/Blooms";
import { Seasons } from "@/components/chapters/seasons/Seasons";

export default function Home() {
  return (
    <main className="relative">
      <Hero />
      <Globe />
      <Species />
      <Blooms />
      <Seasons />
    </main>
  );
}
