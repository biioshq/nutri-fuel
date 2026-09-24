import { Hero } from '@/components/sections/Hero';
import { Flavours } from '@/components/sections/Flavours';
import { ProteinStat } from '@/components/sections/ProteinStat';
import { Showcase } from '@/components/sections/Showcase';
import { Results } from '@/components/sections/Results';
import { FinalCta } from '@/components/sections/FinalCta';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Flavours />
      <ProteinStat />
      <Showcase />
      <Results />
      <FinalCta />
    </>
  );
}
