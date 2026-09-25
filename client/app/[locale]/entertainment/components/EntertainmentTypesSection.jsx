"use client";
import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from 'next/image'
import Link from 'next/link'

const EntertainmentTypesSection = ({ texts, cards }) => {
  const activities = cards;

  const [emblaRef, emblaApi] = useEmblaCarousel({  loop: true,
    align: "start",
    startIndex: 0, });

  const [selectedIndex, setSelectedIndex] = useState(0);
    
  const handleJump = useCallback((index) => {
    emblaApi?.scrollTo?.(index);
  }, [emblaApi]);

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
    <div className="flex w-screen items-center justify-center max-w-[1440px]">
      <div className="flex flex-col w-[87.79%] md:w-[91.4%] lg:w-[76.8%] items-start justify-center gap-[30px] md:gap-[50px] max-w-[1106px]">
        
        {/* Başlık Bölümü */}
        <div className="flex flex-col items-start justify-center text-start gap-[15px] md:gap-[25px] lg:gap-[35px] text-black font-jost">
          <span className="text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase">
          {texts.subtitle}
          </span>
          <h3 className="text-[28px] md:text-[32px] lg:text-[48px] font-normal font-marcellus leading-[120%] lg:leading-[57.6px] lg:capsizedText2">
          {texts.title}
          </h3>
          <p className="text-[16px] font-normal leading-[24px] lg:w-[65%] lg:capsizedText4 w-[98%] md:w-[80%]">
          {texts.text}
          </p>
        </div>
        {/* Dinamik Kartlar */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 w-full items-center justify-center gap-[31px]">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex flex-col items-center justify-center relative mb-[180px]">
              <div className="w-full flex flex-col items-center justify-end cursor-pointer">
                <Image src={activity.img} width={activity.img.width} height={activity.img.height} className="flex w-full" alt={activity.img.alt}/>
                <div className="absolute flex flex-col items-start justify-center bg-white gap-[25px] font-jost text-black w-[90%] p-[20px] -bottom-44">
                  <span className="text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase">
                    {activity.category}
                  </span>
                  <h4 className="text-[28px] lg:text-[30px] font-normal leading-[120%] capitalize font-marcellus lg:capsizedText3">
                    {activity.title}
                  </h4>
                  <p className="text-[14px] font-normal leading-[21px] capsizedText4">
                    {activity.description}
                  </p>
                </div>
              </div>
              <Link className='absolute inset-0' href={activity.link}></Link>
            </div>
          ))}
        </div>

         {/* other options */}
      <div className="md:hidden flex flex-col gap-6 w-full">
        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex items-start justify-start w-full">
            {activities.map((activity,index) => (
              <div
                key={activity.id}
                className="flex-[0_0_auto] h-[415px] md:h-[390px] lg:h-[390px] min-w-0 mr-[1.5%]"
              >
                <div className="flex flex-col relative w-full items-center text-start justify-center gap-[15px] lg:gap-[20px] font-jost text-black ">
                  <Image
                    src={activity.img}
                    alt={activity.img.alt}
                    width={activity.img.width}
                    height={activity.img.height}
                     className="flex h-[300px] md:h-[400px] w-auto md:w-full"
                  />
                  <div className="absolute flex flex-col items-start justify-center bg-white gap-[25px] font-jost text-black w-[90%] p-[20px] -bottom-32">
                  <span className="text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase">
                    {activity.category}
                  </span>
                  <h4 className="text-[28px] lg:text-[30px] font-normal leading-[120%] capitalize font-marcellus lg:capsizedText3">
                    {activity.title}
                  </h4>
                  <p className="text-[14px] font-normal leading-[21px] capsizedText4">
                    {activity.description}
                  </p>
                </div>
                
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex lg:hidden items-end justify-end w-full mt-[0px] md:mt-[20px] xl:mt-[50px] relative">
  {activities.map((_, i) => (
    <div
      key={i}
      className={`transition-all w-[33.3%] h-[1px] bg-[#24292C] rounded-full ${
        selectedIndex === i ? "p-[1px]" : "bg-[#848383] "
      }`}
      onClick={() => handleJump(i)}
    />
  ))}
</div>
        </div>

      </div>
    </div>
  );
}

export default EntertainmentTypesSection;
