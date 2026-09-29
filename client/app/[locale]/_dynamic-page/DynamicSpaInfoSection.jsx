import Image from "next/image";

function isGif(src) {
  return String(src || "").toLowerCase().split("?")[0].endsWith(".gif");
}

function ImagePlaceholder({ label }) {
  return (
    <div className="flex min-h-[280px] w-full items-center justify-center bg-stone-200 px-6 text-center font-jost text-xs uppercase tracking-[0.18em] text-stone-500">
      {label}
    </div>
  );
}

function OverlayContent({ eyebrow, title, text, items = [], position = "bottom" }) {
  if (!eyebrow && !title && !text && items.length === 0) return null;

  return (
    <div
      className={`absolute inset-x-0 z-10 flex flex-col gap-2 px-6 text-white md:px-8 ${
        position === "top" ? "top-7" : "bottom-7"
      }`}
    >
      {eyebrow ? (
        <span className="font-jost text-[12px] uppercase leading-[14px] tracking-[0.48px]">
          {eyebrow}
        </span>
      ) : null}
      {title ? (
        <h3 className="font-marcellus text-[25px] font-normal leading-tight lg:text-[30px]">
          {title}
        </h3>
      ) : null}
      {text ? (
        <p className="whitespace-pre-line font-jost text-[12px] leading-[21px] lg:text-[14px]">
          {text}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 font-jost text-[13px] leading-[20px] marker:text-xs">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function DynamicSpaInfoSection({ section, content, preview = false }) {
  const listItems = String(content.rightItems || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <section
      className={`flex h-auto max-w-[1440px] items-end justify-center ${
        preview ? "w-full" : "w-screen"
      }`}
    >
      <div className="flex w-[87.79%] flex-col items-end justify-center gap-[25px] md:w-[91.4%] md:flex-row md:gap-[2%] lg:w-[76.8%]">
        <div className="flex w-full flex-col items-start justify-center gap-[30px] md:w-[53%] lg:gap-[50px]">
          <div className="flex w-full flex-col items-start justify-center gap-[15px] text-start font-jost text-black md:gap-[25px] lg:gap-[35px]">
            {content.eyebrow ? (
              <span className="text-[12px] font-medium uppercase leading-[14px] tracking-[0.48px]">
                {content.eyebrow}
              </span>
            ) : null}
            {content.title ? (
              <h2 className="font-marcellus text-[28px] font-normal leading-[120%] md:text-[32px] lg:text-[48px] lg:leading-[57.6px]">
                {content.title}
              </h2>
            ) : null}
            {content.text ? (
              <p className="whitespace-pre-line text-[14px] font-normal leading-[18px] lg:text-[16px] lg:leading-[24px]">
                {content.text}
              </p>
            ) : null}
          </div>

          <div className="relative flex w-full overflow-hidden bg-stone-200">
            {section.leftImage ? (
              <Image
                src={section.leftImage}
                width={1200}
                height={900}
                alt={content.leftImageAlt || ""}
                unoptimized={isGif(section.leftImage)}
                sizes="(min-width: 768px) 50vw, 88vw"
                className="min-h-[280px] w-full object-cover"
              />
            ) : (
              <ImagePlaceholder label="Sol görsel alanı" />
            )}
            {section.leftImage ? <div className="absolute inset-0 bg-black/25" /> : null}
            <OverlayContent
              eyebrow={content.leftEyebrow}
              title={content.leftTitle}
              text={content.leftText}
            />
          </div>
        </div>

        <div className="relative w-full overflow-hidden bg-stone-200 md:w-[45%]">
          {section.rightImage ? (
            <Image
              src={section.rightImage}
              width={1200}
              height={1500}
              alt={content.rightImageAlt || ""}
              unoptimized={isGif(section.rightImage)}
              sizes="(min-width: 768px) 42vw, 88vw"
              className="min-h-[420px] w-full object-cover"
            />
          ) : (
            <ImagePlaceholder label="Sağ görsel alanı" />
          )}
          {section.rightImage ? <div className="absolute inset-0 bg-black/25" /> : null}
          <OverlayContent
            eyebrow={content.rightEyebrow}
            title={content.rightTitle}
            text={content.rightText}
            items={listItems}
            position="top"
          />
        </div>
      </div>
    </section>
  );
}
