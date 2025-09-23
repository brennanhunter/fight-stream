import HeroBanner from '@/components/hero/HeroBanner';
import StreamPlayer from '@/components/player/StreamPlayer';
import TaleOfTheTape from '@/components/fighters/TaleOfTheTape';
import FightCard from '@/components/event/FightCard';
import Undercard from '@/components/event/Undercard';
import PricingTiers from '@/components/payment/PricingTiers';
import EventDetails from '@/components/event/EventDetails';

export default function Home() {
  return (
    <>
      <HeroBanner />
      <StreamPlayer />
      <TaleOfTheTape />
      <FightCard />
      <Undercard />
      <PricingTiers />
      <EventDetails />
    </>
  );
}
