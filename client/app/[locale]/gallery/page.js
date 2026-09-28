import React from 'react'
import MainBanner2 from '../GeneralComponents/MainBanner2'
import mainImg from "./images/Banner.jpg"
import GalleryScrollSection from './components/GalleryScrollSection'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2'
import {getTranslations} from 'next-intl/server';
import {readGalleryLocale} from '@/lib/azura-gallery-content';
export const dynamic = 'force-dynamic';

const Page = async ({ params }) => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Gallery' });
  const categories = await readGalleryLocale(locale);
  
  return (
    <div className='flex flex-col items-center justify-center overflow-hidden gap-[100px] bg-[#fbfbfb]'>
     <div className='flex flex-col items-center justify-center'>
     <MainBanner2 img={mainImg} span={t("subtitle")} header={t("title")}/>
     <GalleryScrollSection categories={categories}/>
     </div>
      <ContactSection2/>
    </div>
  )
}

export default Page
