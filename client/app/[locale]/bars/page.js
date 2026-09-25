import ClinaryInfoSection from '../restaurants/components/ClinaryInfoSection'
import DiscoverBackground from '../restaurants/components/DiscoverBackground'
import BackgroundSection from '../rooms/subroomComponent/components/BackgroundSection'
import OtherOptions4 from './components/OtherOptions4'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'
import BannerDark from '../GeneralComponents/BannerDark'
import { readBarsPageLocale } from '@/lib/azura-bars-content'

export const dynamic = 'force-dynamic';
export default async function Page({ params }) {
  const { locale } = await params;
  const { texts: t, images, cards } = await readBarsPageLocale(locale);
  return (
    <div className='flex flex-col items-center justify-center gap-[60px] md:gap-[80px] lg:gap-[100px] bg-[#fbfbfb] overflow-x-hidden'>
      <BannerDark img={images.hero} span={t.hero.subtitle} header={t.hero.title} text={t.hero.text}/>
      <ClinaryInfoSection img1={images.primary} img2={images.secondary} span={t.culinaryInfo.subtitle} header={t.culinaryInfo.title} texts={[t.culinaryInfo.text]}/>
      <BackgroundSection span={t.featureBackgrounds.bars.subtitle} header={t.featureBackgrounds.bars.title} texts={[t.featureBackgrounds.bars.text]} link="/" img={images.background}/>
      <OtherOptions4 span={t.bars.subtitle} header={t.bars.title} text={t.bars.text} images={cards}/>
      <DiscoverBackground span={t.discover.subtitle} header={t.discover.title} text={t.discover.text} link="/bars" img={images.discover}/>
      <ContactSection2/>
    </div>
  )
}
