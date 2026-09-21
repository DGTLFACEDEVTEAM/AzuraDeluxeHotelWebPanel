"use client";
import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import options1 from "../../deluxeroom/images/deluxe4.jpg";
import options2 from "../../fantasyroom/images/fantasy4.jpg";
import user from "../images/user1.png";
import Image from "next/image";
import { Link } from '@/i18n/navigation';
import AreaSvg2 from "../../components/svg/AreaSvg2";
import UserSvg from "../../components/svg/UserSvg";
import { BiArea, BiGroup } from "react-icons/bi";
import {useTranslations} from 'next-intl';

const OtherOptions = ({rooms, content}) => {
  const t = useTranslations('DeluxeRoom.OtherOptions');

  const [emblaRef, emblaApi] = useEmblaCarousel({  loop: true,
    align: "start",
    startIndex: 0, });

  const [selectedIndex, setSelectedIndex] = useState(0);
    
  const handleJump = useCallback((index) => {
    if (emblaApi) emblaApi.scrollTo(index);
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
    <div className="flex w-screen h-auto items-center justify-center max-w-[1440px]">
      <div className="flex flex-col w-[87.79%] md:w-[91.4%] lg:w-[76.8%] items-start justify-center gap-[30px] lg:gap-[50px] lg:min-w-[960px]">
        <div className="flex flex-col items-start justify-center w-full text-black gap-[15px] md:gap-[25px] lg:gap-[35px]">
          <span className="text-[12px] font-medium uppercase tracking-[0.48px] leading-[14px] font-jost">
            {content ? content.span : t("subtitle")}
          </span>
          <h2 className="text-[28px] md:text-[36px] lg:text-[48px] font-marcellus font-normal leading-[120%] lg:leading-[57.6px] lg:capsizedText2">
          {content ? content.title : t("title")}
          </h2>
        </div>

        {/* embla carousel */}
        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex items-start justify-start w-full">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex-[0_0_85%] sm:flex-[0_0_75%] md:max-h-auto md:flex-[0_0_50%] min-w-0 mr-[2.5%]"
              >
                <div className="flex flex-col w-full items-start text-start justify-center gap-[15px] lg:gap-[20px] font-jost text-black ">
                  <Image
                    src={room.img}
                    alt={room.img.alt ?? room.title}
                    width={room.img.width}
                    height={room.img.height}
                  />
                  <span className="text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase">
                    {room.description}
                  </span>
                  <h3 className="text-[24px] lg:text-[30px] leading-[120%] lg:leading-[46.0059px] font-normal font-marcellus lg:capsizedText3">
                    {room.title}
                  </h3>
                  <div className="flex items-center justify-start text-center gap-[20px]">
                    <div className="flex items-center justify-center gap-[10px]">
                      <BiArea size={18}/>
                      <p className="text-lagoBrown text-[14px] lg:text-[16px] font-normal leading-normal">
                     {room.size}
                    </p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-[10px]">
                     <BiGroup size={19} />
                     <p className="text-lagoBrown text-[14px] lg:text-[16px] font-normal leading-normal">
                     {room.capacity}
                    </p>
                    </div>
                    
                  </div>
                  <p className="text-[12px] lg:text-[14px] leading-[21px] font-normal capsizedText4 w-[96%] md:w-full">
                    {room.text}
                  </p>
                  <Link
                    href={room.link}
                    className="flex text-lagoBrown leading-[30px] uppercase font-medium text-[12px] lg:text-[14px] px-[40px] py-[20px] border border-lagoBrown text-center justify-center items-center h-[41px]"
                  >
                  {content ? content.buttonText : t("buttonText")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex lg:hidden items-end justify-end w-full mt-[0px] md:mt-[20px] xl:mt-[50px] relative">
  {rooms.map((_, i) => (
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
  );
};

export default OtherOptions;
