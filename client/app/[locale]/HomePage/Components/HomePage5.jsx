"use client"
import React from "react"
import Link from "next/link"

export default function HomePage5({ background }) {

  return (
    <div className="flex flex-col items-center justify-center gap-0 w-screen">
      <div className="flex w-full items-center justify-center h-[191px] bg-[#fbfbfb] relative">
      <section className="w-[87.79%] md:w-[91.4%] lg:w-[60%] md:min-w-[345px] md:max-w-[550px] lg:max-w-[900px] flex flex-col items-center justify-center z-[90] absolute -bottom-8 lg:-bottom-12 gap-[10px] md:gap-[25px] lg:gap-[30px]">
      {/* Küçük üst başlık */}
      <p className=" font-jost text-[12px] leading-[14px] tracking-[0.48px] uppercase  font-medium text-lagoBlack">
      {background.subtitle}
      </p>

      {/* Büyük başlık */}
      <h2 className="text-lagoBlack w-[80%] text-[28px] md:text-[32px] lg:text-[48px] leading-normal md:leading-[43.2px] lg:leading-[57.6px] font-marcellus font-normal text-center lg:capsizedText2">
      {background.title}
      </h2>

      {/* İnce yatay çizgi */}

      {/* Paragraf */}
      <p className="w-full leading-[130%] md:leading-[24px] font-jost text-[14px] lg:text-[16px] font-normal text-center text-lagoBlack lg:capsizedText4 line-clamp-5">
      {background.text}
      </p>

      
        <Link href="/about" className="text-[14px] md:text-[16px] font-normal leading-[30px] font-marcellus uppercase border-b border-lagoBlack text-center w-auto items-center justify-center">
        {background.buttonText}
        </Link>
    
    </section>
      </div>

      <div
      className="relative w-full h-[246.39px] md:h-[335px] lg:h-[530px] 2xl:h-[68vh] bg-cover bg-start items-center justify-center"
      style={{
        backgroundImage: `url(${background.image})`
      }}
    >
      {/* 
        Gradyan sadece üst 150px'i kaplasın:
        absolute top-0 left-0 w-full h-[150px]
      */}
     
      
    </div>
    </div>
  )
}
