import React from 'react'

import Image from 'next/image'

const CertificateSection1 = ({image: img, eyebrow, title, text}) => {
  return (
    <div className='flex w-screen items-center justify-center'>
        <div className='flex flex-col-reverse lg:flex-row w-[80%] sm:w-[60.4%] md:w-[55%] lg:w-[76.8%] items-center justify-center gap-[15px] md:gap-[25px] lg:gap-[50px] '>
            <Image
            src={img}
            alt={img.alt}
            width={img.width}
            height={img.height}
            className='w-[100%] lg:w-auto max-h-[694px] object-cover shadow-lg transition-shadow duration-300 ease-in-out hover:shadow-xl'
            />
          

            <div className='flex flex-col items-start justify-start w-[100%] lg:w-[35%] lg:max-w-[450px] gap-[10px] lg:gap-[25px] text-lagoBlack font-jost text-start'>
            <span className="text-[12px] font-medium leading-[14.026px] tracking-[0.481px] uppercase">
             {eyebrow}
          </span>
          <h2 className="text-[28px] md:text-[36px] lg:text-[48px] font-normal font-marcellus leading-normal lg:leading-[57.707px] capsizedText2 capitalize">
          {title}
          </h2>
          
          <p className="text-[14px] md:text-[13.943px] lg:text-[16.03px] font-normal leading-[130%] lg:leading-[24.045px] leading-trim-both text-edge-cap capsizedText4">
        
          {text}</p>
            </div>
        </div>
      
    </div>
  )
}

export default CertificateSection1
