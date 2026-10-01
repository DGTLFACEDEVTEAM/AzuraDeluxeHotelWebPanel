import {BlogLocaleBridge} from "@/BlogLocaleContext";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {getTranslations} from "next-intl/server";
import {resolvePublicBlogPost,selectBlogTranslation,selectBlogBlockTranslation,validBlogSlug} from "@/lib/azura-blog-content";
export const dynamic = "force-dynamic";

function splitParagraphs(content = "") {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!validBlogSlug(slug)) notFound();
  const result = await resolvePublicBlogPost(slug, locale);
  const post = result?.published;

  if (!post) {
    return {};
  }

  const {translation} = selectBlogTranslation(post, locale);

  return {
    title: translation.seoTitle || translation.title,
    description: translation.seoDescription || translation.excerpt,
    ...(post.slugs ? {alternates:{canonical:result.href,languages:Object.fromEntries(Object.entries(post.slugs).map(([language,address])=>[language,`/${language}/news/${address}`]))}} : {}),
  };
}

export default async function NewsDetailPage({ params }) {
  const { locale, slug } = await params;
  if (!validBlogSlug(slug)) notFound();
  const result = await resolvePublicBlogPost(slug, locale);
  const post = result?.published;

  if (!post) {
    notFound();
  }

  if (result.redirect) permanentRedirect(result.href);
  const {translation, locale: contentLocale} = selectBlogTranslation(post, locale);
  const t = await getTranslations({locale,namespace:"BlogNews"});
  const paragraphs = splitParagraphs(translation.content);
  const contentBlocks = post.contentBlocks || [];

  return (
    <div className="bg-[#fbfbfb] pb-20">
      {post.slugs ? <BlogLocaleBridge slugs={post.slugs} /> : null}
      <article className="mx-auto max-w-[1100px] px-4 pt-32 md:px-8">
        <Link
          href="/news"
          className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-900 hover:text-white"
        >
          {t("all")}
        </Link>

        <div className="mt-8 overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm">
          {post.coverImage ? <div className="relative h-[320px] w-full md:h-[520px]">
            <Image
              src={post.coverImage}
              alt={translation.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div> : null}

          <div className="space-y-6 p-6 md:p-10">
            <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
              {new Date(post.publishedAt).toLocaleDateString(locale)}
            </div>
            <h1 className="text-4xl font-medium leading-tight text-stone-900 md:text-5xl">
              {translation.title}
            </h1>
            <p className="text-lg leading-8 text-stone-600">{translation.excerpt}</p>

            <div className="h-px w-full bg-stone-200" />

            <div className="space-y-5 text-base leading-8 text-stone-700">
              {paragraphs.map((paragraph, index) => (
                <p key={`${post.slug}-${index}`}>{paragraph}</p>
              ))}
            </div>

            {contentBlocks.map((block) => {
              const blockTranslation = selectBlogBlockTranslation(block, contentLocale);
              const blockParagraphs = splitParagraphs(blockTranslation.content);
              const HeadingTag = block.headingLevel === "h3" ? "h3" : "h2";

              if (!blockTranslation.heading && blockParagraphs.length === 0 && !block.image) {
                return null;
              }

              return (
                <section
                  key={block.id}
                  className="space-y-5 border-t border-stone-200 pt-8 md:pt-10"
                >
                  {blockTranslation.heading ? (
                    <HeadingTag
                      className={
                        block.headingLevel === "h3"
                          ? "text-2xl font-medium leading-tight text-stone-900 md:text-3xl"
                          : "text-3xl font-medium leading-tight text-stone-900 md:text-4xl"
                      }
                    >
                      {blockTranslation.heading}
                    </HeadingTag>
                  ) : null}

                  {block.image ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[24px] bg-stone-100">
                      <Image
                        src={block.image}
                        alt={blockTranslation.heading || translation.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 960px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : null}

                  {blockParagraphs.length > 0 ? (
                    <div className="space-y-5 text-base leading-8 text-stone-700">
                      {blockParagraphs.map((paragraph, paragraphIndex) => (
                        <p key={`${block.id}-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </article>
    </div>
  );
}
