import React from 'react'
import SpaInfoSection from '../spawellness/components/SpaInfoSection'
import SpaHeaderSection from '../spawellness/components/SpaHeaderSection'

import SpaTypesInfoSection from '../spawellness/components/SpaTypesInfoSection'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'
import BannerDark from '../GeneralComponents/BannerDark'
import SpaReverseInfo from "../spawellness/components/SpaReverseInfo"
import { readSporPageLocale } from "@/lib/azura-spor-content";

export const dynamic = "force-dynamic";

const group = t => [t.subtitle, t.title, t.text];
const Page = async ({ params }) => {
  const { locale } = await params;
  const { texts: t, images } = await readSporPageLocale(locale);
  const texts = group(t.info.intro);
  const texts2 = group(t.info.sauna);
  const texts3 = [...group(t.info.wellness), ...[1, 2, 3, 4].map(i => t.info.wellness[`list${i}`])];
  return (
    <div className='flex flex-col items-center justify-center gap-[100px] bg-[#fbfbfb] overflow-x-hidden'>
      <BannerDark img={images.hero} span={t.hero.subtitle} header={t.hero.title} text={t.hero.text}/>
      <SpaInfoSection img1={images.info.wellness} img2={images.info.sauna} texts={texts} texts2={texts2} texts3={texts3}/>
      <SpaHeaderSection span={t.gallery.subtitle} header={t.gallery.title} text={t.gallery.text} images={images.gallery}/>
      <SpaTypesInfoSection isImageLeft={true} showLink={false} span={t.types.fitness.subtitle} header={t.types.fitness.title} text={t.types.fitness.text} img={images.types.fitness}/>
      <SpaReverseInfo isImageLeft={false} showLink={false} header={t.types.personalTrainer.title} text={t.types.personalTrainer.text} img={images.types.personalTrainer}/>
      <ContactSection2/>
    </div>
  )
}

export default Page
