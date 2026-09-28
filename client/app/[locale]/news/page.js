import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {listPublishedBlogPosts,selectBlogTranslation} from '@/lib/azura-blog-content';
export const dynamic = 'force-dynamic';
import React from 'react'
import MainBanner2 from '../GeneralComponents/MainBanner2'
import imgBanner from "../about/images/gal_son.jpg"
import { Link } from "@/i18n/navigation";
import ContactSection2 from '../GeneralComponents/Contact/ContactSection2';

const page = async ({params}) => {
  const {locale} = await params;
  const t = await getTranslations({locale,namespace:'BlogNews'});
  const posts = await listPublishedBlogPosts();
  return (
    <div className='flex flex-col items-center justify-center gap-[100px] bg-[#fbfbfb]'>
       <MainBanner2 img={imgBanner} header="News" span=""/>

       <section className="w-full max-w-[1240px] px-4 md:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
            Azura Journal {t("subtitle")}
          </p>
          <h1 className="mt-3 text-4xl font-medium text-stone-900">
            {t("title")}
          </h1>

        </div>

        {posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => {
              const translation = selectBlogTranslation(post, locale).translation;

              return (
                <article
                  key={post.slug}
                  className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm"
                >
                  <Link
                    href={{ pathname: "/news/[slug]", params: { slug: post.slug } }}
                    className="block"
                  >
                    <div className="relative h-64 w-full overflow-hidden">
                      <Image
                        src={post.coverImage || imgBanner}
                        alt={translation.title}
                        fill
                        className="object-cover transition duration-500 hover:scale-105"
                        unoptimized={typeof post.coverImage === "string"}
                      />
                    </div>
                  </Link>

                  <div className="space-y-4 p-6">
                    <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
                      {new Date(post.publishedAt).toLocaleDateString(locale)}
                    </div>
                    <h2 className="text-2xl font-medium text-stone-900">
                      <Link
                        href={{ pathname: "/news/[slug]", params: { slug: post.slug } }}
                      >
                        {translation.title}
                      </Link>
                    </h2>
                    <p className="line-clamp-4 text-sm leading-7 text-stone-600">
                      {translation.excerpt}
                    </p>
                    <Link
                      href={{ pathname: "/news/[slug]", params: { slug: post.slug } }}
                      className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-900 hover:text-white"
                    >
                     {t("readMore")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-stone-200 bg-white px-6 py-10 text-sm text-stone-500">
           {t("empty")}
          </div>
        )}
      </section>

      <ContactSection2/>
    </div>
  )
}

export default page
