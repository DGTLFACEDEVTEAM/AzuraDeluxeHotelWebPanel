import React from 'react'
import Connect1 from "./components/Connect1.jsx"
import Connect2 from './components/Connect2.jsx'
import Connect3 from './components/Connect3.jsx'
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2.jsx'
import HomePage6 from "../HomePage/Components/HomePage5.jsx"

import { readHomepageBackground } from '@/lib/homepage-content'

export const dynamic = 'force-dynamic';

const page = async ({ params }) => {
  const { locale } = await params;
  const background = await readHomepageBackground(locale);
  return (
    <div className='flex flex-col items-center justify-center gap-[50px] lg:gap-[100px] bg-[#fbfbfb] overflow-hidden'>
      <Connect1 />
      <Connect2 />
      <Connect3 />
      <ContactSection2 />
      <HomePage6 background={background} />
    </div>
  )
}

export default page
