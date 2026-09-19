import SpaInfoSection from './components/SpaInfoSection'
import SpaHeaderSection from './components/SpaHeaderSection'
import MassageCarousel from './components/MassageCarousel'
import SpaTypesInfoSection from './components/SpaTypesInfoSection'
import SpaReverseInfo from './components/SpaReverseInfo'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'
import BannerDark from '../GeneralComponents/BannerDark'
import { readSpaWellnessPageLocale } from '@/lib/azura-spawellness-content'

export const dynamic = 'force-dynamic'

const Page = async ({ params }) => {
  const { locale } = await params
  const { texts, images } = await readSpaWellnessPageLocale(locale)
  const group = (value) => [value.subtitle, value.title, value.text]
  const spaTextsInfo1 = group(texts.info.intro)
  const spaTextsInfo2 = group(texts.info.sauna)
  const spaTextsInfo3 = [...group(texts.info.wellness), ...Array.from({length: 7}, (_, i) => texts.info.wellness[`list${i + 1}`])]

  return (
    <div className='flex flex-col items-center justify-center gap-[60px] md:gap-[80px] lg:gap-[100px] bg-[#fbfbfb] overflow-x-hidden'>
      <BannerDark img={images.hero} span={texts.hero.subtitle} header={texts.hero.title} text={texts.hero.text}/>
      <SpaInfoSection img1={images.info.wellness} img2={images.info.sauna} texts={spaTextsInfo1} texts2={spaTextsInfo2} texts3={spaTextsInfo3}/>
      <SpaHeaderSection span={texts.gallery.subtitle} header={texts.gallery.title} text={texts.gallery.text} images={images.gallery}/>
      <MassageCarousel span={texts.massage.subtitle} header={texts.massage.title} text={texts.massage.text} time={texts.massage.time} images={images.massage}/>
      <div className='flex flex-col gap-[40px] lg:gap-[50px]'>
      <SpaTypesInfoSection isImageLeft={true} showLink={false} span={texts.types.indoor.subtitle} header={texts.types.indoor.title} text={texts.types.indoor.text} img={images.types.indoor}/>
      <SpaReverseInfo isImageLeft={false} showLink={false} span={texts.types.turkishBath.subtitle} header={texts.types.turkishBath.title} text={texts.types.turkishBath.text} img={images.types.turkishBath}/>
      </div>
      <ContactSection2/>
    </div>
  )
}

export default Page
