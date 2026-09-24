import React from 'react'
import EnvironmentSvg from './EnvironmentSvg'
import ActiviteSvg from './ActiviteSvg'
import SocialSvg from './SocialSvg'
import StaffSvg from './StaffSvg'


const KidsIconsSection = ({ texts }) => {

  return (
    <div className='flex w-screen items-center justify-center bg-[#9fc5d3]/10 py-[40px]'>
      <div className='w-[87.79%] md:w-[91.4%] lg:w-[76.8%] grid grid-cols-2 lg:flex lg:flex-row lg:justify-between items-center gap-[20px] md:gap-[35px] max-w-[1106px]'>
        <div className='flex flex-col gap-[18px] items-center justify-center'>
            <div className='flex bg-[#84C9EA] rounded-full p-[28px] md:p-[32px]'>
                <EnvironmentSvg className="flex" width={57} height={56}/>
            </div>
            <div className='flex flex-col items-center justify-center gap-[8px]'>
                <span className='text-[#121212] font-marcellus font-normal leading-[26px] text-[16px] md:text-[18px]'>{texts.environment}</span>
                <div className='bg-[#84C9EA] h-[6px] w-[50px]'></div>
            </div>
        </div>

        <div className='flex flex-col gap-[18px] items-center justify-center'>
            <div className='flex bg-[#84C9EA] rounded-full p-[28px] md:p-[32px]'>
                <ActiviteSvg className="flex" width={57} height={56}/>
            </div>
            <div className='flex flex-col items-center justify-center gap-[8px]'>
                <span className='text-[#121212] font-marcellus font-normal leading-[26px] text-[14px] md:text-[16px] lg::text-[18px]'>{texts.activities}</span>
                <div className='bg-[#84C9EA] h-[6px] w-[50px]'></div>
            </div>
        </div>

        <div className='flex flex-col gap-[18px] items-center justify-center'>
            <div className='flex bg-[#84C9EA] rounded-full p-[28px] md:p-[32px]'>
                <SocialSvg className="flex" width={57} height={56}/>
            </div>
            <div className='flex flex-col items-center justify-center gap-[8px]'>
                <span className='text-[#121212] font-marcellus font-normal leading-[26px] text-[16px] md:text-[18px]'>{texts.social}</span>
                <div className='bg-[#84C9EA] h-[6px] w-[50px]'></div>
            </div>
        </div>

        <div className='flex flex-col gap-[18px] items-center justify-center'>
            <div className='flex bg-[#84C9EA] rounded-full p-[28px] md:p-[32px]'>
                <StaffSvg className="flex" width={57} height={56}/>
            </div>
            <div className='flex flex-col items-center justify-center gap-[8px]'>
                <span className='text-[#121212] font-marcellus font-normal leading-[26px] text-[16px] md:text-[18px]'>{texts.staff}</span>
                <div className='bg-[#84C9EA] h-[6px] w-[50px]'></div>
            </div>
        </div>

      </div>
    </div>
  )
}

export default KidsIconsSection
