import React from 'react'
import MainBanner2 from '../GeneralComponents/MainBanner2'
import SpaReverseInfo from '../spawellness/components/SpaReverseInfo'
import MissionVisionSection from './components/MissionVisionSection'
import KidsMomentCarousel from '../kidsclub/components/KidsMomentCarousel'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'
import { readAboutPageLocale } from '@/lib/azura-about-content'

export const dynamic = 'force-dynamic'

const Page = async ({ params }) => {
  const { locale } = await params
  const { texts, images } = await readAboutPageLocale(locale)

  return (
    <div className='flex flex-col items-center justify-center gap-[60px] md:gap-[80px] lg:gap-[100px] bg-[#fbfbfb] overflow-x-hidden'>
      <MainBanner2 span={texts.hero.subtitle} header={texts.hero.title} img={images.hero}/>
      <SpaReverseInfo isImageLeft={false} span={texts.location.subtitle} header={texts.location.title} text={texts.location.text} buttonText={texts.location.buttonText} link="/" showLink={true} img={images.location}/>
      <KidsMomentCarousel showheader={false} header="" images={images.moments}/>
      <MissionVisionSection content={texts.missionVision} leftImg={images.missionVision.mission} rightImg={images.missionVision.vision} showLink={false}/>
      {/* The former Slider1 call had no slides and threw during rendering. No About discovery content is defined. */}
      <ContactSection2/>
    </div>
  )
}

export default Page
