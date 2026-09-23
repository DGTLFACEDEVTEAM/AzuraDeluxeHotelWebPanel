"use client";

import React, { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { MdArrowBackIosNew,MdArrowForwardIos } from "react-icons/md";

// Varsayılan slaytlar
const DEFAULT_SLIDES = [
  {
    src: require("./Images/accommodation.jpg"),
    title: "Accommodation",
    span: "/rooms",
  },
  {
    src: require("./Images/Beachandpool.jpg"),
    title: "Beach & Pools",
    span: "/beachpools",
  },
  {
    src: require("./Images/Entertainment.jpg"),
    title: "Experiences",
    span: "/entertainment",
  },
  {
    src: require("./Images/Flavours.jpg"),
    title: "Flavours",
    span: "/restaurants",
  },
  {
    src: require("./Images/kids.jpg"),
    title: "Kids",
    span: "/kidsclub",
  },
];

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
        flex-[0_0_60%]
        sm:flex-[0_0_auto] md:min-h-[30vh] md:w-[40vw]
         lg:min-h-[540px]
         lg:w-[360px]
        
      `}
    >
      <Image
        src={slide.src}
        alt={slide.alt ?? slide.title}
        width={360}
        height={540}
        className="w-full h-full object-cover"
      />
      <div className="absolute flex flex-col text-white left-1/2 -translate-x-1/2 -translate-y-[10%] items-center justify-center w-[80%] lg:w-[50%] text-center top-[10%] gap-[10px] lg:gap-[23px]">
        <h4 className="text-[24px] md:text-[28px] lg:text-[30px] font-normal leading-[120%] lg:leading-[36px] -tracking-[0.66px] font-marcellus w-[100%]">{slide.title}</h4>
        <div className="flex bg-white h-[1px] w-full"></div>
        <span
          className="
            text-white
            text-[12px] font-medium leading-[14px] -tracking-[0.48px]
            font-jost transition uppercase
          "
        >
          {slide.span}
        </span>
      </div>
    </div>
  );
}

export default function Slider2({ slides }) {
  const slidesOriginal = slides || DEFAULT_SLIDES;
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
        delay: 3500,
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
    <section className="relative w-full overflow-hidden ">
      <div ref={emblaRef} className="overflow-hidden w-full ml-[6.1%] md:ml-[4.3%] lg:w-[87.4%] lg:ml-[5.8%]">
        <div className="flex lg:h-[540px] w-auto">
          {slidesCombined.map((slide, index) => (
            <Slide key={index} slide={slide} marginClass="mr-4" />
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
      <div className="flex items-end justify-end w-[93.89%] md:w-[95.7%] lg:w-[87.4%] ml-[6.1%] md:ml-[4.3%]  lg:ml-[5.8%] mt-[30px] sm:mt-[40px] md:mt-[62px] relative">
        {slidesOriginal.map((_, i) => (
          <div
            key={i}
            className={`transition-all w-[25%]  h-[1px] bg-[#24292C] ${
              selectedIndex === i ? "p-[1px]" : "bg-[#848383]"
            }`}
            onClick={() => emblaApi && emblaApi.scrollTo(i)}
          />
        ))}
      </div>
    </section>
  );
}



