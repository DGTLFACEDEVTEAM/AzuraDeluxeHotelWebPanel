import React from 'react'
import  HomePage  from './HomePage/HomePage'
import { readHomepageExperience } from '@/lib/homepage-content'

export const dynamic = 'force-dynamic';

const page = async ({ params }) => {
  const { locale } = await params;
  const experience = await readHomepageExperience(locale);

  return (
    <div className='overflow-hidden'>
      <HomePage experience={experience} />
    </div>
  )
}

export default page
