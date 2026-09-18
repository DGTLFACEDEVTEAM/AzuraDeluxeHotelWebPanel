import React from 'react'
import ClinaryInfoSection from './components/ClinaryInfoSection'
import MainRestaurantSection from './components/MainRestaurantSection'
import CuisinesCarousel from './components/CuisinesCarousel'
import ClinaryReverseInfo from './components/ClinaryReverseInfo'
import DiscoverBackground from './components/DiscoverBackground'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'
import BannerDark from '../GeneralComponents/BannerDark'
import { readRestaurantsPageLocale, RESTAURANT_CAROUSEL_KEYS } from '@/lib/azura-restaurants-storage.mjs'

export const dynamic = 'force-dynamic'

const FIRST_LINKS = Object.freeze({
  orchestra: 'restaurants/orchestrarestaurant',
  bellaAzura: '/restaurants/bellaazura',
  ottoman: '/restaurants/ottomanrestaurant',
})
const SECOND_LINKS = Object.freeze({
  patisserie: '/restaurants/patisserie',
  mazurka: '/restaurants/mazurka',
  lyric: '/restaurants/lyric',
})

const Page = async ({ params }) => {
  const { locale } = await params
  const { texts, images } = await readRestaurantsPageLocale(locale)

  const cuisines = RESTAURANT_CAROUSEL_KEYS.alacarteCarousel.map((key, index) => ({
    id: index + 1,
    img: images.alacarteCarousel.cards[key],
    title: texts.alacarteCarousel.cards[key].title,
    description: texts.alacarteCarousel.cards[key].subtitle,
    text: texts.alacarteCarousel.cards[key].text,
    link: FIRST_LINKS[key],
  }))
  const cuisines2 = RESTAURANT_CAROUSEL_KEYS.dessertsCarousel.map((key, index) => ({
    id: index + 1,
    img: images.dessertsCarousel.cards[key],
    title: texts.dessertsCarousel.cards[key].title,
    description: texts.dessertsCarousel.cards[key].subtitle,
    text: texts.dessertsCarousel.cards[key].text,
    link: SECOND_LINKS[key],
  }))
  const textsClinary = [texts.intro.text, texts.intro.span, texts.intro.list1]

  return (
    <div className='overflow-hidden items-center justify-center flex flex-col gap-[60px]  md:gap-[80px] lg:gap-[100px] bg-[#fbfbfb]'>
      <BannerDark img={images.hero} span={texts.hero.subtitle} header={texts.hero.title} text={texts.hero.text}/>
      <ClinaryInfoSection img1={images.intro.primary} img2={images.intro.secondary} span={texts.intro.subtitle} header={texts.intro.title} texts={textsClinary} />
      <MainRestaurantSection content={texts.mainRestaurant} image={images.mainRestaurant}/>
      <CuisinesCarousel span={texts.alacarteCarousel.subtitle} header={texts.alacarteCarousel.title} text={texts.alacarteCarousel.text} cuisines={cuisines}/>
      <ClinaryReverseInfo img1={images.reverse.primary} img2={images.reverse.secondary} span={texts.reverse.span} header={texts.reverse.title} text1={texts.reverse.text} text2={texts.reverse.text2}/>
      <div className='flex flex-col relative'>
        <CuisinesCarousel span={texts.dessertsCarousel.subtitle} header={texts.dessertsCarousel.title} text={texts.dessertsCarousel.text} cuisines={cuisines2}/>
      </div>
      <DiscoverBackground span={texts.discover.subtitle} header={texts.discover.title} text={texts.discover.text} link="/bars" img={images.discover}/>
      <ContactSection2/>
    </div>
  )
}

export default Page
