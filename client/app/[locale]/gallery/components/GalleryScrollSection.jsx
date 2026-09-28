"use client"
import React, { useState, useEffect } from "react"
import {useTranslations} from 'next-intl';
import { MdArrowBackIosNew, MdArrowForwardIos } from "react-icons/md";
import Image from "next/image"
const GalleryScrollSection = ({ categories }) => {
  const t = useTranslations('Gallery');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id);
  const [modalId, setModalId] = useState(null);
  const active = categories.find(category => category.id === selectedCategory) ?? categories[0];
  const images = active?.images ?? [];
  const modalIndex = images.findIndex(image => image.id === modalId);
  const modalImage = images[modalIndex] ?? null;
  const openModal = image => setModalId(image.id);
  const scrollPrev = () => {
    if (modalIndex >= 0 && images.length) setModalId(images[(modalIndex + images.length - 1) % images.length].id);
  };
  const scrollNext = () => {
    if (modalIndex >= 0 && images.length) setModalId(images[(modalIndex + 1) % images.length].id);
  };

  useEffect(() => {
    if (!modalImage) return; // Modal kapalıysa listener ekleme
    
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        scrollNext();
      } else if (e.key === "Escape") {
        setModalId(null);
      }
    };
  
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalImage, scrollPrev, scrollNext]);


  return (
    <div className="flex w-screen items-center justify-center mt-[50px] max-w-[1440px]">
      <div className="flex flex-col items-center justify-between w-[87.79%] md:w-[91.4%] lg:w-[76.8%] gap-[40px]">
        
        {/* Butonlar */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:flex items-center justify-center xl:justify-between gap-[10px] w-full max-w-[1008px]">
          {categories.map(({ id: category }) => (
            <button
              key={category}
              onClick={() => { setSelectedCategory(category); setModalId(null); }}
              className={`flex border border-lagoGray items-center justify-center whitespace-nowrap py-[12px] px-[16px] lg:py-[16px] lg:px-[20px] lg:w-[140px] text-[12px] lg:text-[14px] font-medium uppercase leading-[125%] -tracking-[0.33px] font-jost ${
                active?.id === category ? "bg-lagoGray text-white" : "text-lagoGray"
              }`}
            >
              {t(category)}
            </button>
          ))}
        </div>

        {/* Resimler */}
        <div className="flex lg:w-[1006px] h-[500px] md:h-[1000px] lg:h-[1700px]">
          <div className="flex flex-col w-full overflow-auto hover:overflow-scroll custom-scroll h-auto">
            <div className="columns-2 lg:columns-3 gap-[16px] lg:gap-[0px] transition-all duration-[350ms] ease-in-out cursor-pointer">
              {images.map((imgSrc) => (
                <div
                  className="mb-[19.16px] transition-all duration-[350ms] ease-in-out cursor-pointer"
                  key={imgSrc.id}
                  onClick={() => openModal(imgSrc)} // Resme tıklandığında modal açılır
                >
                  <Image src={imgSrc.src} width={imgSrc.width} height={imgSrc.height} alt={imgSrc.alt} className="lg:w-[322px] h-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal (Lightbox) */}
        {modalImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
            onClick={() => setModalId(null)} // Modal dışına tıklandığında kapanır
          >
            <div className="relative w-[35%] " onClick={(e) => e.stopPropagation()}>
              <Image src={modalImage.src} width={modalImage.width} height={modalImage.height} alt={modalImage.alt === "gallery" ? "Enlarged gallery" : modalImage.alt} className="w-full h-auto object-contain max-h-[720px]" />
              <button
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-gray-700 bg-opacity-50 hover:bg-opacity-75 text-white"
                onClick={scrollPrev}
                aria-label="Previous"
              >
                <MdArrowBackIosNew size={32} />
              </button>
              {/* Sağ Ok */}
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-gray-700 bg-opacity-50 hover:bg-opacity-75 text-white"
                onClick={scrollNext}
                aria-label="Next"
              >
                <MdArrowForwardIos size={32} />
              </button> 
            </div>
            <button
                className="absolute top-6 right-4 text-white text-4xl"
                onClick={() => setModalId(null)}
              >
                &times;
              </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default GalleryScrollSection
