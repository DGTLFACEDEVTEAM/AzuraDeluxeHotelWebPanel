import React from "react";
import Image from "next/image";

const SpaInfoSection = ({img1,img2, texts=[],texts2=[],texts3=[]}) => {
  return (
    <div className="flex w-screen h-auto  items-end justify-center max-w-[1440px]">
      <div className="flex flex-col md:flex-row w-[87.79%] md:w-[91.4%] lg:w-[76.8%] items-end justify-center gap-[25px] md:gap-[2%]">
        <div className="flex flex-col w-full md:w-[53%] justify-center items-start gap-[30px] lg:gap-[50px]">
          <div className="flex flex-col w-full items-start justify-center text-start gap-[15px] md:gap-[25px] lg:gap-[35px] text-black font-jost">
            <span className="text-[12px] font-medium leading-[14px] uppercase tracking-[0.48px]">
              {texts[0]}
            </span>
            <h2 className="text-[28px] md:text-[32px] leading-[120%] lg:text-[48px] font-marcellus font-normal lg:leading-[57.6px] lg:capsizedText2">
            {texts[1]}
            </h2>
            <p className="text-[14px] lg:text-[16px] font-normal leading-[18px] lg:leading-[24px] lg:capsizedText4">
            {texts[2]}
            </p>
          </div>
          <div className="w-full flex relative">
            <Image
              src={img2.src ?? img2}
              layout="cover"
              width={img2.width}
              height={img2.height}
              alt={img2.alt ?? "spa"}
              className="w-full"
            />
            <div className="absolute bottom-[35px] left-[35px] text-white font-jost gap-[24px]">
              <span className="text-[12px] font-normal leading-[14px] uppercase tracking-[0.48px]">
              {texts2[0]}
              </span>
              <h3 className="text-[25px] lg:text-[30px] font-marcellus font-normal capitalize leading-normal lg:leading-[57.6px] ">
              {texts2[1]}
              </h3>
              <p className="text-[12px] lg:text-[14px] font-normal leading-[21px]">
              {texts2[2]}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-[45%] relative">
        <Image
          src={img1.src ?? img1}
          layout="cover"
          width={img1.width}
          height={img1.height}
          alt={img1.alt ?? "spa"}
          className="flex w-full "
        />
         <div className="absolute top-[35px] left-[35px] text-white font-jost gap-[24px]">
              <span className="text-[12px] font-normal leading-[14px] uppercase tracking-[0.48px]">
              {texts3[0]}
              </span>
              <h3 className="text-[25px] lg:text-[30px] font-marcellus font-normal capitalize leading-normal lg:leading-[57.6px] ">
              {texts3[1]}
              </h3>
              <p className="text-[12px] lg:text-[14px] font-normal leading-[21px]">
              {texts3[2]}
              </p>
              <ul className="text-[14px] font-normal leading-[21px] list-disc pl-5 marker:text-xs marker:text-white">
              {texts3.slice(3).map((text, index) => (
                <li key={index}>{text}</li>
              ))}
              </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SpaInfoSection;
