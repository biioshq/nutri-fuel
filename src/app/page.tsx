import { Hero } from '@/components/sections/Hero';
import { Flavours } from '@/components/sections/Flavours';
import { WhyUs } from '@/components/sections/WhyUs';
import { Nutrition } from '@/components/sections/Nutrition';
import { Showcase } from '@/components/sections/Showcase';
import { Results } from '@/components/sections/Results';
import { Faq } from '@/components/sections/Faq';
import { FinalCta } from '@/components/sections/FinalCta';
import { Ventures } from '@/components/sections/Ventures';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Flavours />
      <WhyUs />
      <Nutrition />
      <Showcase />
      <Results />
      <Faq />
      <FinalCta />
      <Ventures />
    </>
  );
}
