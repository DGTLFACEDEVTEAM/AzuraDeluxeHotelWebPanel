import React from "react";
import RoomsBanner from "./components/RoomsBanner";
import RoomsInfoSection from "./components/RoomsInfoSection";
import RoomsSection from "./components/RoomsSection";
import RoomsSectionReverse from "./components/RoomsSectionReverse";
import RoomsParallaxSection from "./components/RoomsParallaxSection";

import ContactSection2 from "../GeneralComponents/Contact/ContactSection2";
import { readRoomsPageLocale } from "@/lib/azura-rooms-page-content.mjs";

export const dynamic = "force-dynamic";

const ROOM_ROUTES = Object.freeze({
  deluxe: { id: "deluxeroom", link: "/rooms/deluxeroom" },
  family: { id: "familyroom", link: "/rooms/familyroom" },
  fantasy: { id: "fantasyroom", link: "/rooms/fantasyroom" },
});

const Page = async ({ params }) => {
  const { locale } = await params;
  const { cards, hero, intro, parallax } = await readRoomsPageLocale(locale);

  return (
    <div className="overflow-hidden flex flex-col items-center justify-center gap-[50px] lg:gap-[100px] bg-[#fbfbfb]">
      <RoomsBanner content={hero} />
      <RoomsInfoSection content={intro} />
      {cards.map((card, index) => {
        const Section = index === 1 ? RoomsSectionReverse : RoomsSection;
        const route = ROOM_ROUTES[card.key];
        return <Section
          key={card.key}
          id={route.id}
          img={card.primary}
          img2={card.secondary}
          header={card.title}
          text={card.text}
          span={card.area}
          span2={card.view}
          buttonText={card.buttonText}
          link={route.link}
        />;
      })}

      <RoomsParallaxSection content={parallax} />
      <ContactSection2/>
    </div>
  );
};

export default Page;
