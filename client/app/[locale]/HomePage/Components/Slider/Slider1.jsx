"use client";

import React, { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { MdArrowBackIosNew,MdArrowForwardIos } from "react-icons/md";

// Tekil slayt bileşeni
function Slide({ slide, marginClass }) {


  return (
    <div
      className={`
        relative
        shrink-0
        flex 
        justify-center 
        items-center
        ${marginClass}
        flex-[0_0_auto]
         lg:min-h-[540px]
         lg:w-[360px]
         md:w-[270px] md:h-[405px]
         h-[266px] w-[177.3px]
        
      `}
    >
      <Image
        src={slide.src}
        alt={slide.alt}
        width={360}
        height={540}
        className="lg:w-full lg:h-full md:w-[270px] md:h-[405px] h-[266px] w-[177.3px] object-cover"
      />
      <div className="absolute inset-0 bg-lagoBlack/40 z-[1]"></div>
        <a
          href={slide.link}
          className=" absolute inset-0 flex items-center justify-center pb-4
            text-white
            text-[20px] md:text-[30px] lg:text-[40px] leading-[9.852px] -tracking-[0.44px] font-normal md:leading-[15px] lg:leading-[20px] md:-tracking-[0.66px] lg:-tracking-[0.88px]
            font-marcellus transition z-[20]
          "
        >
          {slide.title}
        </a>
     
    </div>
  );
}

export default function Slider1({ slides }) {
  const slidesOriginal = slides;
  const slidesCombined = [...slidesOriginal, ...slidesOriginal]; // Loop için ekstra slaytlar

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
        setSelectedIndex(emblaApi.selectedScrollSnap() % slidesOriginal.length); // Index düzeltildi
      });
    }
  }, [emblaApi]);

  return (
    <section className="relative w-full overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden w-full lg:w-[87.4%] lg:ml-[5.8%]">
        <div className="flex md:h-[405px] lg:h-[540px] w-auto">
          {slidesCombined.map((slide, index) => (
            <Slide key={index} slide={slide} marginClass="mr-[8.37px] md:mr-[12.75px] lg:mr-[17px]" />
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

      {/* Scroll Indicator (5 parça olacak) */}
      <div className="flex items-end justify-end w-[87.79%] md:w-[91.4%] mx-[6.10%] md:mx-[4.3%] lg:w-[87.4%] lg:mx-auto mt-[62px] relative">
        {slidesOriginal.map((_, i) => (
          <div
            key={i}
            className={`transition-all ${slidesOriginal.length==4 ? "w-[25%]" : "w-[20%]"}  h-[1px] bg-[#24292C] ${
              selectedIndex === i ? "p-[1px]" : "bg-[#848383]"
            }`}
            onClick={() => emblaApi && emblaApi.scrollTo(i)}
          />
        ))}
      </div>
    </section>
  );
}


