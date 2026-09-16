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

Canlı sunucuda iki **kalıcı, mutlak** dizin tanımlayın. `AZURA_CONTENT_ROOT` içerik JSON köküdür; dosya `${AZURA_CONTENT_ROOT}/site-pages/homepage.json` konumunda tutulur. `AZURA_UPLOADS_ROOT` görsel köküdür; bu alanın görselleri `${AZURA_UPLOADS_ROOT}/pages/homepage/` altında tutulur. Dizini deploy sırasında silinen proje klasörünün veya geçici konteyner dosya sisteminin içine koymayın. Uygulamayı çalıştıran kullanıcı JSON ve homepage uploads dizinlerine yazabilmeli ve bu dosyaları okuyabilmelidir.

Production ortamında iki değişken zorunludur; tanımlı değilse uygulama proje içindeki seed dosyalarına sessizce düşmez. `AZURA_PANEL_SERVICE_TOKEN` da en az 32 karakterlik ayrı bir sır olmalıdır. Token yalnızca panel sunucusunda ve Azura sunucusunda saklanır; tarayıcı koduna verilmez. Development ortamında dizin değişkenleri yoksa proje içindeki `content/` ve `public/uploads/` kullanılır.

İlk kurulumda, production sunucusunda ortam değişkenleri tanımlı ve kalıcı dizinler bağlıyken `node scripts/seed-persistent-homepage.mjs` çalıştırın. Bu komut Azura seed JSON’unu ve iki Azura görselini **yalnızca hedef dosyalar yoksa** kopyalar; panelin daha önce kaydettiği dosyaları değiştirmez. Sonraki deploylarda aynı komutu tekrar çalıştırmak mevcut veriyi korur.

`GET /api/azura/homepage/experience` ve `PUT /api/azura/homepage/experience` yalnızca `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ile çalışır. GET `{ "experience": { ... }, "revision": "<64 karakterlik SHA-256>" }` döner. PUT gövdesi `{ "experience": { "background": ..., "foreground": ... } }` biçimindedir; alanlar `content/site-pages/homepage.json` seed şemasındaki gibidir. PUT isteği ayrıca GET’ten alınan revision değerini çift tırnakla `If-Match: "<revision>"` başlığında göndermelidir. Başarılı yanıt güncellenmiş `experience` ile onun yeni `revision` değerini döner. `/uploads/...` URL’leri uygulama tarafından kalıcı uploads kökünden okunur. Anasayfa runtime’da JSON’u okur; başarılı PUT sonrası güncel veriyi gösterir.

Yalnızca homepage experience görselleri için `GET /api/azura/homepage/experience/images` bir `{ "images": [...] }` listesi döner; `POST` aynı adrese tek `file` alanlı `multipart/form-data` gönderir ve yeni görseli 201 ile döner. Her iki yöntem aynı Bearer servis tokenını ister. JPEG, PNG ve WebP kabul edilir; dosya en fazla 8 MiB ve görsel en fazla 16 milyon piksel olabilir. Sunucu dosya adını üretir ve `{ "image": "/uploads/pages/homepage/...", "mimeType": "...", "size": ..., "width": ..., "height": ... }` döner. Yükleme homepage JSON’unu değiştirmez; görseli seçmek için dönen `image` yolunu mevcut experience PUT gövdesinin `background.image` veya `foreground.image` alanına yerleştirin. Alt metinlerin dört dilde gönderilmesi yine zorunludur.

Animasyonlu tanıtım metinleri JSON’daki ayrı `experienceText` alanındadır. `GET /api/azura/homepage/experience/text` yalnızca servis tokenıyla `{ "experienceText": { "tr": {...}, "en": {...}, "de": {...}, "ru": {...} }, "revision": "<64 karakterlik SHA-256>" }` döner. Aynı adrese `PUT` ile aynı gövde ve GET’ten alınan `If-Match: "<revision>"` başlığı gönderilir; her dilde yalnızca `subtitle`, `title`, `text1`, `text2`, `buttonText` zorunludur. Başarılı yanıt güncellenmiş `experienceText` ile yeni `revision` değerini içerir. Boş değerler, kontrol karakterleri, ek/eksik alanlar ve alan sınırını aşan değerler 400 döner. Alan sınırları sırasıyla 200, 250, 2000, 2000 ve 120 karakterdir. Metin PUT’u görselleri ve JSON’daki diğer alanları korur; dört dilin anasayfasını yeniden doğrular. Eski kalıcı homepage JSON’larında `experienceText` yoksa `node scripts/seed-persistent-homepage.mjs` komutunu uygulama başlamadan önce yeniden çalıştırın; mevcut görselleri ve panel metinlerini değiştirmeden alanı Azura başlangıç değerleriyle ekler.

İki PUT endpoint’inde `If-Match` yoksa 428, başlık biçimi geçersizse 400, ilgili alan GET’ten sonra başka bir kayıtla değişmişse 409 döner. 409 yanıtında dosya değiştirilmez; panel yeni içeriği ve revision değerini almak için tekrar GET yapmalıdır. Görsel ve metin revision değerleri birbirinden bağımsızdır: yalnızca metni değiştirmek görsel revision’ını, yalnızca görseli değiştirmek metin revision’ını değiştirmez. Revision değerleri `homepage.json` içine yazılmaz. Process içindeki tüm homepage read-modify-write kayıtları ortak kuyruğa alınır; bu nedenle paralel görsel ve metin kayıtları birbirini ezmeden korunur.
