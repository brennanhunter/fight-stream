// import Hero from '@/components/hero/Hero';
// import Footer from '@/components/layout/Footer';
// import VideoSection from '@/components/video/VideoSection';
// import ResumeWatchingBanner from '@/components/ResumeWatchingBanner';
import IVSVideoPlayer from '@/components/player/IVSVideoPlayer';


export default function Home() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* <Hero /> */}
      {/* <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ResumeWatchingBanner />
      </div> */}
      {/* <VideoSection /> */}
      {/* <Footer /> */}
      <IVSVideoPlayer />
    </div>
  );
}
