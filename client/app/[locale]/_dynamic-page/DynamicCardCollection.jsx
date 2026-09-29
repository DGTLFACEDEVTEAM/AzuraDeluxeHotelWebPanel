"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@/i18n/navigation";
import { getLocalizedContent } from "@/lib/azura-pages/schema.mjs";

function isGif(src) {
  return String(src || "").toLowerCase().split("?")[0].endsWith(".gif");
}

const CONTROL_LABELS = {
  tr: { previous: "Önceki kart", next: "Sonraki kart", goTo: "Karta git" },
  en: { previous: "Previous card", next: "Next card", goTo: "Go to card" },
  de: { previous: "Vorherige Karte", next: "Nächste Karte", goTo: "Zur Karte" },
  ru: { previous: "Предыдущая карточка", next: "Следующая карточка", goTo: "К карточке" },
};

function ContentCard({ card, locale }) {
  const content = getLocalizedContent(card.translations, locale);

  return (
    <article className="flex h-full flex-col overflow-hidden border border-stone-200 bg-white">
      {card.image ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
          <Image
            src={card.image}
            alt={content.imageAlt || ""}
            fill
            unoptimized={isGif(card.image)}
            sizes="(min-width: 1024px) 31vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover transition duration-500 hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-stone-200 font-jost text-xs uppercase tracking-[0.2em] text-stone-500">
          Görsel alanı
        </div>
      )}

      <div className="flex flex-1 flex-col items-start gap-4 p-6 text-lagoBlack">
        {content.title ? (
          <h3 className="font-marcellus text-[26px] leading-[125%]">{content.title}</h3>
        ) : null}
        {content.text ? (
          <p className="whitespace-pre-line font-jost text-[15px] leading-7 text-stone-600">
            {content.text}
          </p>
        ) : null}
        {content.buttonText && content.buttonHref ? (
          <Link
            href={content.buttonHref}
            className="mt-auto pt-2 font-marcellus text-[15px] uppercase leading-7 text-lagoBrown underline underline-offset-[6px]"
          >
            {content.buttonText}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function DynamicCardCollection({ cards, locale, displayMode }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: cards.length > 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const labels = CONTROL_LABELS[locale] || CONTROL_LABELS.tr;

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

  if (displayMode === "grid") {
    return (
      <div className="grid w-full gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <ContentCard key={card.id} card={card} locale={locale} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {cards.map((card) => (
            <div
              key={card.id}
              className="min-w-0 flex-[0_0_88%] px-1.5 sm:flex-[0_0_58%] md:px-2 lg:flex-[0_0_34%]"
            >
              <ContentCard card={card} locale={locale} />
            </div>
          ))}
        </div>
      </div>

      {cards.length > 1 ? (
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
            {cards.map((card, index) => (
              <button
                key={card.id}
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
