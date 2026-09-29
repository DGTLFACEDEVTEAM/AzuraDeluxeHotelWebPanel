"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export default function DynamicTwoAnimationImage({
  foregroundImage,
  backgroundImage,
  content,
  preview = false,
}) {
  const [animate, setAnimate] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`flex h-auto max-w-[1440px] items-center justify-center md:h-[400px] lg:h-[555px] ${
        preview ? "w-full" : "w-screen"
      }`}
    >
      <div className="flex h-full w-[87.79%] flex-col items-center justify-center gap-[30px] md:w-[91.4%] md:flex-row-reverse md:gap-[42px] lg:w-[76.8%] lg:gap-[52px]">
        <div className="flex w-[96%] flex-col items-center justify-center gap-[15px] text-center font-jost text-black md:w-[55%] md:items-start md:gap-[25px] md:text-start lg:w-[56.5%]">
          {content.eyebrow ? (
            <span className="text-[12px] font-medium uppercase leading-[14.026px] tracking-[0.481px]">
              {content.eyebrow}
            </span>
          ) : null}
          {content.title ? (
            <h2 className="font-marcellus text-[28px] font-normal leading-normal md:text-[32px] lg:text-[48.089px] lg:leading-[57.707px]">
              {content.title}
            </h2>
          ) : null}
          {content.text ? (
            <p className="whitespace-pre-line text-[14px] font-normal leading-[130%] md:text-[13.943px] lg:text-[16.03px] lg:leading-[24.045px]">
              {content.text}
            </p>
          ) : null}
          {content.text2 ? (
            <p className="whitespace-pre-line text-[14px] font-normal leading-[130%] md:text-[13.943px] lg:text-[16.03px] lg:leading-[24.045px]">
              {content.text2}
            </p>
          ) : null}
          {content.buttonText && content.buttonHref ? (
            <Link
              href={content.buttonHref}
              className="flex h-[38px] items-center justify-center border border-lagoBrown px-[32px] py-[16px] text-center text-[14px] font-medium uppercase leading-[30px] text-lagoBrown shadow-buttonCustom hover:bg-lagoBrown hover:text-white hover:underline md:h-[37.88px] md:leading-[29.878px] lg:h-[41px] lg:text-[16px]"
            >
              {content.buttonText}
            </Link>
          ) : null}
        </div>

        <div className="relative mt-[67px] flex h-[327px] min-w-[310px] w-[65%] items-end justify-end md:mt-0 md:h-full md:w-[50%] lg:w-[43.8%]">
          {backgroundImage?.src ? (
            <Image
              src={backgroundImage.src}
              alt={backgroundImage.alt || ""}
              width={300}
              height={450}
              className={`absolute bottom-[100px] right-[140px] z-10 h-[260px] w-[175px] object-cover transition-all duration-1000 ease-in-out md:bottom-[110px] md:right-[104px] md:h-[279.91px] md:w-[186.60px] lg:bottom-[105px] lg:right-[215px] lg:h-[450px] lg:w-[300px] ${
                animate ? "-translate-y-3 opacity-100" : "-translate-y-8 opacity-0"
              }`}
            />
          ) : null}
          {foregroundImage?.src ? (
            <Image
              src={foregroundImage.src}
              alt={foregroundImage.alt || ""}
              width={300}
              height={450}
              className={`z-50 h-[260px] w-[175px] object-cover transition-all duration-1000 ease-in-out md:h-[279.91px] md:w-[186.60px] lg:h-[450px] lg:w-[300px] ${
                animate ? "-translate-y-4 opacity-100" : "translate-y-4 opacity-0"
              }`}
            />
          ) : (
            <div className="z-50 flex h-[260px] w-[175px] items-center justify-center bg-stone-200 font-jost text-xs uppercase tracking-[0.15em] text-stone-500 md:h-[279.91px] md:w-[186.60px] lg:h-[450px] lg:w-[300px]">
              Görsel alanı
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
