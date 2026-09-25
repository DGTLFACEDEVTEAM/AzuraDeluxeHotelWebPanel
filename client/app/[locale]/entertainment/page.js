import React from 'react'
import MainBannerSection from './components/MainBannerSection'
import { readEntertainmentPageLocale } from '@/lib/azura-entertainment-content'
import ActivitiesSection from './components/ActivitiesSection'
import EntertainmentTypesSection from './components/EntertainmentTypesSection'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'

export const dynamic = 'force-dynamic';
const page = async ({ params }) => {
  const { locale } = await params;
  const { texts, images, activities, cards } = await readEntertainmentPageLocale(locale);
  return (
    <div className='flex flex-col items-center justify-center gap-[60px] md:gap-[80px] lg:gap-[100px] bg-[#fbfbfb] overflow-x-hidden'>
      <MainBannerSection img={images.hero}/>
      <ActivitiesSection texts={texts.activities} items={activities}/>
      <EntertainmentTypesSection texts={texts.gridSection} cards={cards}/>
      <ContactSection2/>
    </div>
  )
}

export default page
