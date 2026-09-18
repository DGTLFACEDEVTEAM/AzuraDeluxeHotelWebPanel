"use client";
import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";

const ClinaryReverseInfo = ({img1,img2,span,header,text1,text2}) => {
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
    <div ref={sectionRef} className="flex w-screen lg:h-[555px] items-center justify-center max-w-[1440px]">
      <div className="flex flex-col md:flex-row-reverse w-[87.79%] md:w-[91.4%] lg:w-[76.8%] items-center justify-center gap-[30px] md:gap-[36.83px] lg:gap-[52px] h-full">

        <div className="flex flex-col w-[100%] md:w-[48.5%] items-start justify-center text-start gap-[15px] md:gap-[25px] lg:gap-[35.07px] text-black font-jost">
          <span className="text-[12.002px] font-medium leading-[14.026px] tracking-[0.481px] uppercase">
        {span}
          </span>
          <h2 className="text-[28px] md:text-[32px] lg:text-[48.089px] font-normal font-marcellus leading-[120%] lg:leading-[57.707px] lg:capsizedText2">
          {header}
          </h2>
          <p className="text-[14px] lg:text-[16.03px] font-normal leading-[18.126px] lg:leading-[24.045px] leading-trim-both text-edge-cap lg:capsizedText4">
         {text1}
          </p>
          <p className="text-[14px] lg:text-[16.03px] font-normal leading-[18.126px] lg:leading-[24.045px] leading-trim-both text-edge-cap lg:capsizedText4">
          {text2}
          </p>
          
        </div>

        <div className="flex w-[65%] sm:w-[50%] min-w-[310px] md:w-[48.8%] items-end justify-end md:items-end md:justify-end relative h-auto mt-[67px]">
          <Image style={{ objectFit: "cover" }} layout="cover" src={img2} alt={img2.alt ?? "art"} width={img2.width} height={img2.height} className={`absolute bottom-[60px] right-[125px] md:bottom-[70px] md:right-[135px] lg:bottom-[105px] lg:right-[215px] z-10 w-[175px] h-[260px] md:w-[186.60px] md:h-[279.91px] lg:w-[300px] lg:h-[450px] transition-all duration-1000 ease-in-out ${
              animate ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0"
            }`}/>
            <Image  style={{ objectFit: "cover" }} src={img1} alt={img1.alt ?? "art"} width={img1.width} height={img1.height} className={`z-50 w-[175px] h-[260px] md:w-[186.60px] md:h-[279.91px] lg:w-[300px] lg:h-[450px] transition-all duration-1000 ease-in-out ${
              animate ? "-translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}/>
        </div>

      </div>
    </div>
  );
};

export default ClinaryReverseInfo;
