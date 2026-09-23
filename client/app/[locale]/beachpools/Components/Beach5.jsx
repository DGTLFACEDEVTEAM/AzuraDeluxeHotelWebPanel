"use client";
import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image"
import Link from 'next/link'
import SwimmingSvg from "../Images/Icons/SwimmingSvg"
import Swimming2Svg from "../Images/Icons/Swimming2Svg"
import Swimming3Svg from "../Images/Icons/Swimming3Svg"

const Beach5 = ({span,header,text,poolItems, showLink,links=[]}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({  loop: true,
    align: "start",
    startIndex: 0, });

  const [selectedIndex, setSelectedIndex] = useState(0);
    
  const scrollPrev = useCallback(() => {
    if (emblaApi && emblaApi.scrollPrev) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi && emblaApi.scrollNext) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on("select", () => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
      });
      setSelectedIndex(emblaApi.selectedScrollSnap());
    }
  }, [emblaApi]);


  return (
    <div className='flex flex-col w-full max-w-[1440px] items-center justify-center gap-[30px] lg:gap-[50px]'>
        <div className='flex flex-col justify-start items-start  w-[87.79%] md:w-[91.4%] lg:w-[76.8%] gap-[15px] md:gap-[25px] lg:gap-[35px]'>
            <p className='font-jost text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase'>
            {span}
            </p>
            <h4 className='font-marcellus text-[28px] md:text-[32px] lg:text-[48px] leading-[57.6px] capsizedText2'>
             {header}
            </h4>
            <p className='font-jost text-[14px] lg:text-[16px] leading-[24px] lg:w-[65.6%] capsizedText4'>
             {text}
            </p>
        </div>
        {/* Havuz içeriklerini grid yapısında 3 sütun 3 satır şeklinde düzenliyoruz ve gap'ı azaltıyoruz */}
       {/* Desktop için */}
<div className="hidden lg:flex flex-col w-[87.79%] md:w-[91.4%] lg:w-[76.8%] gap-[30px]">
  {/* İlk satır: İlk 2 öğe */}
  <div className="grid grid-cols-2 gap-[30px]">
    {poolItems.slice(0, 2).map((pool, index) => (
      <div key={index} className="flex flex-col gap-[20px] lg:gap-[25px] w-full mb-[20px]">
        {/* İçerik */}
        <div className='relative group'>
          <Image 
            src={pool.src} 
            alt={pool.alt ?? pool.title}
            width={349} 
            height={233}
            className="object-cover w-full transition-opacity duration-300 group-hover:opacity-0"
          />
          <div className="flex absolute inset-0 items-center justify-center gap-[30px] bg-cover bg-center top-0 left-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 text-white font-jost text-[16px]" style={{ backgroundImage: `url(${pool.hoverSrc.src})` }}>
            <div className="absolute inset-0 bg-black/40 z-[1]"></div>
            <div className="flex flex-col gap-[12.25px] items-center justify-center text-center z-[20]">
              <SwimmingSvg className="flex"/>
              <p>{pool.icontext}</p>
            </div>
            <div className="flex flex-col gap-[12.25px] items-center justify-center text-center z-[20]">
              <Swimming2Svg className="flex"/>
              <p>{pool.icontext2}</p>
            </div>
            <div className="flex flex-col gap-[12.25px] items-center justify-center text-center z-[20]">
              <Swimming3Svg className="flex"/>
              <p>{pool.icontext3}</p>
            </div>
          </div>
        </div>
        <p className="font-jost text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase ">
          {pool.subtitle}
        </p>
        <h5 className="font-marcellus text-[25px] leading-normal whitespace-nowrap lg:leading-normal uppercase lg:capsizedText3">
          {pool.title}
        </h5>
        <p className="font-jost text-[12px] lg:text-[14px] leading-[21px] lg:capsizedText4">
          {pool.description}
        </p>
        {showLink && (
          <Link href={links[index]} className="flex w-[147px] py-[14px] whitespace-nowrap px-[28px] font-jost text-[14px] text-lagoBrown font-medium leading-[30px] max-h-[41px] items-center justify-center border border-lagoBrown shadow-buttonCustom uppercase">
           
          </Link>
        )}
      </div>
    ))}
  </div>

  {/* İkinci ve sonraki satırlar: Geri kalan öğeler */}
  <div className="grid grid-cols-3 gap-[30px]">
    {poolItems.slice(2).map((pool, index) => (
      <div key={index + 2} className="flex flex-col gap-[20px] lg:gap-[25px] w-full mb-[20px]">
        {/* İçerik aynı şekilde */}
        <div className='relative group'>
          <Image 
            src={pool.src} 
            alt={pool.alt ?? pool.title}
            width={349} 
            height={233}
            className="object-cover w-full transition-opacity duration-300 group-hover:opacity-0"
          />
          <div className="flex absolute inset-0 items-center justify-center gap-[30px] bg-cover bg-center top-0 left-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 text-white font-jost text-[16px]" style={{ backgroundImage: `url(${pool.hoverSrc.src})` }}>
            <div className="absolute inset-0 bg-black/40 z-[1]"></div>
            <div className="flex flex-col gap-[12.25px] items-center justify-center text-center z-[20]">
              <SwimmingSvg className="flex"/>
              <p>{pool.icontext}</p>
            </div>
            <div className="flex flex-col gap-[12.25px] items-center justify-center text-center z-[20]">
              <Swimming2Svg className="flex"/>
              <p>{pool.icontext2}</p>
            </div>
            <div className="flex flex-col gap-[12.25px] items-center justify-center text-center z-[20]">
              <Swimming3Svg className="flex"/>
              <p>{pool.icontext3}</p>
            </div>
          </div>
        </div>
        <p className="font-jost text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase ">
          {pool.subtitle}
        </p>
        <h5 className="font-marcellus text-[25px] leading-normal whitespace-nowrap lg:leading-normal uppercase lg:capsizedText3">
          {pool.title}
        </h5>
        <p className="font-jost text-[12px] lg:text-[14px] leading-[21px] lg:capsizedText4">
          {pool.description}
        </p>
        {showLink && (
          <Link href={links[index + 2]} className="flex w-[147px] py-[14px] whitespace-nowrap px-[28px] font-jost text-[14px] text-lagoBrown font-medium leading-[30px] max-h-[41px] items-center justify-center border border-lagoBrown shadow-buttonCustom uppercase">
           
          </Link>
        )}
      </div>
    ))}
  </div>
</div>


{/* other options */}
        <div className="lg:hidden flex flex-col gap-6 w-[87.79%] md:w-[91.4%] lg:w-[76.8%]">
        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex items-start justify-start w-full">
            {poolItems.map((pool,index) => (
              <div
                key={index}
                className="flex-[0_0_85%] sm:flex-[0_0_75%] md:max-h-auto md:flex-[0_0_50%] lg:flex-[0_0_31%] xl:flex-[0_0_31.5%] min-w-0 mr-[2.5%]"
              >
                <div className="flex flex-col w-full items-start text-start justify-center gap-[15px] lg:gap-[20px] font-jost text-black ">
                  <Image
                    src={pool.src}
                    alt={pool.alt ?? pool.title}
                    width={349}
                    height={233}
                  />
                  <span className="text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase">
                    {pool.subtitle}
                  </span>
                  <h3 className="text-[24px] lg:text-[30px] leading-[120%] lg:leading-[46.0059px] font-normal font-marcellus lg:capsizedText3">
                    {pool.title}
                  </h3>
                  
                  <p className="text-[12px] lg:text-[14px] leading-[21px] font-normal capsizedText4 w-[96%] md:w-full">
                    {pool.description}
                  </p>
                
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex lg:hidden items-end justify-end w-full mt-[0px] md:mt-[20px] xl:mt-[50px] relative">
  {poolItems.map((_, i) => (
    <div
      key={i}
      className={`transition-all w-[33.3%] h-[1px] bg-[#24292C] rounded-full ${
        selectedIndex === i ? "p-[1px]" : "bg-[#848383] "
      }`}
      onClick={() => emblaApi?.scrollTo(i)}
    />
  ))}
</div>
        </div>


    </div>
  )
}

export default Beach5
