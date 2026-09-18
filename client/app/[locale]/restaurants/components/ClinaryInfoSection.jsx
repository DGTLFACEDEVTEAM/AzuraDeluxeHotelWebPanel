"use client";
import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";

const ClinaryInfoSection = ({
  // Dışarıdan farklı görseller gelmezse varsayılan olarak import edilenler kullanılacak
  img1 ,
  img2 ,
  span,
  header,
  texts = [],
}) => {

  const [animate, setAnimate] = useState(false);
  const sectionRef = useRef(null); // Bölümü takip etmek için referans

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true); // Sayfa bölüme geldiğinde animasyonu tetikle
          observer.disconnect(); // **Bir kez çalıştıktan sonra izlemeyi bırak**
        }
      },
      { threshold: 0.5 } // %50 görünür olduğunda tetikle
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect(); // Component kaldırılırsa temizle
  }, []);

  return (
    <div   ref={sectionRef} className="flex w-screen h-auto md:h-[40vh] lg:h-[555px] items-center justify-center max-w-[1440px]">
      <div className="flex flex-col md:flex-row w-[87.79%] md:w-[91.4%] xl:w-[76.8%] items-center justify-center gap-[30px] md:gap-[36.83px] lg:gap-[52px] h-full">
        
        {/* Metin Alanı */}
        <div className="flex flex-col w-[90%] md:w-[49%] items-center md:items-start justify-center text-center md:text-start gap-[15px] md:gap-[25px] lg:gap-[35px] text-black font-jost">
          {span && (
            <span className="text-[12px] font-medium leading-[14px] tracking-[0.481px] uppercase">
              {span}
            </span>
          )}

          {header && (
            <h2 className="text-[28px] md:text-[32px] lg:text-[48.089px] font-normal font-marcellus leading-[120%] lg:leading-[57.707px] lg:capsizedText2">
              {header}
            </h2>
          )}

          {/* İlk metin (her zaman paragraf olarak gösterilir) */}
          {texts[0] && (
            <p className="text-[14px] lg:text-[16px] font-normal leading-[18.126px] lg:leading-[24px] leading-trim-both text-edge-cap lg:capsizedText4">
              {texts[0]}
            </p>
          )}

          <div className="flex flex-col items-start justify-start text-start gap-[15px] md:gap-[25px] lg:gap-[35px]">
            {/* Eğer metin sayısı 2'den az (1 veya 2 ise) ikinci metni normal paragraf olarak göster */}
          {texts.length < 3 && texts[1] && (
            <p className="text-[14px] lg:text-[16.03px]  font-normal leading-[18.126px] lg:leading-[24px] leading-trim-both text-edge-cap">
              {texts[1]}
            </p>
          )}

          {/* Eğer metin sayısı 3 veya daha fazlaysa ilk metinden sonrasını liste olarak göster */}
          {texts.length >= 3 && (
            <ul className="hidden md:flex md:flex-col text-[14px] lg:text-[16.03px] font-normal leading-[18.126px] lg:leading-[24.045px] list-disc pl-5 marker:text-xs marker:text-black">
              {texts.slice(1).map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          )}
          </div>
        </div>

        {/* Görsel Alanı */}
        <div className="flex w-[65%] sm:w-[50%] min-w-[310px] md:w-[48.8%] items-center md:items-center lg:items-start  lg:mt-[67px] md:mt-0 justify-start relative md:h-[555px] h-auto mb-[60px]">
          <Image
           style={{ objectFit: "cover" }}
            src={img2}
            alt={img2.alt ?? "art"}
            width={img2.width}
            height={img2.height}
            className={`w-[175px] h-[260px] md:w-[186.60px] md:h-[279.91px] lg:w-[300px] lg:h-[450px] transition-all duration-1000 ease-in-out mb-[20px] lg:mb-0 ${
              animate ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0"
            }`}
          />
          <Image
           style={{ objectFit: "cover" }}
            src={img1}
            alt={img1.alt ?? "art"}
            width={img1.width}
            height={img1.height}
            className={`absolute top-[80px] left-[126px] md:top-[208px] md:left-[135px] lg:top-[105px] lg:left-[215px] w-[175px] h-[260px] md:w-[186.60px] md:h-[279.91px] lg:w-[300px] lg:h-[450px] transition-all duration-1000 ease-in-out ${
              animate ? "-translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          />
        </div>

      </div>
    </div>
  );
};

export default ClinaryInfoSection;
