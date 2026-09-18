"use client";
import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { Link } from '@/i18n/navigation';

// Tekrarlanan sütun yapısını modüler hale getiren bileşen
const MissionColumn = ({
  img,
  spanText,
  heading,
  paragraph,
  showLink,
  link,
}) => (
  <div className="flex flex-col w-full md:w-[49%] items-start justify-center text-start gap-[15px] lg:gap-[25px] font-jost text-black">
    <Image
      src={img}
      width={img.width}
      height={img.height}
      alt={img.alt ?? "hotel"}
      className="flex w-full min-h-[270px] max-h-[280px] lg:max-h-[350px] object-cover"
    />
    <span className="text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase">
      {spanText}
    </span>
    <h4 className="text-[25px] lg:text-[30px] font-normal leading-[120%] lg:leading-[57.6px] lg:capitalize font-marcellus">
      {heading}
    </h4>
    <p className="text-[14px] font-normal leading-[21px] w-[99%]">
      {paragraph}
    </p>
    {showLink && (
      <Link
        href={link}
        className="flex w-[170.585px] whitespace-nowrap py-[16px] px-[32px] font-jost text-[14px] lg:text-[16px] text-lagoBrown font-medium leading-[30px] max-h-[41px] items-center justify-center border border-lagoBrown shadow-buttonCustom uppercase"
      >
     
      </Link>
    )}
  </div>
);

const MissionVisionSection = ({
  content,
  leftImg,
  rightImg,
  showLink,
  link1,
  link2,
}) => {
  // embla carousel hook'u (mobilde kullanılacak)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
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
    <div className="flex w-screen items-center justify-center max-w-[1440px]">
      <div className="flex flex-col w-[87.79%] md:w-[91.4%] lg:w-[76.8%] items-center justify-center gap-[30px] lg:gap-[50px]">
        {/* Üst metin alanı */}
        <div className="flex flex-col items-center justify-normal lg:w-[65%] text-center font-jost text-black gap-[15px] md:gap-[25px] lg:gap-[35px]">
          <span className="text-[12px] font-medium leading-[14px] uppercase tracking-[0.48px]">
            {content.subtitle}
          </span>
          <h3 className="text-[28px] md:text-[32px] lg:text-[48px] font-normal leading-[120%] lg:leading-[57.6px] font-marcellus">
            {content.title}
          </h3>
          <p className="text-[14px] lg:text-[16px] font-normal leading-[24px]">
            {content.text}
          </p>
        </div>

        {/* Masaüstü görünümü: İki sütun */}
        <div className="hidden md:flex w-full items-start justify-center gap-[2%]">
          <MissionColumn
            img={leftImg}
            spanText={content.mission.subtitle}
            heading={content.mission.title}
            paragraph={content.mission.text}
            showLink={showLink}
            link={link1}
          />
          <MissionColumn
            img={rightImg}
            spanText={content.vision.subtitle}
            heading={content.vision.title}
            paragraph={content.vision.text}
            showLink={showLink}
            link={link2}
          />
        </div>

        {/* Mobil görünüm: Carousel (md:hidden) */}
        <div className="md:hidden w-full overflow-hidden" ref={emblaRef}>
          <div className="flex">
            <div className="flex-[0_0_90%] mr-[4%] ">
              <MissionColumn
                img={leftImg}
                spanText={content.mission.subtitle}
                heading={content.mission.title}
                paragraph={content.mission.text}
                showLink={showLink}
                link={link1}
              />
            </div>
            <div className="flex-[0_0_90%]">
              <MissionColumn
                img={rightImg}
                spanText={content.vision.subtitle}
                heading={content.vision.title}
                paragraph={content.vision.text}
                showLink={showLink}
                link={link2}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionVisionSection;
