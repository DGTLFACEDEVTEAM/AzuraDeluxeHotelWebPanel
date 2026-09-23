import React from 'react'
import Beach3 from './Components/Beach3'
import Beach4 from './Components/Beach4'
import Beach5 from './Components/Beach5'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'
import Form from '../GeneralComponents/Form'
import ClinaryInfoSection from '../restaurants/components/ClinaryInfoSection'
import BannerDark from '../GeneralComponents/BannerDark'
import { readBeachPoolsPageLocale } from "@/lib/azura-beachpools-content";
export const dynamic = "force-dynamic";


const Page = async ({ params }) => {
  const { locale } = await params;
  const { texts: t, images, slides, poolItems } = await readBeachPoolsPageLocale(locale);
  const texts = [t.info.text, t.info.span, t.info.list1, t.info.list2, t.info.list3];
  return (
    <div className='flex flex-col items-center justify-center bg-[#fbfbfb] gap-[60px] md:gap-[80px] lg:gap-[100px] overflow-hidden'>
    <BannerDark img={images.hero} span={t.hero.subtitle} header={t.hero.title} text={t.hero.text}/>
    <ClinaryInfoSection
            img1={images.info.primary}
            img2={images.info.secondary}
            span={t.info.subtitle}
            header={t.info.title}
            texts={texts}
          />
   
   
      <Beach3 texts={t.activities} slides={slides} />
      <Beach4 texts={t.video} />
   
      <Beach5 showLink={false} span={t.pools.subtitle} header={t.pools.title} text={t.pools.text} poolItems={poolItems}/>
      <ContactSection2 />
      <Form/>
   
    </div>
  )
}

export default Page