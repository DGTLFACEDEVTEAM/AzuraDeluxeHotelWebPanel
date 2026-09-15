"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaYoutube,
  FaTripadvisor
} from "react-icons/fa";
import { Link } from '@/i18n/navigation';
import logosvg from "../Header/Icons/logo2.svg";
import Phone from "../Header/Icons/Phone";
import LocationSvg from "./LocationSvg";
import MessageSvg from "./MessageSvg";
import ArrawDown from "@/app/[locale]/HomePage/Components/Icons/ArrawDown";
import DgtlfaceSvg from "./DgtlfaceSvg";
import BSvg from "./BSvg";
import {useTranslations} from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <footer className="w-full flex flex-col bg-[#1A1A16] text-gray-200 text-sm justify-center items-center z-10">
      <div className="hidden lg:flex lg:flex-row-reverse w-[91.1%] xl:w-[76.8%] max-w-[1440px] items-start justify-center text-start gap-[4%] mt-[60px]">
        <div className="flex w-[50%] items-center text-center justify-start">
          {/* SOL: 4 SÜTUN (QUICK MENU, TERMS, COMPANY, CONTACT) */}
          <div className="flex flex-col items-start justify-start text-start gap-[40px] mt-4">
              <h4 className="text-[15px] text-white font-marcellus font-normal leading-[26px] tracking-[0.6px] uppercase ">
                <Link href="/connect">{t("contact")}</Link>
              </h4>
              <div className="flex flex-col gap-[24px]">
                <p className="text-lagoGray2 font-jost text-[16px] font-normal leading-[20px] ">
                {t("phone")}
                </p>
                <a href="mailto:info@azuradeluxe.com" className="text-lagoGray2 font-jost text-[16px] font-normal leading-[20px]">
                {t("emailAddress")} info@azuradeluxe.com
                </a>
                <p className="text-lagoGray2 font-jost text-[16px] font-normal leading-[20px] ">
                  {t("ourAddress")}   Avsallar Mah.  
                  <br />
                  İncekum Cad. No:76
                  <br />
                  Alanya / Turkey
                </p>
              </div>
             
            </div>
        </div>
        <div className="flex w-[1px] h-[240px] bg-gray-400"></div>
        <div className="w-[50%] flex flex-col items-start pl-[15%] 2xl:pl-[22%] gap-[32px]">
          {/* Logo */}
          <div className="mb-1">
          <Image
            src={logosvg}
            alt="Logo"
            width={223}
            height={88}
            className="object-contain items-center justify-center"
          />
          </div>

          {/* Sosyal ikonlar */}
          <div className="grid grid-cols-2 lg:flex items-center gap-[32px]">
            <Link
              href="https://www.instagram.com/azuradeluxeresort/"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaInstagram className="w-[30px] h-[32px]" />
            </Link>
            <Link
              href="https://www.facebook.com/AzuraDeluxeResort/"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaFacebook className="w-[30px] h-[32px]" />
            </Link>
           
            <Link
              href="https://www.youtube.com/channel/UC3Z23WuWOhmpFnbw9fLI1-g"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaYoutube className="w-[30px] h-[32px]" />
            </Link>
          </div>

          {/* Alt linkler */}
          <div className="grid grid-cols-2 2xl:grid-cols-2 items-center gap-6 whitespace-nowrap text-lagoGray2">
            <a href="/terms-of-use" className="hover:underline">
            {t("termsuse")}
            </a>
            <a href="#" className="hover:underline">
            {t("notice")}
            </a>
            <a href="/kvkk" className="hover:underline">
            {t("kvkk")}
            </a>
            <a href="/covid-19" className="hover:underline">
            {t("covid")}
            </a>
            <a href="/sustainability"  className="hover:underline">
            {t("sustainability")}
            </a>
            {/* <a href="/documents/Azura Hotel Sürdürülebilirlik Raporu 2023-2024.pdf" target="_blank"  rel="noopener noreferrer" className="hover:underline">
            {t("sustainability")}
            </a> */}

             <a href="/ourpolicies"  className="hover:underline">
            {t("ourpolicies")}
            </a>
             <a href="/certificates" className="hover:underline">
             {t("certificates")}
            </a>
            <Link className="hover:underline" href="/news">{t("blog")}</Link>
                
          </div>
        </div>
        
      </div>

      {/* tablet */}
      <div className="hidden md:flex flex-col lg:hidden w-full bg-lagoBlack h-auto pt-[47px] pb-[10px] gap-[50px] items-center justify-center">
        <div className="flex w-[90%] gap-[37px] items-center justify-start ml-[10%]">
          <Image
            src={logosvg}
            alt="Logo"
            width={223}
            height={88}
            className="object-contain items-center justify-center"/>
          <div className="grid grid-cols-2 gap-[25px] items-start justify-start font-jost text-[12px] font-normal leading-[24px] w-[66%] ml-[2%]">
            <div className="flex gap-[15px] items-center justify-center">
              <Phone className="flex" width={25} height={25} color="#A6A6A6" />
              <div className="flex flex-col gap-[10px] items-start justify-start">
                <span className="text-[#A6A6A6] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                {t("phoneNumber")}
                </span>
                <div className="flex h-[1px] w-full bg-[#D9D9D9]/50"></div>
                <a href="tel:+902425171234" className="text-[#FBFBFB] leading-[32.53px] capsizedText6">
                +90 242 517 12 34
                </a>
              </div>
            </div>

            <div className="flex gap-[15px] items-center justify-center">
              <Phone className="flex" width={25} height={25} color="#A6A6A6" />
              <div className="flex flex-col gap-[10px] items-start justify-start">
                <span className="text-[#A6A6A6] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                 {t("callCenter")}
                </span>
                <div className="flex h-[1px] w-full bg-[#D9D9D9]/50"></div>
                <a href="tel:+902422771143" className="text-[#FBFBFB] leading-[32.53px] capsizedText6">
                +90 242 277 11 43
                </a>
              </div>
            </div>

            <div className="flex gap-[15px] items-center justify-center">
              <LocationSvg
                className="flex"
                width={26}
                height={26}
                color="#A6A6A6"
              />
              <div className="flex flex-col gap-[10px] items-start justify-start">
                <span className="text-[#A6A6A6] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                {t("ourAddress")}
                </span>
                <div className="flex h-[1px] w-full bg-[#D9D9D9]/50"></div>
                <p className="text-[#FBFBFB] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                  Manavgat/Antalya, TR
                </p>
              </div>
            </div>

            <div className="flex gap-[15px] items-center justify-center">
              <MessageSvg
                className="flex"
                width={26}
                height={26}
                color="#A6A6A6"
              />
              <div className="flex flex-col gap-[10px] items-start justify-start">
                <span className="text-[#A6A6A6] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                  {t("emailAddress")}
                </span>
                <div className="flex h-[1px] w-full bg-[#D9D9D9]/50"></div>
                <p className="text-[#FBFBFB] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                info@azuradeluxe.com
                </p>
              </div>
            </div>
          </div>
        </div>

  

        <div className="flex w-[92%] items-center justify-center gap-[20px] pt-[15px]">
          {/* Sosyal ikonlar */}
          <div className="flex items-center gap-[32px]">
          <Link
              href="https://www.instagram.com/azuradeluxeresort/"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaInstagram className="w-[30px] h-[32px]" />
            </Link>
            <Link
              href="https://www.facebook.com/AzuraDeluxeResort/"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaFacebook className="w-[30px] h-[32px]" />
            </Link>
           
            <Link
              href="https://www.youtube.com/channel/UC3Z23WuWOhmpFnbw9fLI1-g"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaYoutube className="w-[30px] h-[32px]" />
            </Link>
           
          </div>

          {/* Alt linkler */}
          <div className="flex items-center gap-6 font-jost whitespace-nowrap font-normal leading-[20px] text-[16px] text-lagoGray2">
            <a href="#" className="hover:underline">
            {t("termsuse")}
            </a>
            <a href="#" className="hover:underline">
            {t("notice")}
            </a>
            <a href="/documents/Azura Hotel Sürdürülebilirlik Raporu 2023-2024.pdf" target="_blank"  rel="noopener noreferrer" className="hover:underline">
            {t("sustainability")}
            </a>
  
                  <Link href="/news">{t("blog")}</Link>
               
          </div>
          
        </div>
        <div className="w-full hidden md:flex lg:hidden flex-col gap-5 mt-2 items-center justify-center text-center">
                <div className="w-full h-[1px] bg-[#5a5a5a]"></div>
                <Link href="https://www.ktb.gov.tr/genel/searchhotelgenel.aspx?lang=tr" target="_blank"
              rel="norefferer nofollower" className="text-lagoGray2 font-jost text-[14px] font-normal leading-[18px] cursor-pointer">{t("culture")}</Link>
              <div className="w-full h-[1px] bg-[#5a5a5a]"></div>
              </div>
      </div>

      <div className="flex md:hidden bg-lagoBlack w-screen h-full pt-[29px] pb-[35px] items-center justify-center">
        <div className="flex flex-col gap-[35px] items-center justify-center w-[92%]">
          <Image
            src={logosvg}
            alt="Logo"
            width={167}
            height={66}
            className="object-contain items-center justify-center"
          />

          <div className="grid grid-cols-2 gap-[25px] items-start justify-start font-jost text-[12px] font-normal leading-[24px] w-full ">
            <div className="flex gap-[15px] items-center justify-center">
              <Phone className="flex" width={25} height={25} color="#A6A6A6" />
              <div className="flex flex-col gap-[10px] items-start justify-start">
                <span className="text-[#A6A6A6] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                 {t("phoneNumber")}
                </span>
                <div className="flex h-[1px] w-full bg-[#D9D9D9]/50"></div>
                <a href="tel:+902425171234" className="text-[#FBFBFB] leading-[32.53px] capsizedText6">
                +90 242 517 12 34
                </a>
              </div>
            </div>

            <div className="flex gap-[15px] items-center justify-center">
              <Phone className="flex" width={25} height={25} color="#A6A6A6" />
              <div className="flex flex-col gap-[10px] items-start justify-start">
                <span className="text-[#A6A6A6] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                {t("callCenter")}
                </span>
                <div className="flex h-[1px] w-full bg-[#D9D9D9]/50"></div>
                <a href="tel:+902422771143" className="text-[#FBFBFB] leading-[32.53px] capsizedText6">
                +90 242 277 11 43
                </a>
              </div>
            </div>

            <div className="flex gap-[15px] items-center justify-center">
              <LocationSvg
                className="flex"
                width={26}
                height={26}
                color="#A6A6A6"
              />
              <div className="flex flex-col gap-[10px] items-start justify-start">
                <span className="text-[#A6A6A6] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                {t("ourAddress")}
                </span>
                <div className="flex h-[1px] w-full bg-[#D9D9D9]/50"></div>
                <p className="text-[#FBFBFB] leading-[32.53px] capsizedText6 tracking-[0.3px] whitespace-nowrap">
                  Manavgat/Antalya, TR 
                </p>
              </div>
            </div>

            <div className="flex gap-[15px] items-center justify-center">
              <MessageSvg
                className="flex"
                width={26}
                height={26}
                color="#A6A6A6"
              />
              <div className="flex flex-col gap-[10px] items-start justify-start">
                <span className="text-[#A6A6A6] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                  {t("emailAddress")}
                </span>
                <div className="flex h-[1px] w-full bg-[#D9D9D9]/50"></div>
                <p className="text-[#FBFBFB] leading-[32.53px] capsizedText6 tracking-[0.3px]">
                info@azuradeluxe.com
                </p>
              </div>
            </div>
            
          </div>

          {/* <div className="flex flex-col w-full items-center justify-center font-jost font-normal text-[14px]">
            <div
              onClick={() => setIsRoomsOpen(!isRoomsOpen)}
              className="flex w-[98%] p-[10px] md:max-w-[306px] items-center justify-between border border-white leading-[26.667px]"
            >
               {t("category1")} <ArrawDown className="flex" width={25} height={25} />
            </div>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                isRoomsOpen ? "max-h-[200px] opacity-100 w-[90%]" : "max-h-0 opacity-0 w-[90%]"
              }`}
            >
              <div className="mt-2 space-y-2 pl-4 border-l border-white/30 font-jost">
             
                <Link
                  href="/rooms/familyroom"
                  className="block text-[14px] text-[#A6A6A6] leading-[29.639px] uppercase"
                >
                  {t("family")}
                </Link>
                <Link
                  href="/rooms/deluxeroom"
                  className="block text-[14px] text-[#A6A6A6] leading-[29.639px] uppercase"
                >
                  {t("deluxe")}
                </Link>
                <Link
                  href="/rooms/fantasyroom"
                  className="block text-[14px] text-[#A6A6A6] leading-[29.639px] uppercase"
                >
                {t("fantasy")}
                </Link>
              </div>
            </div>

            <Link
              href="/restaurants"
              className="flex w-[98%] p-[10px] md:max-w-[306px] mt-[15px] items-center justify-between border border-white leading-[26.667px]"
            >
             {t("category2")}
            </Link>
            <Link
              href="/connect"
              className="flex w-[98%] p-[10px] md:max-w-[306px] mt-[15px] items-center justify-between border border-white leading-[26.667px]"
            >
             {t("contact")}{" "}
            </Link>
            <div
                onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="flex w-[98%] p-[10px] md:max-w-[306px] mt-[15px] items-center justify-between border border-white leading-[26.667px]"
            >
              MORE <ArrawDown className="flex" width={25} height={25} />
            </div>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                isMoreOpen ? "max-h-[200px] opacity-100 w-[90%]" : "max-h-0 opacity-0 w-[90%]"
              }`}
            >
              <div className="mt-2 space-y-2 pl-4 border-l border-white/30 font-jost">
                <Link
                  href="/entertainment"
                  className="block text-[14px] text-[#A6A6A6] leading-[29.639px] uppercase"
                >
                  {t("entertainment")}
                </Link>
                <Link
                  href="/kidsclub"
                  className="block text-[14px] text-[#A6A6A6] leading-[29.639px] uppercase"
                >
                  {t("kids")}
                </Link>
                <Link
                  href="/gallery/"
                  className="block text-[14px] text-[#A6A6A6] leading-[29.639px] uppercase"
                >
                  {t("gallery")}
                </Link>
                
              
              </div>
            </div>
          </div> */}
          <Link
              href="https://www.instagram.com/azuradeluxeresort/"
              target="_blank"
              rel="norefferer nofollower"
              className="hidden md:flex"
            >
              {" "}
              <FaInstagram className="w-[30px] hidden md:flex h-[32px]" />
            </Link>
            <Link
            className="hidden md:flex"
              href="https://www.facebook.com/AzuraDeluxeResort/"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaFacebook className="hidden md:flex w-[30px] h-[32px]" />
            </Link>
           
            <Link
            className="hidden md:flex"
              href="https://www.youtube.com/channel/UC3Z23WuWOhmpFnbw9fLI1-g"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaYoutube className="w-[30px] hidden md:flex h-[32px] " color="#A7ABAD" />
            </Link>
          <div className="flex w-full items-center justify-center gap-[10px]">
            <div className="flex bg-white rounded-[4px] shadow-divCustom w-[42.412px] h-[42.412px] items-center justify-center "><Link
              href="https://www.tripadvisor.com.tr/Hotel_Review-g609052-d7391617-Reviews-Azura_Deluxe_Resort_Spa-Avsallar_Alanya_Turkish_Mediterranean_Coast.html"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaTripadvisor className="w-[30px] h-[32px]" />
            </Link></div>
            <div className="flex bg-white rounded-[4px] shadow-divCustom w-[42.412px] h-[42.412px] items-center justify-center "> <BSvg className="flex" width={70} height={63}/></div>
            <div className="flex bg-white rounded-[4px] shadow-divCustom w-[42.412px] h-[42.412px] items-center justify-center "><Link
              href="https://www.facebook.com/AzuraDeluxeResort/"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaFacebook className="w-[30px] h-[32px]" />
            </Link></div>
            <div className="flex bg-white rounded-[4px] shadow-divCustom w-[42.412px] h-[42.412px] items-center justify-center "> <Link
              href="https://www.youtube.com/channel/UC3Z23WuWOhmpFnbw9fLI1-g"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaYoutube className="w-[30px] h-[32px]" />
            </Link></div>
            <div className="flex bg-white rounded-[4px] shadow-divCustom w-[42.412px] h-[42.412px] items-center justify-center"><Link
              href="https://www.instagram.com/azuradeluxeresort/"
              target="_blank"
              rel="norefferer nofollower"
            >
              {" "}
              <FaInstagram className="w-[30px] h-[32px]" />
            </Link></div>
          </div>
          <div className="w-full flex md:hidden flex-col gap-4 mt-3 items-center justify-center text-center">
                <div className="w-full h-[1px] bg-[#5a5a5a]"></div>
                <Link href="https://www.ktb.gov.tr/genel/searchhotelgenel.aspx?lang=tr" target="_blank"
              rel="norefferer nofollower" className="text-lagoGray2 font-jost text-[14px] font-normal leading-[18px] cursor-pointer">{t("culture")}</Link>
              <div className="w-full h-[1px] bg-[#5a5a5a]"></div>
              </div>
        </div>
      </div>



       <div className="w-full hidden lg:flex flex-col gap-5 mt-12 items-center justify-center text-center">
                <div className="w-full max-w-[1100px] 2xl:max-w-[1200px] h-[1px] bg-[#5a5a5a]"></div>
                <Link href="https://www.ktb.gov.tr/genel/searchhotelgenel.aspx?lang=tr" target="_blank"
              rel="norefferer nofollower" className="text-lagoGray2 font-jost text-[16px] font-normal leading-[20px] cursor-pointer">{t("culture")}</Link>
              <div className="w-full max-w-[1100px] 2xl:max-w-[1200px] h-[1px] bg-[#5a5a5a]"></div>
              </div>





      {/* Alt ince çizgi */}
      <div className="md:flex hidden w-full mt-[20px]" />
      <Link href="https://dgtlface.com"   rel="norefferer nofollower"
                  target="_blank" className="flex w-full text-[14px] font-normal leading-normal font-jost tracking-[0.56px] mb-2 pb-[80px] md:py-[1.8%] text-center justify-center items-center gap-[9.13px] text-[#A6A6A6]">
            Powered by <DgtlfaceSvg className="flex" width={104} height={27} />
      </Link>
    </footer>
  );
}
