import SubRoomBanner from '../subroomComponent/components/SubRoomBanner'
import SubroomCarousel from '../subroomComponent/components/SubroomCarousel'
import RoomFeatures from '../subroomComponent/components/RoomFeatures'
import BackgroundSection from '../subroomComponent/components/BackgroundSection'
import RoomTour from '../subroomComponent/components/RoomTour'
import OtherOptions from '../subroomComponent/components/OtherOptions'
import ContactSection2 from '@/app/[locale]/GeneralComponents/Contact/ContactSection2'
import { readRoomDetailLocale } from '@/lib/azura-room-detail-content'

export const dynamic = 'force-dynamic'

const Page = async ({ params }) => {
  const { locale } = await params
  const { texts, images, tours, rooms, featureTexts } = await readRoomDetailLocale('deluxe', locale)
  const info = texts.RoomInfo
  const background = texts.BackgroundSection
  const subroomBannerText = [texts.text1, texts.text2, texts.text3]
  const iconTexts = [info.amenities.doubleBed, info.amenities.singleBed]

  return (
    <div className=' overflow-hidden flex flex-col items-center justify-center gap-[60px] md:gap-[80px] lg:gap-[100px] bg-[#fbfbfb]'>
     <div className='flex flex-col'>
     <SubRoomBanner img={images.hero} span={texts.subtitle} header={texts.title} texts={subroomBannerText}/>
     <SubroomCarousel images={images.gallery}/>
     </div>
      <RoomFeatures span={info.subtitle} header={info.title} text={info.text} header2={info.title2} header3={info.title3}  text2={info.text2} iconsTexts={iconTexts} features={featureTexts}  sofa={true} sofaText={info.amenities.sofa} />
     <BackgroundSection span={background.subtitle} header={background.title} texts={[background.text]} link="/" img={images.background}/>
     {tours.map(tour => <RoomTour key={tour.id} span={tour.subtitle} header={tour.title} text={tour.text} link={tour.url}/>)}
      <OtherOptions rooms={rooms} content={texts.OtherOptions}/>
      <ContactSection2/>
    </div>
  )
}

export default Page
