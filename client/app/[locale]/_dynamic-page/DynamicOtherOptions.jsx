"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { BiArea, BiGroup } from "react-icons/bi";
import { Link } from "@/i18n/navigation";
import { getLocalizedContent } from "@/lib/azura-pages/schema.mjs";

export default function DynamicOtherOptions({ section, locale, preview = false }) {
  const content = getLocalizedContent(section.translations, locale);
  const options = [...(section.options || [])].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0)
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: options.length > 1,
    align: "start",
    startIndex: 0,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const updateSelectedIndex = useCallback(() => {
    if (emblaApi) {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    emblaApi.on("select", updateSelectedIndex);
    emblaApi.on("reInit", updateSelectedIndex);
    updateSelectedIndex();

    return () => {
      emblaApi.off("select", updateSelectedIndex);
      emblaApi.off("reInit", updateSelectedIndex);
    };
  }, [emblaApi, updateSelectedIndex]);

  return (
    <section
      className={`flex h-auto max-w-[1440px] items-center justify-center ${
        preview ? "w-full" : "w-screen"
      }`}
    >
      <div
        className={`flex w-[87.79%] flex-col items-start justify-center gap-[30px] md:w-[91.4%] lg:w-[76.8%] lg:gap-[50px] ${
          preview ? "lg:min-w-0" : "lg:min-w-[960px]"
        }`}
      >
        <div className="flex w-full flex-col items-start justify-center gap-[15px] text-black md:gap-[25px] lg:gap-[35px]">
          {content.eyebrow ? (
            <span className="font-jost text-[12px] font-medium uppercase leading-[14px] tracking-[0.48px]">
              {content.eyebrow}
            </span>
          ) : null}
          {content.title ? (
            <h2 className="font-marcellus text-[28px] font-normal leading-[120%] md:text-[36px] lg:text-[48px] lg:leading-[57.6px]">
              {content.title}
            </h2>
          ) : null}
        </div>

        {options.length > 0 ? (
          <>
            <div className="w-full overflow-hidden" ref={emblaRef}>
              <div className="flex w-full items-start justify-start touch-pan-y">
                {options.map((option) => {
                  const optionContent = getLocalizedContent(
                    option.translations,
                    locale
                  );

                  return (
                    <article
                      key={option.id}
                      className="mr-[2.5%] min-w-0 flex-[0_0_85%] sm:flex-[0_0_75%] md:flex-[0_0_50%] lg:flex-[0_0_31%] xl:flex-[0_0_31.5%]"
                    >
                      <div className="flex w-full flex-col items-start justify-center gap-[15px] text-start font-jost text-black lg:gap-[20px]">
                        {option.image ? (
                          <Image
                            src={option.image}
                            alt={optionContent.imageAlt || ""}
                            width={800}
                            height={600}
                            sizes="(min-width: 1024px) 31vw, (min-width: 768px) 50vw, 85vw"
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-200 text-xs uppercase tracking-[0.15em] text-stone-500">
                            Görsel alanı
                          </div>
                        )}
                        {optionContent.eyebrow ? (
                          <span className="text-[12px] font-medium uppercase leading-[14px] tracking-[0.48px]">
                            {optionContent.eyebrow}
                          </span>
                        ) : null}
                        {optionContent.title ? (
                          <h3 className="font-marcellus text-[24px] font-normal leading-[120%] lg:text-[30px] lg:leading-[46.0059px]">
                            {optionContent.title}
                          </h3>
                        ) : null}
                        {optionContent.size || optionContent.capacity ? (
                          <div className="flex items-center justify-start gap-[20px] text-center">
                            {optionContent.size ? (
                              <div className="flex items-center justify-center gap-[10px]">
                                <BiArea size={18} aria-hidden="true" />
                                <p className="text-[14px] font-normal leading-normal text-lagoBrown lg:text-[16px]">
                                  {optionContent.size}
                                </p>
                              </div>
                            ) : null}
                            {optionContent.capacity ? (
                              <div className="flex items-center justify-center gap-[10px]">
                                <BiGroup size={19} aria-hidden="true" />
                                <p className="text-[14px] font-normal leading-normal text-lagoBrown lg:text-[16px]">
                                  {optionContent.capacity}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {optionContent.text ? (
                          <p className="line-clamp-4 w-[96%] whitespace-pre-line text-[12px] font-normal leading-[21px] md:w-full lg:text-[14px]">
                            {optionContent.text}
                          </p>
                        ) : null}
                        {content.buttonText && optionContent.buttonHref ? (
                          <Link
                            href={optionContent.buttonHref}
                            className="flex h-[41px] items-center justify-center border border-lagoBrown px-[40px] py-[20px] text-center text-[12px] font-medium uppercase leading-[30px] text-lagoBrown lg:text-[14px]"
                          >
                            {content.buttonText}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {options.length > 1 ? (
              <div className="relative flex w-full items-end justify-end md:mt-[20px] lg:hidden">
                {options.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={`${index + 1}. seçeneğe git`}
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={`h-[2px] flex-1 transition-all ${
                      selectedIndex === index ? "bg-[#24292C]" : "bg-[#848383]"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="w-full rounded-xl border border-dashed border-stone-300 bg-stone-100 p-8 text-center font-jost text-sm text-stone-500">
            Seçenekler henüz eklenmedi.
          </div>
        )}
      </div>
    </section>
  );
}
