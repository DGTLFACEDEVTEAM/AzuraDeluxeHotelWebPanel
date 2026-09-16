import React from 'react'
import HomePage1 from "./Components/HomePage"
import Reservation from './Components/Reservation'
import HomePage2 from "./Components/HomePage1"
import HomePage3 from "./Components/HomePage2"
import HomePage4 from "./Components/HomePage3"
import HomePage5 from "./Components/HomePage4"
import HomePage6 from "./Components/HomePage5"
import ContactSection from '../GeneralComponents/Contact/ContactSection'
import EmblaCarousel from "./Components/Slider/Slider1"
import TwoAnimationImage from "./Components/TwoAnimationImage"

const HomePage = ({ experience, welcomeText, essentials, carouselSlides, accommodation }) => {
  return (
    <div className='flex flex-col items-center justify-center overflow-hidden'>
        <HomePage1 />
        <HomePage2 welcomeText={welcomeText} />
        <EmblaCarousel slides={carouselSlides} options={{ loop: true }}/>
     <div className='flex flex-col items-center justify-center w-screen gap-[60px] md:gap-[80px] lg:gap-[100px] bg-[#fbfbfb]'>
     {/* <HomePage3 /> */}
     <TwoAnimationImage {...experience}/>
     <HomePage4 accommodation={accommodation} />
        <HomePage5 essentials={essentials} />
        <ContactSection />
        <HomePage6 />
     </div>
        
    </div>
  )
}

export default HomePage
