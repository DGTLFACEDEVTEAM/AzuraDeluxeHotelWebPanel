import React from 'react'
import {readCertificatesLocale} from '@/lib/azura-certificates-content'

import MainBanner2 from '../GeneralComponents/MainBanner2'
import CertificateSection1 from './components/CertificateSection1'
import Certificate from './components/Certificate'

export const dynamic='force-dynamic';
const page = async ({params}) => {
  const {locale}=await params;
  const {texts,hero,feature,images}=await readCertificatesLocale(locale);
  return (
    <div className='flex flex-col items-center justify-center gap-[50px] md:gap-[75px] lg:gap-[100px] overflow-hidden'>
      <MainBanner2 img={hero} span={texts.hero.eyebrow} header={texts.hero.title} opacity={true}/>
      <CertificateSection1 image={feature} {...texts.feature}/>
      <Certificate images={images} title={texts.gallery.title} modalAlt={texts.gallery.modalAlt}/>
    </div>
  )
}

export default page
