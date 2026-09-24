import React from 'react'
import KidsIconsSection from './components/KidsIconsSection'
import KidsclubCarousel from './components/KidsclubCarousel'
import KidsMomentCarousel from './components/KidsMomentCarousel'
import CuisinesCarousel from '../restaurants/components/CuisinesCarousel'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'
import BannerDark from '../GeneralComponents/BannerDark'
import ClinaryReverseInfo from '../restaurants/components/ClinaryReverseInfo'
import { readKidsClubPageLocale } from '@/lib/azura-kidsclub-content'

export const dynamic = 'force-dynamic';
export default async function Page({ params }) {
  const { locale } = await params;
  const { texts: t, images, activities, pools } = await readKidsClubPageLocale(locale);
  return (
    <div className='overflow-hidden flex flex-col items-center justify-center gap-[60px] md:gap-[80px] lg:gap-[100px] bg-[#fbfbfb]'>
      <BannerDark img={images.hero} span={t.hero.subtitle} header={t.hero.title} text={t.hero.text}/>
      <ClinaryReverseInfo img1={images.info.primary} img2={images.info.secondary} span={t.info.subtitle} header={t.info.title} text1={t.info.text} text2=""/>
      <KidsIconsSection texts={t.icons}/>
      <KidsclubCarousel texts={t.activities} items={activities}/>
      <CuisinesCarousel span={t.pools.subtitle} header={t.pools.title} text={t.pools.text} cuisines={pools}/>
      <KidsMomentCarousel showheader={true} images={images.moments} header={t.moments.title}/>
      <ContactSection2/>
    </div>
  )
}
