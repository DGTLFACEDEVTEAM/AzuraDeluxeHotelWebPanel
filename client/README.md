This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Azura homepage experience verisi

Canlı sunucuda iki **kalıcı, mutlak** dizin tanımlayın. `AZURA_CONTENT_ROOT` içerik JSON köküdür; dosya `${AZURA_CONTENT_ROOT}/site-pages/homepage.json` konumunda tutulur. `AZURA_UPLOADS_ROOT` görsel köküdür; bu alanın görselleri `${AZURA_UPLOADS_ROOT}/pages/homepage/` altında tutulur. Dizini deploy sırasında silinen proje klasörünün veya geçici konteyner dosya sisteminin içine koymayın. Uygulamayı çalıştıran kullanıcı JSON dizinine yazabilmeli, uploads dizinini okuyabilmelidir.

Production ortamında iki değişken zorunludur; tanımlı değilse uygulama proje içindeki seed dosyalarına sessizce düşmez. `AZURA_PANEL_SERVICE_TOKEN` da en az 32 karakterlik ayrı bir sır olmalıdır. Token yalnızca panel sunucusunda ve Azura sunucusunda saklanır; tarayıcı koduna verilmez. Development ortamında dizin değişkenleri yoksa proje içindeki `content/` ve `public/uploads/` kullanılır.

İlk kurulumda, production sunucusunda ortam değişkenleri tanımlı ve kalıcı dizinler bağlıyken `node scripts/seed-persistent-homepage.mjs` çalıştırın. Bu komut Azura seed JSON’unu ve iki Azura görselini **yalnızca hedef dosyalar yoksa** kopyalar; panelin daha önce kaydettiği dosyaları değiştirmez. Sonraki deploylarda aynı komutu tekrar çalıştırmak mevcut veriyi korur.

`GET /api/azura/homepage/experience` ve `PUT /api/azura/homepage/experience` yalnızca `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ile çalışır. PUT gövdesi `{ "experience": { "background": ..., "foreground": ... } }` biçimindedir; alanlar `content/site-pages/homepage.json` seed şemasındaki gibidir. Görsel dosyaları önce kalıcı uploads dizinine yerleştirilmelidir. Bu aşamada bir görsel yükleme API’si yoktur. `/uploads/...` URL’leri uygulama tarafından kalıcı uploads kökünden okunur. Anasayfa runtime’da JSON’u okur; başarılı PUT sonrası güncel veriyi gösterir.
