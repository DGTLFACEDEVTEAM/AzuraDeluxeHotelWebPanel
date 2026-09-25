import Image from 'next/image'
import React from 'react'
const ActivitiesSection = ({ texts, items }) => {
  const daytime = items[0].img;
  const nighttime = items[1].img;

  return (
    <div className='flex w-screen h-auto  items-center justify-center'>
      <div className='flex flex-col w-full items-center justify-center gap-[30px] lg:gap-[50px]'>
        <div className='flex flex-col  w-[87.79%] md:w-[91.4%] lg:w-[76.8%] gap-[15px] md:gap-[25px] lg:gap-[35px] items-center justify-center text-black font-jost text-center max-w-[1106px]'>
            <span className='text-[12px] leading-[14px] font-medium uppercase tracking-[0.48px]'>{texts.subtitle}</span>
            <h2 className='text-[28px] md:text-[32px] lg:text-[48px] leading-[120%] lg:leading-[57.6px] font-normal font-marcellus lg:capsizedText2'>{texts.title}</h2>
            <p className='text-[14px] leading-[18px] lg.text-[16px] font-normal lg:leading-[24px] lg:w-[55%]'>{texts.text} </p>
        </div>

        <div className='flex w-full items-center justify-center relative max-w-[1440px]'>
           <div className='flex flex-col md:flex-row  w-[87.79%] md:w-[91.4%] lg:w-[76.8%] gap-[20px] lg:gap-[30px] items-center justify-center '>

           <div className='flex flex-col  w-[300px] md:w-[538px] h-full relative'>
           <Image src={daytime} alt={daytime.alt} width={daytime.width} height={daytime.height} className='w-full'/>
           <div className='flex flex-col absolute bottom-[38px] left-[35px] items-start justify-center text-start gap-[25px] pb-[10px] text-white '>
            <span className='text-[12px] font-normal uppercase  font-jost leading-normal tracking-[0.48px]'>{items[0].span}</span>
            <h4 className='font-marcellus text-[30px] font-normal capsizedText3 leading-[40px]'>{items[0].title}</h4>
           </div>
           </div>
           
            <div className='flex flex-col w-[300px] md:w-[538px] h-full relative'>
            <Image src={nighttime} alt={nighttime.alt} width={nighttime.width} height={nighttime.height} className='w-full'/>
           <div className='flex flex-col absolute bottom-[38px] left-[35px] items-start justify-center text-start gap-[15px] md:gap-[25px] pb-[10px] text-white '>
            <span className='text-[12px] font-normal uppercase  font-jost leading-normal tracking-[0.48px]'>{items[1].span}</span>
            <h4 className='font-marcellus text-[30px] font-normal leading-[120%] lg:capsizedText3 '>{items[1].title}</h4>
           </div>
           </div>
           </div>

        </div>
       
      </div>
    </div>
  )
}

export default ActivitiesSection
