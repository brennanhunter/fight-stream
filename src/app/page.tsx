import LogoBanner from '@/components/layout/LogoBanner';
import Hero from '@/components/hero/Hero';
import VideoSection from '@/components/video/VideoSection';
import StreamPlayer from '@/components/player/StreamPlayer';
import TaleOfTheTape from '@/components/fighters/TaleOfTheTape';
import FightCard from '@/components/event/FightCard';
import Undercard from '@/components/event/Undercard';
import PricingTiers from '@/components/payment/PricingTiers';
import EventDetails from '@/components/event/EventDetails';

export default function Home() {
  return (
    <>
      <LogoBanner />
      <Hero />
      <VideoSection />
    </>
  );
}
