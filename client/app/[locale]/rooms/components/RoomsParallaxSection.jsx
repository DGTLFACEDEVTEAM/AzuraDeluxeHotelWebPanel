import React from "react";
import oda from "../images/parallax.jpg";
import MinibarSvg from "./svg/MinibarSvg";
import FoundationSvg from "./svg/FoundationSvg";
import WatchSvg from "./svg/WatchSvg";
import TvSvg from "./svg/TvSvg";
import {useTranslations} from 'next-intl';

const RoomsParallaxSection = ({ content }) => {
  const t = useTranslations('Rooms.Parallax');
  const copy = (key) => content?.translations?.[key] ?? t(key);

  return (
    <div
      className="relative flex flex-col xl:flex-row items-center justify-center min-h-[700px] xl:min-h-[610px] w-full bg-cover bg-center parallax "
      style={{ backgroundImage: `url(${content?.image ?? oda.src})` }}
    >
      {/* Overlay yarı saydam siyah katman */}
      <div className="absolute inset-0 bg-lagoBlack/60 z-[1]"></div>

      {/* İçerik container */}
      <div className="z-50 w-[87.79%] md:w-[91.4%] xl:w-[76.8%] flex flex-col items-center justify-center gap-[15px] lg:gap-[38px] font-jost text-white text-center lg:text-left">
        {/* Tagline */}
        <span className="uppercase text-[12px] font-medium leading-[14px] tracking-[0.48px] w-full pt-6 ml-[1.5%]">
        {copy("subtitle")}
        </span>

        {/* İçerik kolonlarının bulunduğu wrapper */}
        <div className="w-full flex flex-col lg:flex-row items-center justify-around gap-[40px] px-4 lg:px-0">
          {/* Sol Kolon */}
          <div className="w-full xl:w-[537px] flex flex-col items-center lg:items-start lg:text-start justify-center gap-[18px] lg:gap-[38px] xl:gap-[68px]">
            {/* Başlık */}
            <h3 className="font-marcellus font-normal text-[28px] lg:text-[36px] leading-[120%] lg:leading-[49px] md:leading-[42px] -tracking-[0.792px]">
            {copy("title")}
            </h3>

            {/* Mini Bar ve Cosmetics grid */}
            <div className="grid grid-cols-2 gap-4 w-full lg:mt-[30px] py-[8px]">
              {/* Mini Bar */}
              <div className="w-full xl:w-[249px] flex flex-col items-center lg:items-start lg:text-start justify-center gap-[15px]">
                <MinibarSvg className="flex" width={38} height={38} />
                <h5 className="text-[16px] lg:text-[18px] font-normal leading-normal lg:leading-[30px] ">
                {copy("span1")}
                </h5>
                <p className="text-[12px] lg:text-[14px] md:text-[14px] font-normal leading-[130%] lg:leading-[21px] w-full md:w-[70%] lg:w-full">
                {copy("text1")}
                </p>
              </div>
              {/* Cosmetics */}
              <div className="w-full xl:w-[249px] flex flex-col items-center lg:items-start lg:text-start  justify-center gap-[15px]">
                <FoundationSvg className="flex" width={40} height={40} />
                <h5 className="lg:text-[18px] text-[16px] font-normal leading-normal lg:leading-[30px]">
                {copy("span2")}
                </h5>
                <p className="text-[12px] lg:text-[14px] font-normal leading-[130%] lg:leading-[21px] w-full md:w-[70%] lg:w-full">
                {copy("text2")}
                </p>
              </div>
            </div>
          </div>

          {/* Sağ Kolon */}
          <div className="w-full xl:w-[533px] flex flex-col items-center xl:items-start justify-center lg:text-start gap-[38px] xl:gap-[68px]">
            {/* Açıklama Paragrafı */}
            <p className="lg:text-[16px] text-[14px] font-normal leading-normal -tracking-[0.352px] max-w-[600px]">
            {copy("text")}
            </p>

            {/* Room Access ve Wifi & LedTV grid */}
            <div className="grid grid-cols-2 gap-4 w-full lg:mt-[30px] py-[8px]">
              {/* Room Access */}
              <div className="w-full xl:w-[249px] flex flex-col items-center lg:items-start lg:text-start  justify-center gap-[15px]">
                <WatchSvg className="flex" width={40} height={40} />
                <h5 className="text-[16px] lg:text-[18px] font-normal leading-normal lg:leading-[30px]">
                {copy("span3")}
                </h5>
                <p className="text-[12px] lg:text-[14px] font-normal leading-[130%] lg:leading-[21px] w-full md:w-[70%] lg:w-full">
                {copy("text3")}
                </p>
              </div>
              {/* Wifi & LedTV */}
              <div className="w-full xl:w-[249px] flex flex-col items-center lg:items-start lg:text-start justify-center gap-[15px]">
                <TvSvg className="flex" width={43} height={43} />
                <h5 className="text-[16px] lg:text-[18px] font-normal leading-normal lg:leading-[30px]">
                {copy("span4")}
                </h5>
                <p className="text-[12px] lg:text-[14px] font-normal leading-[130%] lg:leading-[21px] w-full md:w-[70%] lg:w-full">
                {copy("text4")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomsParallaxSection;
