import React from 'react'
import Link from 'next/link';

export default function HomePage1({ welcomeText }) {
  return (
    <div className='flex flex-col w-full items-center justify-center my-[50px]'>
      <div className="flex flex-col w-[87.79%] md:w-[91.4%] lg:w-[76.8%] gap-[15px] md:gap-[25px] lg:gap-[35px] items-center justify-center text-center text-[#000] font-jost">
      <span className=' text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase'>
      {welcomeText.subtitle}
      </span>
      <h2 className='text-[28px] md:text-[38px] lg:text-[48px] font-marcellus font-normal leading-normal lg:leading-[57.6px] lg:capsizedText2'>
     {welcomeText.title}
      </h2>
      <p className=' text-center text-[14px] md:text-[16px] font-normal leading-[20.8px] lg:leading-[24px] md:max-w-[490px] lg:max-w-[736px]'>
      {welcomeText.text}
      </p>
      <Link href="/about" className='hidden lg:flex underline underline-offset-[6px] text-lagoBrown text-[16px] font-normal uppercase leading-[30px] font-marcellus'>
      {welcomeText.buttonText}
      </Link>

      </div>
      
    </div>
  )
}
