import React from "react";
import ClockSvg from "./svg/ClockSvg";

const RoomsInfoSection = ({ content }) => {

  return (
      <div className="flex flex-col lg:flex-col w-screen h-auto justify-center items-center bg-[#fbfbfb] max-w-[1440px] px-4 lg:px-0">

      <div className="flex flex-col w-[87.79%] md:w-[91.4%] lg:w-[76.8%] gap-[14px] items-center justify-center text-center font-jost leading-normal font-normal ">
        <span className="text-lagoGray text-[12px] uppercase tracking-[0.48px] font-medium leading-[14px] items-stretch">
          {content.subtitle}
        </span>
        <h2 className="text-black text-[28px] md:text-[32px] lg:text-[36px] font-marcellus lg:w-[75%] leading-[120%] lg:leading-[135%]">
        {content.title}
        </h2>
        <p className="text-black md:text-center text-[12px] lg:text-[16px] lg:w-[65%]">
        {content.text}
        </p>
        <div className="flex flex-row w-[70%] justify-center lg:justify-between gap-[10%] lg:gap-[1px] items-center mt-[24px]">
          <div className="flex whitespace-nowrap gap-[22px] items-center justify-center">
            <ClockSvg className="flex" width={14} height={14} />
            <p className="text-lagoGray text-[12px] lg:text-[14px] ">{content.checkin}</p>
          </div>
          <div className="flex h-[16px] md:h-[14px] w-[1px]  bg-lagoGray"></div>
          <div className="flex gap-[22px] whitespace-nowrap items-center justify-center">
            <ClockSvg className="flex" width={14} height={14} />
            <p className="text-lagoGray  text-[12px] lg:text-[14px] "> {content.checkout}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomsInfoSection;
