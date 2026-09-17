import React from 'react'
import Link from 'next/link'

const RoomsBanner = ({ content }) => {

  return (
    <div className='flex w-screen h-screen lg:items-end md:items-center md:justify-center lg:justify-end bg-center bg-cover ' style={{ backgroundImage: `url(${content.image})` }}>
      <div className='flex h-full w-full lg:w-[42%] bg-[#1D1D1B]/40 justify-center items-end md:items-center'>
      <div className="flex flex-col gap-[34px] 2xl:gap-[45px] md:gap-10 w-[80%] h-auto text-white text-center justify-center items-center mt-[16%] mb-[20px] lg:mb-0">
        <h2 className='font-marcellus text-[36px] lg:text-[44px] leading-[20px] -tracking-[0.88px] font-normal 2xl:mb-4'>{content.header}</h2>
        <Link href="/rooms#deluxeroom" className='flex py-[10px] px-[40px] border-[2px] border-white justify-center items-center shadow-buttonCustom gap-[65px] font-jost uppercase text-[14px] lg:text-[16px] font-medium leading-[30px] text-center bg-transparent w-[90%] md:w-[50%] xl:w-[45%] lg:min-w-[337px]'>{content.buttonText1}</Link>
        <Link href="/rooms#familyroom" className='flex py-[10px] px-[40px] border-[2px] border-white justify-center items-center shadow-buttonCustom gap-[65px] font-jost uppercase text-[14px] lg:text-[16px] font-medium leading-[30px] text-center bg-transparent w-[90%] md:w-[50%] xl:w-[45%] lg:min-w-[337px]'>{content.buttonText2}</Link>
        <Link href="/rooms#fantasyroom" className='flex py-[10px] px-[40px] border-2 border-white justify-center items-center shadow-buttonCustom gap-[65px] font-jost uppercase text-[14px] lg:text-[16px] font-medium leading-[30px] text-center bg-transparent w-[90%] md:w-[50%] xl:w-[45%] lg:min-w-[337px]'>{content.buttonText3}</Link>
      </div>
      </div>
    </div>
  )
}

export default RoomsBanner
