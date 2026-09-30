"use client";
import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
const Certificate = ({images, title, modalAlt}) => {
  const [modalImage, setModalImage] = useState(null) 

  const [emblaRef, emblaApi] = useEmblaCarousel({  loop: true,
    align: "start",
    startIndex: 0, });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const handleJump = useCallback(index => { emblaApi?.scrollTo?.(index); }, [emblaApi]);
    
  const scrollPrev = useCallback(() => {
    if (emblaApi && emblaApi.scrollPrev) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi && emblaApi.scrollNext) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on("select", () => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
      });
      setSelectedIndex(emblaApi.selectedScrollSnap());
    }
  }, [emblaApi]);

  return (
    <div className="flex w-screen h-auto items-center justify-center  max-w-[1440px] mt-[50px] mb-[100px]">
      <div className="flex flex-col w-[93.89%] ml-[6.1%] md:ml-[4.3%] md:mr-[4.3%] md:w-[91.4%] lg:ml-0 lg:mr-0 xl:w-[80.8%] items-center justify-center gap-[30px] lg:gap-[50px] lg:min-w-[960px]">
    
      {/* <span className="text-[12px] font-medium uppercase tracking-[0.48px] leading-[14px] font-jost"></span> */}
    <h2 className="text-[28px] md:text-[32px] lg:text-[48px] font-marcellus font-normal leading-[120%] lg:leading-[57.6px] lg:capsizedText2">
    {title}
    </h2>
     

        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div  className="flex">
            {images.map((image,index) => (
              <div key={image.id} className="flex-[0_0_80%] md:flex-[0_0_55%] lg:flex-[0_0_33.3%] xl:flex-[0_0_28.3%] min-w-0 mr-[3%] md:mr-[1.5%]">
              <div className="flex flex-col w-full items-start justify-center gap-[15px] md:gap-[25px] font-jost text-black "  onClick={() => setModalImage(image)} >
                <Image 
                  src={image} 
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  className="object-cover shadow-lg transition-shadow duration-300 ease-in-out hover:shadow-xl"
                />
                
              </div>
            </div>
            ))}
          </div>
        </div>

        <div className="flex lg:hidden items-end justify-end w-full mt-[5px] md:mt-[20px] lg:mt-[50px] relative">
  {images.map((_, i) => (
    <div
      key={i}
      className={`transition-all w-[25%] h-[1px] bg-[#24292C] ${
        selectedIndex === i ? "p-[1px]" : "bg-[#848383] "
      }`}
      onClick={() => handleJump(i)}
    />
  ))}
</div>


{modalImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 mt-[4%]"
            onClick={() => setModalImage(null)} // Modal dışına tıklandığında kapanır
          >
            <div className="relative w-[30%] " onClick={(e) => e.stopPropagation()}>
              <Image src={modalImage} alt={modalAlt} className="w-full h-auto object-contain" />
              
            </div>
            <button
                className="absolute top-6 right-4 text-white text-4xl"
                onClick={() => setModalImage(null)}
              >
                &times;
              </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Certificate;
