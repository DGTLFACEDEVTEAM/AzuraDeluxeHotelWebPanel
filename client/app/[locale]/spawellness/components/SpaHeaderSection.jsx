"use client";
import React, { useState, useEffect, useCallback } from "react";
import useCarousel from "embla-carousel-react";
import Image from "next/image";

const SpaHeaderSection = ({span, header,text,images=[]}) => {
  const [emblaRef, emblaApi] = useCarousel({
    loop: true,
    align: "center",
    startIndex: 0,
  });

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
    <div className="flex flex-col w-screen items-center justify-center gap-[30px] lg:gap-[50px]">
      <div className="flex flex-col items-center justify-center text-center w-[87.79%] md:w-[91.4%] lg:w-[76.8%] text-black font-jost gap-[15px] md:gap-[25px] lg:gap-[35px]">
        <span className="text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase">
          {span}
        </span>
        <h3 className="text-[28px] md:text-[32px] leading-normal lg:text-[48px] lg:leading-[57.6px] capsizedText2 font-normal font-marcellus">
         {header}
        </h3>
        <p className="text-[14px] lg:text-[16px] font-normal leading-normal lg:w-[59%]">
         {text}
        </p>
      </div>

      <div className="flex flex-col w-full justify-center items-center h-full">
        {/* carousel */}
        <div
          className="flex overflow-hidden relative w-full flex-col justify-center items-center "
          ref={emblaRef}
        >
          <div className="flex grid-flow-col">
            {images.map((image, index) => (
              <div
           className="flex-[0_0_auto] min-w-0 ml-[2%] md:ml-[10px] lg:h-[600px]"
                key={index}
              >
                <Image
                  src={image.src}
                  layout="cover"
                  width={image.width}
                  height={image.height}
                  alt={image.alt ?? `Slide ${index + 1}`}
                  objectPosition="center"
                 className="flex h-[25vh] sm:h-[30vh] lg:h-full md:min-h-[420px] md:h-[38vh] w-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaHeaderSection;
