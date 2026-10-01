"use client";

import {useBlogLocale} from "@/BlogLocaleContext";
import {blogLocaleHref} from "@/lib/azura-blog-locale.mjs";
import React, { useState, useEffect, useTransition } from "react";
// ⭐️ next/navigation yerine navigation.ts’den alıyoruz:
import { redirect, usePathname } from "@/i18n/navigation";
import {usePathname as useActualPathname} from "next/navigation";
import {useDynamicPageLocale} from "@/DynamicPageLocaleContext";
import {dynamicLocaleHref} from "@/lib/azura-pages/routes.mjs";
import { IoMdArrowDropdown } from "react-icons/io";

export default function LocaleSwitcherSelect({ children, defaultValue, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // 🔑 burada internal rota anahtarını (ör: "/aboutus") alır
  const routeKey = usePathname();
  const blogPage = useBlogLocale();
  const dynamicPage = useDynamicPageLocale();
  const actualPathname = useActualPathname();

  useEffect(() => {
    const saved = sessionStorage.getItem("scrollPosition");
    if (saved) {
      window.scrollTo(0, Number(saved));
      sessionStorage.removeItem("scrollPosition");
    }
  }, [routeKey]);

  function handleLangChange(lang) {
    // scroll pozisyonunu sakla
    sessionStorage.setItem("scrollPosition", window.scrollY);
    setIsOpen(false);

    const blogHref = blogLocaleHref(blogPage, actualPathname, lang);
    if (blogHref) { window.location.assign(blogHref); return; }

    const dynamicHref = dynamicLocaleHref(dynamicPage, actualPathname, lang);
    if (dynamicHref) { window.location.assign(dynamicHref); return; }

    startTransition(() => {
      // Next-Intl’in redirect’i ile doğru URL’e (ör: "/de/uber-uns") yönlendirir
      redirect({ href: routeKey, locale: lang });
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-row items-center justify-center gap-2 rounded-md px-[10px] py-[10px] lg:py-4 font-medium mix-blend-difference bg-darkB uppercase w-full text-[16px]">
        {label}
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-0 rounded bg-irenicBlack shadow-lg left-0 w-full ">
          <ul className="py-0">
            {React.Children.map(children, (child) => {
              if (child.props.value === defaultValue) return null;
              return (
                <li
                  key={child.props.value}
                 className="cursor-pointer px-[6px] py-[8px] mt-0 hover:bg-white hover:text-lagoBlack text-center items-center justify-center"
                  onClick={() => handleLangChange(child.props.value)}
                >
                  {child.props.value}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
