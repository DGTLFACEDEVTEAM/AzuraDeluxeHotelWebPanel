"use client"

import DynamicNavigationLinks from "./DynamicNavigationLinks";
import React, { useState, useRef, useEffect } from 'react'
import { usePathname } from "next/navigation"; // Sayfa değişimini takip etmek için
import Image from 'next/image'
import Link from 'next/link'
import Hamburger from './Icons/Hamburger'
import Phone from './Icons/Phone'
import TripAdvisor from './Icons/SocialMedia/TripAdvisor'
import Google from './Icons/SocialMedia/Google'
import { FaFacebookF, FaYoutube, FaInstagram } from "react-icons/fa"
import logosvg from "./Icons/blacklogo.svg"
import DownArrow from './Icons/DownArrow';
import { IoMdArrowDropdown } from "react-icons/io";
import Form from "../Form";
import { RxCross2 } from "react-icons/rx";
import LangSwitcher from '@/LangSwitcher';
import {useTranslations} from 'next-intl';

export default function HeaderWhite({ dynamicNavigation = [] }) {
  const t = useTranslations('Header');
    // 1 ekran scrolldan sonra headerin gözükmesi için
    const [showHeader, setShowHeader] = useState(false);

    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        if (window.scrollY > window.innerHeight) {
          setShowHeader(true); // 1 ekran (100vh) kadar scroll yapınca header görünsün
        } else {
          setShowHeader(false);
        }
      };
  
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // -------


  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null);
  const pathname = usePathname(); // Şu anki sayfanın yolunu al

  const [isRoomsOpen, setIsRoomsOpen] = useState(false);


  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

    // **Sayfanın herhangi bir yerine tıklayınca kapansın**
    useEffect(() => {
      function handleClickOutside(event) {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setIsMenuOpen(false);
        }
      }
  
      if (isMenuOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
  
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isMenuOpen]);

    useEffect(() => {
      setIsMenuOpen(false);
    }, [pathname]); // pathname değiştiğinde sidebar kapanacak

  return (
    <>
      <header className={`fixed top-0 left-0 w-screen z-[99] items-center justify-center transition-all duration-500 ease-in-out ${
        showHeader ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
      }`}>
        <div
          className="
            relative
            h-[10vh]
            md:h-[6vh]
            lg:h-[10vh]
            2xl:h-[85px]
            flex
            items-center
            bg-white/70 shadow-[0px_4px_4px_rgba(0,0,0,0.25)] backdrop-blur-[10px] 
            w-full"
        >
          {/* EN bar mobile*/}
           <div className="flex md:hidden items-center justify-center h-full gap-[4px] ml-[75%] sm:ml-[80%] md:ml-[15px]">
            <span className="text-lagoBlack text-[16px] font-medium leading-[125%] uppercase -tracking-[0.352px] font-jost capsizedText4"><LangSwitcher />  </span>
            <DownArrow className="flex" width={12} height={12} color="#1D1D1B"/>
          </div>


          {!isMenuOpen && (
            <button className="flex z-20 ml-[15px] md:ml-[4%] " onClick={toggleMenu}>
              <Hamburger width={30} height={30} color="#1D1D1B" className="object-contain" />
            </button>
          )}

          {/* EN bar */}
          <div className="hidden md:flex items-center justify-center h-full gap-[4px] ml-[15px]">
            <span className="text-lagoBlack text-[16px] font-medium leading-[125%] uppercase -tracking-[0.352px] font-jost capsizedText4"><LangSwitcher /> </span>
            <DownArrow className="flex" width={12} height={12} color="#1D1D1B"/>
          </div>

          {/* Ortadaki Logo */}
          <div className="absolute left-[24%] sm:left-[17%] h-full md:left-1/2 top-1/2 -translate-x-1/2 -translate-y-[30%] md:-translate-y-1/3">
          <Link className='w-full items-center justify-center flex' href="/">
           <Image 
              src={logosvg}
              alt="Logo"

              className="object-contain w-[70%] lg:w-[90%] lg:max-w-[300px] lg:h-auto"

            /></Link>
          </div>

          {/* Sağ Contact & Book Now */}
          <div className="ml-auto flex items-center justify-center space-x-[5px] mr-[4%] z-20 h-full">
            <Link 
              href="/connect"
              className="
              hidden
              lg:flex
                text-lagoBlack
                text-[16px]
                font-medium
                leading-normal
                uppercase
                 underline
                underline-offset-[5px]
                decoration-solid
                px-[30px]
                pb-[15px]
                pt-[8px]
                font-jost
                h-[41px]
              "
            >
               {t("contact")}
            </Link>
            <Link
             href="https://azuradeluxehotel.orsmod.com/"
               rel="norefferer nofollower"
                  target="_blank"
              className="
              hidden
               md:flex
                px-[35px]
                py-[17px]
               text-lagoBlack
                text-[16px]
                font-medium
                leading-normal
                uppercase
                bg-transparent
                border
                border-lagoBlack
                border-solid
                 h-[42px]
                 w-auto
                 items-center justify-center
                 font-jost
              "
            >
               {t("booknow")}
            </Link>
          </div>
        </div>
      </header>

      {/* Arkaya karartma (menü açıkken) */}
      {isMenuOpen && (
        <div
          onClick={toggleMenu}
          className="relative inset-0 z-[9999] "
        />
      )}

      {/* Menü paneli => lighten blend mode */}
      <div
        ref={menuRef} // **Referans atadık**
        className={`
          fixed top-0 left-0
          w-full
          lg:w-[420px]
          h-full
          bg-white/70 shadow-[0px_4px_4px_rgba(0,0,0,0.25)] backdrop-blur-[10px] 
          z-[9999]
          transform transition-transform duration-300
           ${isMenuOpen ? 'translate-x-0 md:translate-x-0' : 'translate-x-full md:-translate-x-full'}
        `}>


        {/* Menü kapatma butonu */}
        {/* MENÜ LİNKLERİ */}
        <div className="flex flex-col w-[98%] ml-[2%] h-full items-center justify-around py-[30px] lg:py-[15px] gap-[30px]">
        <button
              onClick={toggleMenu}
              className="hidden lg:flex absolute top-8 right-6 text-[40px] p-2 text-stoneLight text-white"
            >
              <RxCross2 size={24} color="#000" />
            </button> 

          <div className="flex lg:hidden  w-[90%] lg:w-[90%] items-center justify-between -mt-[10px]">
            <Image
              src={logosvg}
              alt="Logo"
              className="object-contain w-[62px] h-[46px] items-center justify-center"
            />
            <button
              onClick={toggleMenu}
              className="flex text-[40px] text-stoneLight text-white"
            >
               <RxCross2 size={24} color="#000" />
            </button>
          </div>


        <nav className="items-center md:w-[90%] justify-center ml-2 mt-6 px-4 w-full lg:max-w-[392px] space-y-[10px] text-[16px] lg:text-[18px] text-lagoBlack font-jost uppercase min-h-[521px]  md:h-[600px]  overflow-y-auto black-scrollbar">
        <div className="relative">
              <div
                onClick={() => setIsRoomsOpen(!isRoomsOpen)}
                className="flex items-center font-normal leading-[26.667px] gap-[11.11px] w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none"
              >
                 {t("accommodation")}
                <IoMdArrowDropdown
                  className={`w-4 h-4 transition-transform ${
                    isRoomsOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </div>

              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  isRoomsOpen
                    ? "max-h-[200px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="mt-2 space-y-2 pl-4 font-jost">
                <Link
                    href="/rooms/"
                    className="block text-[14px]  leading-[29.639px] uppercase"
                  >
                     {t("allrooms")}
                  </Link>
                  <Link
                   href="/rooms/deluxeroom"
                    className="block text-[14px]  leading-[29.639px] uppercase"
                  >
                   {t("deluxe")}
                  </Link>
                  <Link
                    href="/rooms/familyroom"
                    className="block text-[14px]  leading-[29.639px] uppercase"
                  >
                     {t("family")}
                  </Link>
                  <Link
                    href="/rooms/fantasyroom"
                    className="block text-[14px]  leading-[29.639px] uppercase"
                  >
                    {t("fantasy")}
                  </Link>
                 
                </div>
              </div>
            </div>
          <Link href="/beachpools" className="block  font-normal leading-[26.667px] w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("beachPools")}
          </Link>
          <Link href="/restaurants" className="block font-normal leading-[26.667px] w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("restaurants")}
          </Link>
          <Link href="/bars" className="block font-normal leading-[26.667px] w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("bars")}
          </Link>
          <Link href="/spor" className="block font-normal leading-[26.667px] w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("spor")}
          </Link>
          <Link href="/kidsclub" className="font-normal leading-[26.667px] items-center gap-[6px] flex w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("kids")}
          
          
          </Link>
          <Link href="/spawellness" className="block text-lagoBlack  font-normal leading-normal w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("spa")}
          </Link>
          <Link
              href="/entertainment"
              className="block text-lagoBlack  font-normal leading-normal w-[70%]  md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none"
            >
               {t("entertainment")}
            </Link>
          <Link href="/gallery" className="block text-lagoBlack  font-normal leading-normal w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("gallery")}
          </Link>
          <Link href="/about" className="block text-lagoBlack font-normal leading-normal w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("ourhotel")}
          </Link>
          <Link href="/connect" className="block text-lagoBlack font-normal leading-normal w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none">
          {t("contact")}
          </Link>
          <DynamicNavigationLinks items={dynamicNavigation} onNavigate={() => setIsMenuOpen(false)}
              className="block text-lagoBlack font-normal leading-normal w-[70%] md:w-[90%] lg:max-w-[360.114px] py-[11px] border-b border-b-[#000000] lg:border-none" />
          </nav>

        {/* TELEFON + BUTON ALANI */}
        <div className="ml-2 px-4 w-full lg:max-w-[392px] flex flex-col items-center font-jost">
          <div className="flex items-center justify-center gap-[15px] text-lagoBlack">
            <Phone className="flex" width={18} height={18} color="#1D1D1B"/>
            <span className="text-[15px] font-normal leading-[24px]">+90 242 277 11 43</span>
          </div>

          <button
          onClick={() => setIsFormOpen(true)}
            className="
             flex justify-center
             items-center
              mt-[20px]
              w-[253px]
              h-[42px]
              bg-[#181818]
              text-white
              uppercase
              text-center
              font-semibold
              hover:bg-gray-800
              leading-[24px]
              py-[15px]
              px-[19px]
            "
          >
             {t("letuscallyou")}
          </button>

          <Form isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

          {/* Sosyal İkonlar */}
          <div className="flex items-center justify-center gap-4 mt-[18.79px]">
            <Link
               href="https://www.tripadvisor.com.tr/Hotel_Review-g609052-d7391617-Reviews-Azura_Deluxe_Resort_Spa-Avsallar_Alanya_Turkish_Mediterranean_Coast.html"
               target="_blank"
                rel="norefferer nofollower"
              className="bg-white h-[42.412px] w-[42.412px] rounded-[4px] shadow-custom flex items-center justify-center"
            >
              <TripAdvisor className="flex" width={34} height={34} />
            </Link>
            <Link
              href="https://maps.app.goo.gl/usJ9fRr3Po35C3bw8"
              target="_blank"
               rel="norefferer nofollower"
              className="bg-white h-[42.412px] w-[42.412px] rounded-[4px] shadow-custom flex items-center justify-center"
            >
              <Google className="flex" width={70} height={70} />
            </Link>
            <Link
              href="https://www.facebook.com/AzuraDeluxeResort/"
              target="_blank"
               rel="norefferer nofollower"
              className="bg-white h-[42.412px] w-[42.412px] rounded-[4px] shadow-custom flex items-center justify-center"
            >
              <FaFacebookF className="w-6 h-6" color='#505050'/>
            </Link>
            <Link
             href="https://www.youtube.com/channel/UC3Z23WuWOhmpFnbw9fLI1-g"
                target="_blank" rel="norefferer nofollower"
              className="bg-white h-[42.412px] w-[42.412px] rounded-[4px] shadow-custom flex items-center justify-center"
            >
              <FaYoutube className="w-6 h-6" color='#505050'/>
            </Link>
            <Link
              href="https://www.instagram.com/azuradeluxeresort/"
                target="_blank"  rel="norefferer nofollower"
              className="bg-white h-[42.412px] w-[42.412px] rounded-[4px] shadow-custom flex items-center justify-center"
            >
              <FaInstagram className="w-6 h-6" color='#505050'/>
            </Link>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
