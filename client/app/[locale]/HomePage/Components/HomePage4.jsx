"use client"

import React from "react"
import Beach from "./Icons/Beach"
import Dining from "./Icons/Dining"
import Fireworks from "./Icons/Fireworks"
import Kids from "./Icons/Kids"
import Pool from "./Icons/Pool"
import Spa from "./Icons/Spa"
import Link from "next/link"

export default function HomePage4({ essentials }) {
  
  const services = [
    {
      title: essentials.title1,
      Icon: Beach,
      description:
      essentials.text1,
        link:"/beach-pool"
    },
    {
      title: essentials.title2,
      Icon: Pool,
      description:
      essentials.text2,
        link:"/beach-pool"
    },
    // 3. sırada World-Class Dining
    {
      title: essentials.title3,
      Icon: Dining,
      description:
      essentials.text3,
        link:"/restaurants"
    },
    // 4. sırada Fun for Kids
    {
      title: essentials.title4,
      Icon: Kids,
      description:
      essentials.text4,
        link:"/kidsclub"
    },
    {
      title: essentials.title5,
      Icon: Fireworks,
      description:
      essentials.text5,
        link:"/entertainment"
    },
    {
      title: essentials.title6,
      Icon: Spa,
      description:
      essentials.text6,
        link:"spawellness"
    }
  ]

  return (
    <section className="max-w-[1440px] mx-auto px-4 w-screen items-center justify-center my-[25px]">
      {/* Üst küçük başlık */}
      <div className="flex flex-col 2xl:w-[1106px] w-[87.79%] md:w-[91.4%] xl:w-[76.8%] items-start ml-[6.1%] md:ml-[4.3%] xl:ml-[11.6%] justify-center gap-[15px] md:gap-[25px] lg:gap-[35px] text-lagoBlack">
      <p className="text-[12px] leading-[14px] tracking-[0.48px] uppercase font-medium font-jost">
       {essentials.subtitle}
      </p>

      {/* Büyük başlık */}
      <h2 className="text-[28px] md:text-[32px] lg:text-[48px] font-marcellus font-normal lg:leading-[57.6px] lg:capsizedText2 lg:w-[60%]">
      {essentials.title}
      </h2>

      {/* İkon + metin grid (2 satır x 3 sütun) */}
      <div className="flex flex-col items-start md:grid gap-[15px] md:gap-[20px] lg:gap-[29px] md:grid-cols-2 lg:grid-cols-3 w-full md:mt-[15px] lg:mt-[10px]">
        {services.map((service, index) => (
          <div
            key={index}
            className="flex gap-[15px] md:gap-[10px] lg:gap-[17px] items-center justify-center md:w-[92%] lg:w-[100%] xl:w-[98%]"
          >
            {/* İkon */}
            <Link href={service.link} className="shrink-0 items-center justify-center">
            <service.Icon width={50} height={50} />
            </Link>
            {/* Başlık + açıklama */}
            <div className="flex flex-col gap-[4px] md:gap-[10px] lg:gap-[17px]">
              <h3 className="font-jost text-[16px] leading-normal lg:text-[18px] font-normal md:leading-[30px]">
                {service.title}
              </h3>
              <p className="font-jost text-[12px] lg:text-[14px] font-normal leading-normal line-clamp-3">
                {service.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Alt kısım: Discover More link/button */}
      <div className="hidden lg:flex ">
        <Link href="/about" className="flex border-b font-marcellus border-lagoBlack text-lagoBlack uppercase text-[16px] font-normal leading-[30px] transition cursor-pointer">
        {essentials.buttonText}
        </Link>
      </div>
      </div>
    </section>
  )
}
