import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getLocalizedContent } from "@/lib/azura-pages/schema.mjs";
import ContactSection2 from "../GeneralComponents/Contact/ContactSection2";
import DynamicCardCollection from "./DynamicCardCollection";
import DynamicPageCarousel from "./DynamicPageCarousel";
import DynamicTwoAnimationImage from "./DynamicTwoAnimationImage";
import DynamicOtherOptions from "./DynamicOtherOptions";
import DynamicSpaInfoSection from "./DynamicSpaInfoSection";
import {
  createSectionRendererRegistry,
  resolveSectionRenderer,
} from "@/lib/azura-pages/section-renderer-registry.mjs";

function isGif(src) {
  return String(src || "").toLowerCase().split("?")[0].endsWith(".gif");
}

function Eyebrow({ children }) {
  if (!children) {
    return null;
  }

  return (
    <span className="font-jost text-[12px] font-medium uppercase leading-[14px] tracking-[0.6px]">
      {children}
    </span>
  );
}

function HeroSection({ hero, locale, preview = false }) {
  const content = getLocalizedContent(hero?.translations, locale);

  return (
    <section
      className={`relative flex items-center justify-center overflow-hidden bg-stone-700 ${
        preview ? "min-h-[420px] w-full" : "min-h-[70vh] w-screen"
      }`}
    >
      {hero?.image ? (
        <Image
          src={hero.image}
          alt={content.imageAlt || ""}
          fill
          priority
          unoptimized={isGif(hero.image)}
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-700 via-stone-800 to-stone-950" />
      )}

      {hero?.overlay !== false ? <div className="absolute inset-0 bg-lagoBlack/35" /> : null}

      <div className="relative z-10 flex w-[85%] max-w-5xl flex-col items-center gap-[30px] text-center text-white lg:gap-[50px]">
        <Eyebrow>{content.eyebrow}</Eyebrow>
        <h1 className="font-jost text-[40px] font-medium capitalize leading-[120%] md:text-[56px] lg:text-[80px] lg:leading-[106px]">
          {content.title}
        </h1>
      </div>
    </section>
  );
}

function IntroSection({ section, locale }) {
  const content = getLocalizedContent(section.translations, locale);

  return (
    <section className="flex w-[88%] max-w-4xl flex-col items-center gap-5 text-center text-lagoBlack">
      <Eyebrow>{content.eyebrow}</Eyebrow>
      {content.title ? (
        <h2 className="font-marcellus text-[32px] leading-[120%] md:text-[42px] lg:text-[52px]">
          {content.title}
        </h2>
      ) : null}
      {content.text ? (
        <p className="whitespace-pre-line font-jost text-[15px] leading-7 text-stone-600 md:text-[17px]">
          {content.text}
        </p>
      ) : null}
    </section>
  );
}

function ImagePlaceholder() {
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-200 font-jost text-sm uppercase tracking-[0.2em] text-stone-500">
      Görsel alanı
    </div>
  );
}

function TwoAnimationImageSection({ section, locale, preview = false }) {
  const content = getLocalizedContent(section.translations, locale);

  return (
    <DynamicTwoAnimationImage
      backgroundImage={{
        src: section.backgroundImage,
        alt: content.backgroundImageAlt || "",
      }}
      foregroundImage={{
        src: section.foregroundImage,
        alt: content.foregroundImageAlt || "",
      }}
      content={content}
      preview={preview}
    />
  );
}

function SpaInfoSection({ section, locale, preview = false }) {
  return (
    <DynamicSpaInfoSection
      section={section}
      content={getLocalizedContent(section.translations, locale)}
      preview={preview}
    />
  );
}

function ImageTextSection({ section, locale }) {
  const content = getLocalizedContent(section.translations, locale);
  const imageFirst = section.imagePosition !== "right";

  const image = (
    <div className={`relative w-full overflow-hidden ${imageFirst ? "lg:order-1" : "lg:order-2"}`}>
      {section.image ? (
        <Image
          src={section.image}
          alt={content.imageAlt || ""}
          width={1200}
          height={900}
          unoptimized={isGif(section.image)}
          sizes="(min-width: 1024px) 50vw, 90vw"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <ImagePlaceholder />
      )}
    </div>
  );

  const text = (
    <div
      className={`flex w-full flex-col items-start justify-center gap-5 px-1 py-5 text-lagoBlack md:px-8 lg:px-14 ${
        imageFirst ? "lg:order-2" : "lg:order-1"
      }`}
    >
      <Eyebrow>{content.eyebrow}</Eyebrow>
      {content.title ? (
        <h2 className="font-marcellus text-[30px] leading-[120%] md:text-[40px] lg:text-[48px]">
          {content.title}
        </h2>
      ) : null}
      {content.text ? (
        <p className="whitespace-pre-line font-jost text-[15px] leading-7 text-stone-600 md:text-[16px]">
          {content.text}
        </p>
      ) : null}
      {content.buttonText && content.buttonHref ? (
        <Link
          href={content.buttonHref}
          className="font-marcellus text-[16px] uppercase leading-[30px] text-lagoBrown underline underline-offset-[6px]"
        >
          {content.buttonText}
        </Link>
      ) : null}
    </div>
  );

  return (
    <section className="grid w-[90%] max-w-[1400px] grid-cols-1 items-stretch overflow-hidden bg-white lg:grid-cols-2">
      {image}
      {text}
    </section>
  );
}

function GallerySection({ section, locale }) {
  const content = getLocalizedContent(section.translations, locale);
  const images = [...(section.images || [])].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0)
  );

  return (
    <section className="flex w-[90%] max-w-[1400px] flex-col gap-8 text-lagoBlack">
      <div className="flex max-w-4xl flex-col gap-4">
        <Eyebrow>{content.eyebrow}</Eyebrow>
        {content.title ? (
          <h2 className="font-marcellus text-[32px] leading-[120%] md:text-[42px] lg:text-[52px]">
            {content.title}
          </h2>
        ) : null}
        {content.text ? (
          <p className="whitespace-pre-line font-jost text-[15px] leading-7 text-stone-600 md:text-[17px]">
            {content.text}
          </p>
        ) : null}
      </div>

      {images.length > 0 ? (
        <div className="flex snap-x gap-4 overflow-x-auto pb-4">
          {images.map((image) => {
            const imageContent = getLocalizedContent(image.translations, locale);

            return (
              <div
                key={image.id}
                className="relative aspect-[4/3] min-w-[82%] snap-start overflow-hidden bg-stone-200 sm:min-w-[55%] lg:min-w-[31%]"
              >
                <Image
                  src={image.src}
                  alt={imageContent.imageAlt || ""}
                  fill
                  unoptimized={isGif(image.src)}
                  sizes="(min-width: 1024px) 31vw, (min-width: 640px) 55vw, 82vw"
                  className="object-cover"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-100 p-8 text-center font-jost text-sm text-stone-500">
          Galeri görselleri henüz eklenmedi.
        </div>
      )}
    </section>
  );
}

function CarouselSection({ section, locale }) {
  const content = getLocalizedContent(section.translations, locale);
  const images = [...(section.images || [])].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0)
  );

  return (
    <section className="flex w-[90%] max-w-[1400px] flex-col gap-8 text-lagoBlack">
      <div className="flex max-w-4xl flex-col gap-4">
        <Eyebrow>{content.eyebrow}</Eyebrow>
        {content.title ? (
          <h2 className="font-marcellus text-[32px] leading-[120%] md:text-[42px] lg:text-[52px]">
            {content.title}
          </h2>
        ) : null}
        {content.text ? (
          <p className="whitespace-pre-line font-jost text-[15px] leading-7 text-stone-600 md:text-[17px]">
            {content.text}
          </p>
        ) : null}
      </div>

      {images.length > 0 ? (
        <DynamicPageCarousel images={images} locale={locale} />
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-100 p-8 text-center font-jost text-sm text-stone-500">
          Carousel görselleri henüz eklenmedi.
        </div>
      )}
    </section>
  );
}

function CallToActionSection({ section, locale }) {
  const content = getLocalizedContent(section.translations, locale);

  return (
    <section className="relative flex min-h-[460px] w-[90%] max-w-[1400px] items-center justify-center overflow-hidden bg-stone-800 px-6 py-20 text-center text-white">
      {section.image ? (
        <Image
          src={section.image}
          alt={content.imageAlt || ""}
          fill
          unoptimized={isGif(section.image)}
          sizes="90vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-700 to-stone-950" />
      )}
      {section.overlay !== false ? <div className="absolute inset-0 bg-lagoBlack/45" /> : null}

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-5">
        <Eyebrow>{content.eyebrow}</Eyebrow>
        {content.title ? (
          <h2 className="font-marcellus text-[34px] leading-[120%] md:text-[46px] lg:text-[58px]">
            {content.title}
          </h2>
        ) : null}
        {content.text ? (
          <p className="whitespace-pre-line font-jost text-[15px] leading-7 text-white/85 md:text-[17px]">
            {content.text}
          </p>
        ) : null}
        {content.buttonText && content.buttonHref ? (
          <Link
            href={content.buttonHref}
            className="mt-2 border border-white px-7 py-3 font-jost text-sm font-medium uppercase tracking-wide text-white transition hover:bg-white hover:text-lagoBlack"
          >
            {content.buttonText}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function CardCollectionSection({ section, locale, displayMode }) {
  const content = getLocalizedContent(section.translations, locale);
  const cards = [...(section.cards || [])].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0)
  );

  return (
    <section className="flex w-[90%] max-w-[1400px] flex-col gap-8 text-lagoBlack">
      <div className="flex max-w-4xl flex-col gap-4">
        <Eyebrow>{content.eyebrow}</Eyebrow>
        {content.title ? (
          <h2 className="font-marcellus text-[32px] leading-[120%] md:text-[42px] lg:text-[52px]">
            {content.title}
          </h2>
        ) : null}
        {content.text ? (
          <p className="whitespace-pre-line font-jost text-[15px] leading-7 text-stone-600 md:text-[17px]">
            {content.text}
          </p>
        ) : null}
      </div>

      {cards.length > 0 ? (
        <DynamicCardCollection cards={cards} locale={locale} displayMode={displayMode} />
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-100 p-8 text-center font-jost text-sm text-stone-500">
          Kartlar henüz eklenmedi.
        </div>
      )}
    </section>
  );
}

function CardCollectionGridSection(props) {
  return <CardCollectionSection {...props} displayMode="grid" />;
}

function CardCollectionCarouselSection(props) {
  return <CardCollectionSection {...props} displayMode="carousel" />;
}

const SECTION_RENDERERS = createSectionRendererRegistry({
  intro: {
    centered: IntroSection,
  },
  imageText: {
    imageLeft: (props) => <ImageTextSection {...props} section={{...props.section, imagePosition: "left"}} />,
    imageRight: (props) => <ImageTextSection {...props} section={{...props.section, imagePosition: "right"}} />,
  },
  twoAnimationImage: {
    overlap: TwoAnimationImageSection,
  },
  spaInfo: {
    splitImages: SpaInfoSection,
  },
  otherOptions: {
    carousel: DynamicOtherOptions,
  },
  gallery: {
    horizontal: GallerySection,
  },
  carousel: {
    centered: CarouselSection,
  },
  callToAction: {
    image: CallToActionSection,
  },
  cardCollection: {
    grid: CardCollectionGridSection,
    carousel: CardCollectionCarouselSection,
  },
});

export default function StandardPageTemplate({ page, locale, preview = false }) {
  const enabledSections = (page.sections || []).filter((section) => section.enabled !== false);

  return (
    <main
      className={`flex flex-col items-center justify-center overflow-hidden bg-[#fbfbfb] ${
        preview
          ? "w-full gap-[60px] rounded-2xl border border-stone-200"
          : "gap-[60px] md:gap-[80px] lg:gap-[100px]"
      }`}
    >
      <HeroSection hero={page.hero} locale={locale} preview={preview} />

      {enabledSections.map((section) => {
        const resolvedRenderer = resolveSectionRenderer(SECTION_RENDERERS, section);

        if (!resolvedRenderer) {
          throw new Error("Unsupported dynamic page renderer");
        }

        const { Component: SectionComponent } = resolvedRenderer;

        return (
          <SectionComponent
            key={section.id}
            section={section}
            locale={locale}
            preview={preview}
          />
        );
      })}

      {!preview && page.showContactSection !== false ? <ContactSection2 /> : null}
    </main>
  );
}
