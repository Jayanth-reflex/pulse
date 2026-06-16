import { Hero } from "@/components/chapters/hero/Hero";
import { Globe } from "@/components/chapters/globe/Globe";
import { Species } from "@/components/chapters/species/Species";
import { Blooms } from "@/components/chapters/blooms/Blooms";
import { Seasons } from "@/components/chapters/seasons/Seasons";
import { Atlas } from "@/components/chapters/atlas/Atlas";
import { Close } from "@/components/chapters/close/Close";

export default function Home() {
  return (
    <main className="relative z-10">
      <Hero />
      <Globe />
      <Species />
      <Blooms />
      <Seasons />
      <Atlas />
      <Close />
    </main>
  );
}
