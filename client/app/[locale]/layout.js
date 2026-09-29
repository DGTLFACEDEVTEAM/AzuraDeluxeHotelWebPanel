import {connection} from "next/server";
import {listDynamicPageNavigation} from "@/lib/azura-dynamic-pages-content";
import {DynamicPageLocaleProvider} from "@/DynamicPageLocaleContext";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Header from "./GeneralComponents/Header/Header";
import Footer from "./GeneralComponents/Footer/Footer";
import HeaderWhite from "./GeneralComponents/Header/HeaderWhite";
import BookNow from "./GeneralComponents/BookNow";
import CookiePopup from "./GeneralComponents/CookiePopup";
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import { getMessages, setRequestLocale } from 'next-intl/server' 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Azura Deluxe Hotel",
  description: "Azura Deluxe Hotel",

  icons: {
    icon: '/logowhite.png',      
    shortcut: '/logowhite.png',  
    apple: '/logowhite.png'     
  }

};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}


export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale)) {
    notFound();
  }

   // 1) Gelen locale bilgisini Next Intl’in store’una yazıyoruz
   setRequestLocale(locale)
  
    // 2) Ardından mesajları yükleyip client’a iletebiliriz
    const messages = await getMessages()
    await connection();
    const dynamicNavigation = await listDynamicPageNavigation(locale);

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
          <meta name="theme-color" content="#FBFBFBCC" />
          <NextIntlClientProvider locale={locale} messages={messages}>
        <DynamicPageLocaleProvider>
        <Header dynamicNavigation={dynamicNavigation} />
        <HeaderWhite dynamicNavigation={dynamicNavigation} />
       
        {children}
        <BookNow/>
        <CookiePopup/>
        <Footer />
        </DynamicPageLocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
