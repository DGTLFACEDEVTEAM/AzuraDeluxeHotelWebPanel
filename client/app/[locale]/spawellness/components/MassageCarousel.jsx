"use client";
import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { MdArrowBackIosNew,MdArrowForwardIos } from "react-icons/md";

const MassageCarousel = ({ span, header, text, time, images = [] }) => {
  const imagesOriginal = images;
  const imagesCombined = [...imagesOriginal, ...imagesOriginal];
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: true,
      containScroll: false,
      slidesToScroll: 1,
      skipSnaps: false,
    },
    [
      Autoplay({
        delay: 3000,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
        playDirection: "forward",
      }),
    ]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on("select", () => {
        setSelectedIndex(emblaApi.selectedScrollSnap() % imagesOriginal.length);
      });
    }
  }, [emblaApi]);

  return (
    <div className="flex flex-col w-screen items-center justify-center gap-[30px] lg:gap-[50px]">
      <div className="flex flex-col items-start justify-start gap-[35px] text-black font-jost w-[87.79%] lg:w-[87.4%] lg:ml-[5.8%]">
        <span className="text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase">
          {span}
        </span>
        <h3 className="text-[28px] md:text-[32px] leading-normal lg:text-[48px] font-marcellus font-normal lg:leading-[57.6px] capsizedText2">
          {header}
        </h3>
        <p className="text-[14px] lg:text-[16px] leading-[24px] font-normal lg:w-[52%] capsizedText4">
          {text}
        </p>
      </div>

      <div className="flex flex-col w-[100%] justify-start items-start relative">
        {/* Carousel */}
        <div
          ref={emblaRef}
          className="overflow-hidden w-full ml-[6.10%] md:ml-[4.3%] lg:w-[87.4%] lg:ml-[5.8%]"
        >
          <div className="flex grid-flow-col lg:h-[540px] w-auto">
            {imagesCombined.map((image, index) => (
              <div
                key={index}
                className="relative shrink-0 flex justify-center items-center mr-4  flex-[0_0_auto]
         lg:min-h-[540px]
         lg:w-[360px]
         md:w-[270px] md:h-[405px]
         h-[266px] w-[177.3px]"
              >
                <Image
                  src={image.src}
                  width={360}
                  height={540}
                  alt={image.alt}
                  className="lg:w-full lg:h-full md:w-[270px] md:h-[405px] h-[266px] w-[177.3px] object-cover"
                />
                <div className="absolute inset-0 text-center top-[9%] w-full items-center justify-center">
                  <div className="w-[100%] flex flex-col items-center justify-center text-center">
                    <h3 className="text-[25px] md:text-[30px] -tracking-[0.66px] font-normal font-marcellus text-white lg:w-[46%] leading-[36px] mb-[23px]">
                      {image.title}
                    </h3>
                    <div className="flex w-[50%] h-[1px] bg-white"></div>
                    <p className="text-[12px] font-medium leading-[14px] uppercase tracking-[0.48px] font-jost text-white mt-[10px]">
                      {time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute top-1/2 left-6 transform -translate-y-1/2">
      <button
        className="p-1 bg-[#848383]/40 hidden lg:flex pointer-events-auto"
        onClick={scrollPrev}
        type="button"
      >
        <MdArrowBackIosNew size={32} color="white" />
      </button>
    </div>
    <div className="absolute top-1/2 right-6 transform -translate-y-1/2">
      <button
        className="p-1 bg-[#848383]/40 hidden lg:flex pointer-events-auto"
        onClick={scrollNext}
        type="button"
      >
        <MdArrowForwardIos size={32} color="white" />
      </button>
    </div>
        </div>

        {/* Scroll Indicator */}
        <div className="flex items-start justify-start  w-[93.89%] ml-[6.1%] md:w-[95.7%] md:ml-[4.3%] lg:w-[87.4%] lg:ml-[5.8%] mt-[20px] lg:mt-[50px] relative">
          {imagesOriginal.map((_, i) => (
            <div
              key={i}
              className={`transition-all mt-[20px] lg:mt-[30px] ${
                imagesOriginal.length == 4 ? "w-[25%]" : "w-[20%]"
              } h-[2px] bg-[#24292C] rounded-full ${
                selectedIndex === i ? "p-[2px]" : "bg-[#848383]"
              }`}
              onClick={() => emblaApi && emblaApi.scrollTo(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MassageCarousel;
