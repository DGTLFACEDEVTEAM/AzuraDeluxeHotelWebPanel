import React from 'react'
import Link from 'next/link'

const MainRestaurantSection = ({ content, image }) => {

  return (
    <div className='flex w-screen h-[45vh] min-h-[460px] items-center justify-center bg-center bg-cover  relative' style={{ backgroundImage: `url(${image.src})` }}>
        <div className='absolute inset-0 z-[1] bg-lagoBlack/40'></div>
      <div className='flex w-[1106px] items-center md:items-start justify-center md:justify-start'>
      <div className='flex flex-col ml-0 md:ml-8 lg:ml-0 w-[87.79%] md:w-[91.4%] lg::w-[48.19%] items-center text-center md:text-start md:items-start justify-center gap-[20px] lg:gap-[30px] font-jost text-white z-10'>
        <span className='text-[12px] font-medium leading-[14px] tracking-[0.48px] uppercase'>{content.subtitle}</span>
        <h3 className='text-[28px] md:text-[32px] lg:text-[48px] font-marcellus font-normal leading-[120%] lg:leading-[63.6094px] lg:capsizedText2'>{content.title}</h3>
        <p className='text-[14px] lg:text-[16px] font-normal leading-[18px] lg:leading-[24px] list-disc capsizedText4 w-[50%]'>{content.text}</p>
        <p className='text-[14px] lg:text-[16px] font-normal leading-[18px] lg:leading-[24px] list-disc capsizedText4 w-[50%]'>{content.span}</p>
        <ul className='text-[14px] lg:text-[16px] font-normal leading-[18px] lg:leading-[24px] marker:text-[8px] pl-4 list-disc'>
            <li>{content.list1}</li>
            <li>{content.list2}</li>
            <li>{content.list3}</li>
        </ul>
        {/* <Link
            href="/restaurants/mainrestaurant"
            className="text-[14px] lg:text-[16px] font-normal leading-normal ml-[4px] font-marcellus uppercase border-b border-white pb-[8px] h-[24px] text-center w-auto items-center justify-center">
          {t("buttonText")}
          </Link> */}
      </div>
      </div>
    </div>
  )
}

export default MainRestaurantSection
