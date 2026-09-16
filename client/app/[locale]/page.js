import React from 'react'
import  HomePage  from './HomePage/HomePage'
import { readHomepageExperience } from '@/lib/homepage-content'

export const dynamic = 'force-dynamic';

const page = async ({ params }) => {
  const { locale } = await params;
  const { welcomeText, essentials, carouselSlides, accommodation, ...experience } = await readHomepageExperience(locale);

  return (
    <div className='overflow-hidden'>
      <HomePage experience={experience} welcomeText={welcomeText} essentials={essentials} carouselSlides={carouselSlides} accommodation={accommodation} />
    </div>
  )
}

export default page
