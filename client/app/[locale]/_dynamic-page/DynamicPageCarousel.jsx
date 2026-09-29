"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { getLocalizedContent } from "@/lib/azura-pages/schema.mjs";

function isGif(src) {
  return String(src || "").toLowerCase().split("?")[0].endsWith(".gif");
}

const controlLabels = {
  tr: { previous: "Önceki görsel", next: "Sonraki görsel", goTo: "Görsele git" },
  en: { previous: "Previous image", next: "Next image", goTo: "Go to image" },
  de: { previous: "Vorheriges Bild", next: "Nächstes Bild", goTo: "Zum Bild" },
  ru: { previous: "Предыдущее изображение", next: "Следующее изображение", goTo: "К изображению" },
};

export default function DynamicPageCarousel({ images, locale }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: images.length > 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const labels = controlLabels[locale] || controlLabels.tr;

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
    <div className="w-full">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {images.map((image) => {
            const imageContent = getLocalizedContent(image.translations, locale);

            return (
              <div
                key={image.id}
                className="min-w-0 flex-[0_0_88%] px-1.5 sm:flex-[0_0_72%] md:px-2 lg:flex-[0_0_58%]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-200">
                  <Image
                    src={image.src}
                    alt={imageContent.imageAlt || ""}
                    fill
                    unoptimized={isGif(image.src)}
                    sizes="(min-width: 1024px) 58vw, (min-width: 640px) 72vw, 88vw"
                    className="object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {images.length > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              aria-label={labels.previous}
              className="flex h-11 w-11 items-center justify-center border border-lagoBrown font-jost text-xl text-lagoBrown transition hover:bg-lagoBrown hover:text-white"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              aria-label={labels.next}
              className="flex h-11 w-11 items-center justify-center border border-lagoBrown font-jost text-xl text-lagoBrown transition hover:bg-lagoBrown hover:text-white"
            >
              →
            </button>
          </div>

          <div className="flex flex-1 justify-end gap-1.5">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
                aria-label={`${labels.goTo} ${index + 1}`}
                aria-current={selectedIndex === index ? "true" : undefined}
                className={`h-1.5 max-w-14 flex-1 transition ${
                  selectedIndex === index ? "bg-lagoBrown" : "bg-stone-300"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
