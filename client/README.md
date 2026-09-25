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

Experience ve experienceText PUT endpoint’lerinde `If-Match` yoksa 428, başlık biçimi geçersizse 400, ilgili alan GET’ten sonra başka bir kayıtla değişmişse 409 döner. 409 yanıtında dosya değiştirilmez; panel yeni içeriği ve revision değerini almak için tekrar GET yapmalıdır. Görsel ve metin revision değerleri birbirinden bağımsızdır: yalnızca metni değiştirmek görsel revision’ını, yalnızca görseli değiştirmek metin revision’ını değiştirmez. Revision değerleri `homepage.json` içine yazılmaz. Process içindeki tüm homepage read-modify-write kayıtları ortak kuyruğa alınır; bu nedenle paralel görsel ve metin kayıtları birbirini ezmeden korunur.

Karşılama bölümünün dört dildeki `subtitle`, `title`, `text` ve `buttonText` alanları ayrı `welcomeText` verisindedir. `GET /api/azura/homepage/welcome/text`, `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ile `{ "welcomeText": { "tr": { "subtitle": "...", "title": "...", "text": "...", "buttonText": "..." }, "en": { ... }, "de": { ... }, "ru": { ... } }, "revision": "<64 karakterlik SHA-256>" }` döner. Aynı adrese `PUT`, yalnızca `{ "welcomeText": { ... } }` JSON gövdesi ve `If-Match: "<GET yanıtındaki revision>"` başlığıyla gönderilir; başarı yanıtı güncel `welcomeText` ve yeni `revision` değeridir. Dört dilin ve her dilde yalnızca bu dört alanın bulunması zorunludur. Boş/kontrol karakterli veya çok uzun değerler 400 döner; sınırlar sırasıyla 200, 250, 2000 ve 120 karakterdir. Servis tokenı geçersizse 401, `If-Match` eksikse 428, biçimi bozuksa 400, revision eskiyse dosyayı değiştirmeden 409 döner. Karşılama revision’ı `experience` ve `experienceText` revision’larından bağımsızdır. Başarılı kayıt sonrası dört dilin anasayfası yeniden doğrulanır. Eski kalıcı JSON’da `welcomeText` yoksa `node scripts/seed-persistent-homepage.mjs` komutu mevcut alanları koruyarak Azura başlangıç metinlerini ekler.

## İzin listeli anasayfa bölümleri

`GET /api/azura/homepage/sections/essentials` yalnızca `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ile çalışır ve `{ "section": { "tr": { ... }, "en": { ... }, "de": { ... }, "ru": { ... } }, "revision": "<64 karakterlik SHA-256>" }` döner. `section` içindeki her dilde tam olarak `subtitle`, `title`, `title1`–`title6`, `text1`–`text6` ve `buttonText` bulunmalıdır. `PUT /api/azura/homepage/sections/essentials` aynı Bearer tokenı, `Content-Type: application/json`, `If-Match: "<GET yanıtındaki revision>"` başlığı ve yalnızca `{ "section": { "tr": { ... }, "en": { ... }, "de": { ... }, "ru": { ... } } }` gövdesi ister. Başarılı PUT güncel `{ "section": { ... }, "revision": "<yeni SHA-256>" }` yanıtını döner. `subtitle` için 200, `title` ve numaralı başlıklar için 250, numaralı metinler için 2000, `buttonText` için 120 karakter sınırı vardır; boş değerler, kontrol karakterleri, eksik/ek alanlar reddedilir. Eksik/geçersiz token 401, eksik `If-Match` 428, bozuk başlık veya veri 400, eski revision 409, izin listesinde olmayan bölüm anahtarı 404 döner. 409 dosyayı değiştirmez. Başarılı kayıttan sonra dört dilin anasayfası yeniden doğrulanır.

Kalıcı veri `homepage.json` içinde `sections.essentials` alanında tutulur. Sürüm yalnızca bu bölümün doğrulanmış içeriğinden hesaplanır ve dosyaya yazılmaz. Bölüm kaydı mevcut homepage yazma kuyruğunda yeniden okuma, revision kontrolü ve atomik yazma kullanır; diğer alanları korur. Şu anda izin listesinde `essentials`, `carousel` ve `accommodation` vardır. Yeni bir bölüm açmak için depolamadaki bölüm alan şemasına anahtarı açıkça eklemek, başlangıç verisini ve bileşen bağlantısını hazırlamak gerekir. Eski kalıcı JSON için `node scripts/seed-persistent-homepage.mjs`, `sections.essentials` eksikse Azura başlangıç metinlerini ekler; mevcut alanları ve kaydedilmiş essentials verisini değiştirmez.

## Keşif kaydırıcısı

Kaydırıcı `homepage.json` içindeki `sections.carousel.slides` dizisini kullanır. Tam olarak beş kart bu sırayla bulunmalıdır: `accommodation`, `restaurants`, `beachPools`, `experiences`, `kids`. Her kartın veri biçimi `{ "key": "accommodation", "image": "/uploads/pages/homepage/carousel-accommodation.jpg", "translations": { "tr": { "title": "...", "alt": "..." }, "en": { "title": "...", "alt": "..." }, "de": { "title": "...", "alt": "..." }, "ru": { "title": "...", "alt": "..." } } }` şeklindedir. `title` en çok 200, `alt` en çok 300 karakterdir; dört dilde boş değerler, kontrol karakterleri ve ek/eksik alanlar reddedilir. Kart sırası ve anahtarları sabittir. Bağlantılar JSON veya API üzerinden düzenlenmez; uygulama anahtara göre sırasıyla `/rooms`, `/restaurants`, `/beachpools`, `/entertainment`, `/kidsclub` kullanır.

`GET /api/azura/homepage/sections/carousel`, Bearer servis tokenıyla `{ "section": { "slides": [...] }, "revision": "<64 karakterlik SHA-256>" }` döner. `PUT` aynı adrese `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>`, `Content-Type: application/json` ve `If-Match: "<GET revision>"` başlıklarıyla yalnızca `{ "section": { "slides": [...] } }` gövdesini kabul eder. Başarılı yanıt güncel `{ "section": { "slides": [...] }, "revision": "<yeni SHA-256>" }` biçimindedir. Eksik `If-Match` 428, bozuk başlık veya veri 400, eski revision 409 döner. Görsel yolu `/uploads/pages/homepage/...` biçiminde olmalı ve dosya kalıcı uploads kökünde gerçekten bulunmalıdır; olmayan, dizin dışına çıkan, sahte veya bozuk görsel kaydı reddedilir. `carousel` revision’ı `essentials` ve diğer alanlardan bağımsızdır. Başarılı PUT dört dilin anasayfasını yeniden doğrular.

`GET/POST /api/azura/homepage/images`, var olan güvenli homepage görsel listeleme ve yükleme kodunu kullanır; `GET/POST /api/azura/homepage/experience/images` aynı sözleşmeyle çalışmaya devam eder. İki adres de Bearer servis tokenı ister. POST tek `file` alanlı `multipart/form-data` alır; yanıt `{ "image": "/uploads/pages/homepage/...", "mimeType": "...", "size": 123, "width": 720, "height": 1080 }` biçimindedir. Dönen `image` yolu carousel PUT gövdesindeki bir kartta seçilebilir. İlk kurulumda `node scripts/seed-persistent-homepage.mjs`, orijinal kaynak görsellerin kopyalarını `${AZURA_UPLOADS_ROOT}/pages/homepage/` altına yalnızca dosyalar yoksa yerleştirir ve eski kalıcı JSON'a eksik `sections.carousel` alanını mevcut içerikleri ezmeden ekler.

### Anasayfa oda kartları (`accommodation`)

`GET /api/azura/homepage/sections/accommodation` ve aynı adrese `PUT`, `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister. GET yanıtı `{ "section": { "translations": { "tr": { "subtitle": "...", "title": "...", "buttonText": "..." }, "en": { ... }, "de": { ... }, "ru": { ... } }, "cards": [{ "key": "deluxe", "image": "/uploads/pages/homepage/accommodation-deluxe.png", "translations": { "tr": { "title": "...", "description": "...", "area": "...", "view": "...", "alt": "..." }, "en": { ... }, "de": { ... }, "ru": { ... } } }, { "key": "fantasy", ... }, { "key": "family", ... }] }, "revision": "<64 karakterlik SHA-256>" }` biçimindedir. PUT aynı yapının yalnızca `{ "section": { ... } }` bölümünü, `Content-Type: application/json` ve `If-Match: "<GET revision>"` başlıklarını ister; yanıtı yeni `revision` ile GET biçimindedir. Başarılı kayıt dört dilin anasayfasını yeniden doğrular.

Kartlar tam olarak `deluxe`, `fantasy`, `family` sırasındadır. Bağlantılar JSON'da bulunmaz; sırasıyla `/rooms/deluxeroom`, `/rooms/fantasyroom`, `/rooms/familyroom` olarak kodda sabittir. Görseller `${AZURA_UPLOADS_ROOT}/pages/homepage/` içinde gerçek, geçerli JPG/PNG/WebP dosyaları olmalıdır. Dört dilde eksik veya ek alan, boş değer, kontrol karakteri, geçersiz ya da bulunmayan görsel 400; yetkisiz istek 401; eksik If-Match 428; eski revision 409; bilinmeyen bölüm 404 döner. Yazma ortak kuyrukta yeniden okuma ve atomik kayıtla yapılır; diğer homepage alanları ve sürümleri korunur. `node scripts/seed-persistent-homepage.mjs`, eksik accommodation alanını ve üç kaynak PNG'nin baytları aynı kopyalarını yalnızca mevcut değillerse kalıcı dizinlere ekler; mevcut kayıtları ve görselleri değiştirmez. Yeni görseller için mevcut `GET/POST /api/azura/homepage/images` kullanılır.

Doğrulama için `npm run test:homepage-api`, ardından `npm run build` ve `npm run test:homepage-http` çalıştırılır. Son komut yerel production sunucusu açarak servis tokenı, medya yükleme/seçme ve dört dilde yayın akışını sınar.

### Anasayfa doğa arka planı (`background`)

Aktif `HomePage5.jsx` bileşeni için metin ve CSS arka plan görseli, kalıcı `homepage.json` içindeki `sections.background` alanından okunur. Alanın tam şeması `{ "image": "/uploads/pages/homepage/background-green-and-blue.png", "translations": { "tr": { "subtitle": "...", "title": "...", "text": "...", "buttonText": "..." }, "en": { "subtitle": "...", "title": "...", "text": "...", "buttonText": "..." }, "de": { "subtitle": "...", "title": "...", "text": "...", "buttonText": "..." }, "ru": { "subtitle": "...", "title": "...", "text": "...", "buttonText": "..." } } }` biçimindedir. Başlangıç metinlerinin tamamı JSON dosyasındadır. CSS arka planına `alt` alanı eklenmez. Görselin orijinali korunur; seed komutu baytları aynı kopyasını kalıcı uploads dizinine yalnızca eksikse ekler.

`GET /api/azura/homepage/sections/background` için `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` gerekir; yanıt `{ "section": { "image": "...", "translations": { "tr": { ... }, "en": { ... }, "de": { ... }, "ru": { ... } } }, "revision": "<64 karakterlik SHA-256>" }` biçimindedir. `PUT` aynı URL'de `Content-Type: application/json`, `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>`, `If-Match: "<GET revision>"` başlıklarıyla yalnızca `{ "section": { "image": "...", "translations": { "tr": { ... }, "en": { ... }, "de": { ... }, "ru": { ... } } } }` gövdesini kabul eder; başarılı yanıt GET biçiminde yeni revision ile döner. Dillerin her birinde yalnızca dört metin alanı kabul edilir: `subtitle` en çok 200, `title` en çok 250, `text` en çok 2000, `buttonText` en çok 120 karakter. Geçersiz/olmayan/sahte görsel, eksik/ek alan, boş veya aşırı uzun metin 400; yetkisiz istek 401; eksik If-Match 428; eski revision 409 döner. Ortak yazma kuyruğu ve atomik kayıt diğer homepage alanlarını korur; dört dilin anasayfası başarılı PUT sonrasında güncellenir. Görsel listeleme ve yükleme için mevcut `GET/POST /api/azura/homepage/images` kullanılır. `npm run test:homepage-http` production build sonrasında iki bölümün canlı API ve yayın akışını doğrular.

### Ortak iletişim verisi

Anasayfadaki aktif `GeneralComponents/Contact/ContactSection.jsx` bölümü `${AZURA_CONTENT_ROOT}/shared/contact-details.json` dosyasını kullanır. Bu dosya `homepage.json` içinden ayrı tutulur. Tam `details` şeması: `username`, `phone`, `callCenter`, `email`, `instagramUrl`, `facebookUrl`, `youtubeUrl`, `reservationUrl` ve `translations`. `translations` tam olarak `tr`, `en`, `de`, `ru` dillerini; her dil de yalnızca `contactForMore`, `address`, `phoneLabel`, `callCenterLabel`, `emailLabel`, `reservationButtonText` alanlarını içerir. Telefonlar gösterim biçimiyle saklanır; `tel:` bağlantıları doğrulama sonrası rakamlar ve başlangıçtaki `+` ile türetilir. E-posta doğrulanarak `mailto:` bağlantısına dönüştürülür. Dört dış adres yalnızca geçerli HTTPS URL'si olabilir. Mevcut `ContactPage` mesajları diğer sayfalar için korunur.

`GET /api/azura/shared/contact/details`, `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ile `{ "details": { "username": "@AzuraDeluxeResort", "phone": "+90 242 517 12 34", "callCenter": "+90 242 277 11 43", "email": "info@azuradeluxe.com", "instagramUrl": "https://www.instagram.com/azuradeluxeresort/", "facebookUrl": "https://www.facebook.com/AzuraDeluxeResort/", "youtubeUrl": "https://www.youtube.com/channel/UC3Z23WuWOhmpFnbw9fLI1-g", "reservationUrl": "https://azuradeluxehotel.orsmod.com/", "translations": { "tr": { "contactForMore": "...", "address": "...", "phoneLabel": "...", "callCenterLabel": "...", "emailLabel": "...", "reservationButtonText": "..." }, "en": { ... }, "de": { ... }, "ru": { ... } } }, "revision": "<64 karakterlik SHA-256>" }` biçiminde döner. `PUT` aynı URL'de `Authorization`, `Content-Type: application/json`, `If-Match: "<GET revision>"` başlıklarıyla yalnızca `{ "details": { ...tam GET details nesnesi... } }` gövdesini kabul eder; başarılı yanıtta güncel `details` ve yeni revision bulunur. Eksik/bozuk başlık `428`/`400`, geçersiz token `401`, eski revision `409`, bozuk veri `400` döner. `contactForMore` en çok 200, `address` en çok 500, diğer yerelleştirilmiş metinler en çok 120 karakterdir; `username` sınırı 100, telefon sınırı 32, e-posta sınırı 254 ve HTTPS URL sınırı 2048 karakterdir. Kayıt atomiktir ve dört dilin anasayfasını yeniler. `node scripts/seed-persistent-homepage.mjs` eksik ortak iletişim dosyasını başlangıç verisiyle ekler; mevcut dosyayı veya sonraki panel kayıtlarını ezmez.

### Oda liste kartları

Aktif oda liste sayfası `${AZURA_CONTENT_ROOT}/site-pages/rooms.json` dosyasını sunucuda okur. Kart API’si dosyadaki `schemaVersion: 1`, `pageKey: "rooms"` ve `cards` alanlarını kullanır; sayfanın diğer alanları aşağıda açıklanır. `cards` tam olarak `deluxe`, `family`, `fantasy` sırasındaki üç karttır. Her kartın kesin şeması `{ "key": "deluxe", "primary": { "src": "/uploads/pages/rooms/deluxe-primary.png", "width": 860, "height": 1240, "translations": { "tr": { "alt": "Superior Rooms" }, "en": { "alt": "Superior Rooms" }, "de": { "alt": "Superior Rooms" }, "ru": { "alt": "Superior Rooms" } } }, "secondary": { "src": "/uploads/pages/rooms/deluxe-secondary.png", "width": 860, "height": 1240, "translations": { "tr": { "alt": "Superior Rooms" }, "en": { "alt": "Superior Rooms" }, "de": { "alt": "Superior Rooms" }, "ru": { "alt": "Superior Rooms" } } }, "translations": { "tr": { "title": "...", "text": "...", "area": "...", "view": "...", "buttonText": "..." }, "en": { ... }, "de": { ... }, "ru": { ... } } }` biçimindedir. Family ve Fantasy aynı alanlara sahiptir; gerçek başlangıç değerleri seed JSON’dadır. Başlangıçta üç kartın düğme metni de eski `Rooms.Room1.buttonText` değerinden alınmıştır. Bağlantılar içerikte yer almaz; sırasıyla `/rooms/deluxeroom`, `/rooms/familyroom`, `/rooms/fantasyroom` kodda sabittir.

Altı Azura kaynak PNG’sinin baytları aynı kopyaları `${AZURA_UPLOADS_ROOT}/pages/rooms/` altında tutulur. Görsel `src` yolu yalnızca `/uploads/pages/rooms/...` biçiminde olabilir. Sunucu okuması dosyanın kalıcı uploads kökünde gerçekten bulunduğunu, PNG/JPEG/WebP imzasını ve çözülebilirliğini doğrular; dosyanın gerçek genişlik/yüksekliği JSON'daki `width`/`height` ile eşleşmezse sayfa hatası verir. `node scripts/seed-persistent-rooms.mjs` veya mevcut `node scripts/seed-persistent-homepage.mjs` eksik rooms JSON’unu ve eksik görselleri ekler, var olan kalıcı veriyi ve görselleri ezmez.

`GET /api/azura/rooms/cards`, `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ile `{ "cards": [<deluxe>, <family>, <fantasy>], "revision": "<64 karakterlik küçük harf SHA-256>" }` döner. Kartların tam şeması yukarıdaki örnektir; `primary` ve `secondary` görsellerinin `src`, gerçek `width`/`height` ve dört dilde `alt` alanları ile her kartın dört dilde `title`, `text`, `area`, `view`, `buttonText` alanları zorunludur. `PUT /api/azura/rooms/cards` aynı token, `Content-Type: application/json`, `If-Match: "<GET revision>"` ve yalnızca `{ "cards": [<deluxe>, <family>, <fantasy>] }` gövdesini kabul eder. Başarılı `200` yanıtı GET biçimindedir ve yeni revision içerir. Revision yalnızca doğrulanmış kart içeriğinin SHA-256 değeridir; dosyaya yazılmaz. `schemaVersion`, `pageKey` ve başka üst düzey veriler korunur. Kart bağlantıları kodda sabittir. Yanlış token `401`, eksik `If-Match` `428`, bozuk başlık/JSON/kart/görsel/ölçü `400`, eski revision `409` döner; yanlış Content-Type `415` döner. Kayıt aynı process içinde kuyrukta yeniden okuma, revision kontrolü ve atomik yazma ile yapılır. `409` halinde panel güncel revision ve kartları tekrar GET ile almalıdır.

`GET /api/azura/rooms/images` aynı Bearer token ile `{ "images": [{ "image": "/uploads/pages/rooms/deluxe-primary.png", "mimeType": "image/png", "size": 123, "width": 860, "height": 1240, "modifiedAt": "..." }, ...] }` döner. Yalnızca `${AZURA_UPLOADS_ROOT}/pages/rooms/` içindeki geçerli, gerçek JPG/PNG/WebP dosyaları listelenir; symlink ve bozuk dosyalar atlanır. `POST /api/azura/rooms/images` tek `file` alanlı `multipart/form-data` alır ve `201` ile `{ "image": "/uploads/pages/rooms/rooms-<sunucu-id>.png", "mimeType": "image/png", "size": 123, "width": 860, "height": 1240 }` döner. Dosya en çok 8 MiB, görsel en çok 16 milyon piksel olabilir. İmza, gerçek tür ve çözülebilirlik kontrol edilir; sahte, bozuk ve desteklenmeyen dosyalar reddedilir. Yükleme mevcut dosyayı veya rooms JSON’unu değiştirmez. Panel bir görsel seçtiğinde ilgili `primary`/`secondary` nesnesindeki `src`, `width` ve `height` alanlarını birlikte güncellemeli; dört dilde `alt` değerlerini korumalı veya düzenlemelidir. `npm run test:rooms`, `npm run test:homepage-api`, `npm run build`, `npm run lint` ve build sonrasında `npm run test:rooms-http` doğrulama komutlarıdır.

### Oda sayfası bütünleşik içeriği

Aktif `/rooms` sayfasının banner, giriş ve özellik alanları da aynı kalıcı `${AZURA_CONTENT_ROOT}/site-pages/rooms.json` dosyasındadır. Dosyanın ek kök alanları `hero: {image, translations}`, `intro: {tr, en, de, ru}` ve `parallax: {image, translations, content: {tr, en, de, ru}}` biçimindedir. `intro` her dilde tam olarak `header`, `buttonText1`, `buttonText2`, `buttonText3`, `subtitle`, `title`, `text`, `checkin`, `checkout` içerir. `parallax.content` her dilde tam olarak `subtitle`, `title`, `text`, `span1`, `text1`, `span2`, `text2`, `span3`, `text3`, `span4`, `text4` içerir. Banner ve parallax görselleri kalıcı uploads içinde sırasıyla `/uploads/pages/rooms/rooms-hero.webp` ve `/uploads/pages/rooms/rooms-parallax.jpg` olarak başlatılır; orijinaller korunur. `node scripts/seed-persistent-rooms.mjs`, eski kalıcı JSON'da yalnızca eksik `hero`, `intro`, `parallax` alanlarını ve eksik görsel dosyalarını ekler. Var olan kartları, metinleri, görselleri ve başka kök alanları ezmez.

`GET /api/azura/rooms/page-content` ve aynı adrese `PUT`, `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister. GET ve başarılı PUT yanıtının **tam üst düzey biçimi** `{ "bundle": { "tr": <localeContent>, "en": <localeContent>, "de": <localeContent>, "ru": <localeContent> }, "media": <roomMedia>, "revision": "<64 karakterlik küçük harf SHA-256>" }` olur. Her `<localeContent>` nesnesi **yalnızca** şu alanları içerir: `header`, `buttonText1`, `buttonText2`, `buttonText3`, `subtitle`, `title`, `text`, `checkin`, `checkout`, `RoomSection1`, `RoomSection2`, `RoomSection3`, `RoomsParallax`. `RoomSection1/2/3` nesnelerinin her biri tam olarak `{ "title": "...", "subtitle": "...", "m": "...", "view": "...", "buttonText": "..." }` biçimindedir ve sırasıyla Azura'nın `deluxe`, `family`, `fantasy` kartlarına karşılık gelir. Azura kartındaki `text` → `subtitle`, `area` → `m` kayıpsız eşlenir. `RoomsParallax` tam olarak `subtitle`, `title`, `text`, `feature1`, `desc1`, `feature2`, `desc2`, `feature3`, `desc3`, `feature4`, `desc4` alanlarını içerir; Azura'nın `spanN` → `featureN`, `textN` → `descN` eşlemesi kullanılır.

`<roomMedia>` tam olarak `{ "hero": <image>, "cards": { "deluxe": { "primary": <image>, "secondary": <image> }, "family": { "primary": <image>, "secondary": <image> }, "fantasy": { "primary": <image>, "secondary": <image> } }, "parallax": <image> }` biçimindedir. Her `<image>` tam olarak `{ "image": "/uploads/pages/rooms/<dosya>.jpg", "translations": { "tr": { "alt": "..." }, "en": { "alt": "..." }, "de": { "alt": "..." }, "ru": { "alt": "..." } } }` biçimindedir; `.png` ve `.webp` de desteklenir. Görsel yolu kalıcı rooms uploads dizininde gerçek, geçerli bir JPG/PNG/WebP dosyasını göstermelidir. Kart görselinin gerçek `width` ve `height` değerleri PUT sırasında dosyadan ölçülerek kalıcı kart şemasına yazılır; `media` içinde ölçü alanı yoktur. Lago'ya özgü başka oda veya `otherOptions` üretilmez.

PUT isteğinin başlıkları `Content-Type: application/json`, Bearer servis tokenı ve `If-Match: "<GET revision>"` olmalıdır. Gövde yalnızca `{ "bundle": { ... }, "media": { ... } }` içerir; `revision` gönderilmez. Revision, doğrulanmış `bundle` ile `media` içeriğinin SHA-256 değeridir ve `rooms.json` içine yazılmaz. Eksik/geçersiz token `401`, eksik `If-Match` `428`, bozuk başlık veya veri/görsel `400`, eski revision `409`, yanlış Content-Type `415` döner. `page-content` ve `cards` PUT'ları aynı process kuyruğunda dosyayı yeniden okuyup atomik yazar. Kart API'si mevcut dar sözleşmesini korur; kart değişikliği page-content revision'ını da değiştirir. Başarılı kayıt dört dilin `/rooms` sayfasını yeniler. Doğrulama için `npm run test:rooms`, `npm run build`, `npm run lint` ve build sonrasında `npm run test:rooms-http` kullanılır.

### Restoran liste sayfası

Aktif `/[locale]/restaurants` sayfası `${AZURA_CONTENT_ROOT}/site-pages/restaurants.json` dosyasını sunucuda okur. İlk kurulumda `AZURA_CONTENT_ROOT` ve `AZURA_UPLOADS_ROOT` kalıcı dizinlere ayarlanmışken `node scripts/seed-persistent-restaurants.mjs` çalıştırın. Bu komut 13 Azura görselini `${AZURA_UPLOADS_ROOT}/pages/restaurants/` altına ve başlangıç JSON'unu yalnızca eksikse kopyalar. Tekrar çalıştırma mevcut dosyaları ve düzenlenmiş içeriği değiştirmez; mevcut dosya bozuksa işlemi hata ile bitirir. Dosya veya görsel eksik ya da bozuk olduğunda sayfa eski statik içeriklere sessizce dönmez. `/uploads/pages/restaurants/...` görsel URL'leri mevcut salt okunur medya sunumu üzerinden kalıcı kökten açılır.

Zorunlu kök alanlar `schemaVersion: 1`, `pageKey: "restaurants"`, `translations` ve `media` değerleridir; ek kök metadata varsa kayıt sırasında korunur. `translations` içinde `tr`, `en`, `de`, `ru` bulunur; her dilde `hero: {subtitle,title,text}`, `intro: {subtitle,title,text,span,list1}`, `mainRestaurant: {subtitle,title,text,span,list1,list2,list3}`, `alacarteCarousel: {subtitle,title,text,cards}`, `reverse: {span,title,text,text2}`, `dessertsCarousel: {subtitle,title,text,cards}` ve `discover: {subtitle,title,text}` zorunludur. İki kaydırıcının her `cards` nesnesindeki her kart `{title,subtitle,text}` içerir. İlk kart anahtarları ve sırası `orchestra`, `bellaAzura`, `ottoman`; ikinci kaydırıcıda `patisserie`, `mazurka`, `lyric` olarak sabittir. Medya aynı bölüm anahtarlarını kullanır: `hero`, `mainRestaurant`, `discover` birer görsel; `intro` ve `reverse` `{primary,secondary}`; iki kaydırıcı `{cards: {<sabit kart anahtarı>: <görsel>}}` biçimindedir. Her görsel nesnesi tam olarak `{ "image": "/uploads/pages/restaurants/<dosya>.jpg", "width": 2160, "height": 1440, "translations": { "tr": { "alt": "..." }, "en": { "alt": "..." }, "de": { "alt": "..." }, "ru": { "alt": "..." } } }` alanlarına sahiptir; gerçek ölçüler her dosya için seed JSON'da bulunur. JPG, PNG ve WebP desteklenir; sunucu görselin gerçek türünü, çözülebilirliğini ve ölçülerini kontrol eder.

İlk kaydırıcının ikinci kartında eski kod `CarouselSection.subtitle2` değerini büyük başlıkta, `CarouselSection.title2` değerini küçük üst etikette gösteriyordu. Başlangıç JSON'undaki `alacarteCarousel.cards.bellaAzura.title` ve `.subtitle` alanları **ekrandaki bu sırayı** korur; isimlerin kaynak mesajlarla ters düşmesi olası bir eski içerik hatasıdır. Bu aşamada görünüm düzeltilmedi. Bölüm sırası, animasyonlar, kart bağlantılarının kullanılmama hâli ve yorum satırındaki düğmeler korunur. Restoran detay sayfaları, `ContactSection2`, `CuisinesCarouselSingle` ve `RestaurantMainBanner` kapsam dışındadır. İçerik API'si aşağıdaki `bundle` ve `media` eşlemesini kullanır. Doğrulama: `npm run test:restaurants`, `npm run lint`, `npm run build`, build sonrasında `npm run test:restaurants-http`.

### Restoran içerik ve görsel API'leri

`GET /api/azura/restaurants/page-content` ve `PUT /api/azura/restaurants/page-content`, `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister. GET ve başarılı PUT yanıtının tam üst düzey biçimi `{ "bundle": <restaurants.json.translations>, "media": <restaurants.json.media>, "revision": "<64 karakterlik küçük harf SHA-256>" }` olur. `bundle` ve `media` yukarıdaki kesin şemayı kullanır; `intro.subtitle` ile `reverse.span` boş dize olabilir. PUT yalnızca `{ "bundle": ..., "media": ... }` gövdesini, `Content-Type: application/json` ve `If-Match: "<GET revision>"` başlığını kabul eder. Revision, doğrulanmış `bundle` ve `media` içeriğinden hesaplanır; dosyaya yazılmaz. `schemaVersion`, `pageKey` ve ileride eklenen başka kök alanlar korunur. Kilit altında dosya yeniden okunur, revision karşılaştırılır ve geçerli içerik atomik yazılır. Başarılı kayıt dört dildeki `/restaurants` yollarını yeniden doğrular. Yetkisiz istek `401`, eksik `If-Match` `428`, bozuk başlık/veri/görsel `400`, eski revision `409`, yanlış Content-Type `415` döner. 409 dosyayı değiştirmez. Aşırı büyük JSON gövdesi `413` döner.

`GET /api/azura/restaurants/images` aynı Bearer tokenıyla `{ "images": [{ "image": "/uploads/pages/restaurants/<dosya>.jpg", "mimeType": "image/jpeg", "size": 123, "width": 300, "height": 450, "modifiedAt": "<ISO tarih>" }, ...] }` döner. Yalnızca kalıcı restoran uploads dizinindeki gerçek, çözülebilen JPEG/PNG/WebP dosyaları listelenir; symlink ve bozuk dosyalar atlanır. `POST /api/azura/restaurants/images`, tek `file` alanlı `multipart/form-data` yüklemesi alır; başarılı `201` yanıtı `{ "image": "/uploads/pages/restaurants/restaurants-<sunucu-id>.jpg", "mimeType": "image/jpeg", "size": 123, "width": 300, "height": 450 }` biçimindedir. Gerçek imza ve dosya türü eşleşmeli, dosya en çok 8 MiB ve görsel en çok 16 milyon piksel olmalıdır. Dosya adı sunucuda oluşturulur; mevcut dosyanın üzerine yazılmaz. Yükleme `restaurants.json` dosyasını değiştirmez; görseli seçmek için `media` içindeki ilgili `image`, `width` ve `height` değerleri birlikte PUT ile güncellenir. Doğrulama: `npm run test:restaurants`, `npm run build`, `npm run test:restaurants-http`, `npm run test:homepage-api`, `npm run test:rooms`.

### Hakkımızda sayfası: kalıcı okuma

Aktif `/[locale]/about` sayfası `${AZURA_CONTENT_ROOT}/site-pages/about.json` dosyasını sunucuda okur. Production'da `AZURA_CONTENT_ROOT` ve `AZURA_UPLOADS_ROOT` mutlak kalıcı yollar olarak tanımlanmalıdır. Development varsayılanları `client/content` ve `client/public/uploads` klasörleridir. `client` çalışma dizininde `node scripts/seed-persistent-about.mjs` komutu başlangıç JSON'unu ve sekiz görseli kalıcı köklere yalnızca eksikse ekler. `wx` ve `COPYFILE_EXCL` mevcut dosyaların üzerine yazılmasını önler. Mevcut bozuk dosya düzeltilmez; doğrulama açık hata verir. About sayfası `force-dynamic` çalışır; dosya her sunucu render'ında doğrulanarak okunur. `azura-about-content.js` içindeki `server-only` işareti okuma katmanının istemciye taşınmasını engeller.

Kesin JSON şeması:

```text
{
  schemaVersion: 1,
  pageKey: "about",
  translations: {
    tr: LocaleContent, en: LocaleContent, de: LocaleContent, ru: LocaleContent
  },
  media: {
    hero: Image,
    location: Image,
    moments: { images: [Moment1, Moment2, Moment3, Moment4] },
    missionVision: { mission: Image, vision: Image }
  }
}
LocaleContent = {
  hero: { subtitle: string, title: string },
  location: { subtitle: string, title: string, text: string, buttonText: string },
  missionVision: {
    subtitle: string, title: string, text: string,
    mission: { subtitle: string, title: string, text: string },
    vision: { subtitle: string, title: string, text: string }
  }
}
Image = {
  image: "/uploads/pages/about/<dosya>.jpg",
  width: pozitif tamsayı, height: pozitif tamsayı,
  translations: { tr: {alt: string}, en: {alt: string}, de: {alt: string}, ru: {alt: string} }
}
MomentN = { id: "about-moment-N", order: N-1, ...Image }
```

Alanlar tam olmalıdır; ek alanlar, eksik diller, boş veya 4000 karakterden uzun metinler ve kontrol karakterleri reddedilir. Alt açıklamalar en çok 300 karakterdir. Dört moments kaydının id ve sıra değerleri sabittir. JPEG/PNG/WebP imzası ve çözülebilirlik, 8 MiB/16 milyon piksel sınırları, güvenli dizin, gerçek width/height eşliği doğrulanır; eksik dosya, yol taşması ve symlink görsel hata verir. Orijinal görüntü oranları korunur; var olan CSS kırpmaları değişmez. CSS hero arka planının alt açıklaması veride tutulur; CSS arka planı HTML alt niteliği kullanmaz.

| JSON alanı | Görünen bileşen | Başlangıç kaynağı |
| --- | --- | --- |
| `translations.*.hero`, `media.hero` | MainBanner2 | `About.subtitle/title`, `banner.jpg` → `hero.jpg` |
| `translations.*.location`, `media.location` | SpaReverseInfo | `About.InfoSection`, `PANORAMIC.jpg` → `location.jpg`; bağlantı `/` |
| `media.moments.images` | KidsMomentCarousel | `gal_orta.jpg`, `Gal_sag.jpg`, `gal_son.jpg`, `gal_sol.jpg` → `moment-1.jpg`…`moment-4.jpg` |
| `translations.*.missionVision`, `media.missionVision` | MissionVisionSection | `About.MissinonVision` görünen alanları; `1.jpg` → `mission.jpg`, `2.jpg` → `vision.jpg` |

Mevcut tutarsızlıklar bilinçli ele alındı: About sayfasındaki HomePage Slider1 çağrısı `slides` göndermediğinden `TypeError: undefined is not iterable` üretmekteydi. Kullanıcı onayıyla yalnızca bu çağrı kaldırıldı; keşif kartı uydurulmadı ve HomePage Slider1 değiştirilmedi. Misyon-vizyonun her iki sütununda `clubsubtitle1/clubtitle1` görünüyordu; sol paragraf üst bölümün `text` değerini, sağ paragraf `clubtext2` değerini gösteriyordu. Başlangıç verisi bu görünen eşleşmeyi korur. `clubtext1`, `clubsubtitle2`, `clubtitle2` ve gizli misyon-vizyon düğmesi görünür yeni alanlar olarak eklenmedi. Mesaj dosyaları korunur. Lago about JSON'undan yalnızca `hero`, `location`, `moments`, `missionVision` adları referans alındı; Lago'nun belge görseli ve yedi keşif kartı eklenmedi. Azura'nın location alanı konum özelliği eklemez; mevcut tanıtım bölümünün adlandırmasıdır. ContactSection2 ve diğer sayfalar kapsam dışıdır; ortak SpaReverseInfo ve KidsMomentCarousel'e eklenen isteğe bağlı prop/alt desteği diğer kullanımların eski davranışını korur.

### Hakkımızda içerik ve medya API'leri

`GET /api/azura/about/page-content` ve aynı adrese `PUT`, `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister. GET ve başarılı PUT yanıtı tam olarak `{ "bundle": <about.json.translations>, "media": <about.json.media>, "revision": "<64 karakterlik küçük harf SHA-256>" }` biçimindedir. Yukarıdaki LocaleContent ve Image şemaları aynen geçerlidir; sekiz görsel ve dört moments kimliği korunur. Başlangıç verisinde boş metin alanı yoktur. Metinler 1–4000, alt açıklamalar 1–300 karakterdir; yalnızca boşluk içeren değerler ve kontrol karakterleri kabul edilmez, geçerli metnin başındaki/sonundaki boşluklar korunur. İç içe ek alanlar reddedilir; dosyadaki ek kök metadata korunur.

PUT başlıkları:

```http
Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>
Content-Type: application/json
If-Match: "<GET revision>"
```

PUT gövdesi yalnızca `{ "bundle": <dört dilin tamamı>, "media": <sekiz görselin tamamı> }` içerir; `revision`, `schemaVersion` veya `pageKey` gönderilmez. JSON gövdesi restoran API'siyle aynı şekilde en fazla 128 KiB olabilir. Revision, doğrulanmış bundle ve media'nın nesne anahtarları sıralanmış kanonik JSON içeriğinin SHA-256 değeridir; dizilerin sırası korunur ve revision dosyaya yazılmaz. Kuyruk içinde mevcut dosya yeniden okunur, revision karşılaştırılır ve yalnızca translations/media güncellenerek atomik kaydedilir. schemaVersion, pageKey ve diğer kök alanlar korunur. **Kuyruk yalnızca aynı Node.js süreci içindeki yazmaları korur; ayrı worker/process veya sunucular arasında kilit sağlamaz.** Çok süreçli yazma için ayrıca ortak kilit/veritabanı gerekir. Başarısız işlem kuyruğu kilitlemez.

Başarı `200`; yetkisiz istek `401`, eksik If-Match `428`, biçimsiz If-Match veya geçersiz veri/görsel `400`, eski revision `409`, yanlış Content-Type `415`, gövde sınırı aşımı `413` döner. Hatalar `{ "error": "..." }` biçimindedir. `409` dosyayı değiştirmez; panel güncel veriyi GET ile alıp kullanıcı değişikliklerini yeniden değerlendirmelidir. Başarılı kayıt `/tr/about`, `/en/about`, `/de/about`, `/ru/about` yollarını yeniden doğrular.

`GET /api/azura/about/images` aynı Bearer tokenıyla şu biçimi döndürür:

```json
{"images":[{"image":"/uploads/pages/about/hero.jpg","mimeType":"image/jpeg","size":123,"width":2560,"height":1438,"modifiedAt":"2026-09-18T00:00:00.000Z"}]}
```

Örnekteki boyut/tarih temsildir; gerçek değerler dosyadan okunur. Yalnızca kalıcı about dizinindeki geçerli JPEG/PNG/WebP dosyaları listelenir; symlink ve bozuk dosyalar dışlanır. `POST /api/azura/about/images` aynı token ve tek `file` alanlı multipart/form-data kabul eder. Başarılı `201` yanıtı tam olarak `{ "image": "/uploads/pages/about/about-<sunucu-id>.jpg", "mimeType": "image/jpeg", "size": 123, "width": 1042, "height": 1042 }` biçimindedir. Dosya en fazla 8 MiB, görsel en fazla 16 milyon pikseldir; multipart gövde sınırı 8 MiB + 128 KiB'dir. Gerçek dosya imzası, MIME türü ve çözülebilirlik ortak medya katmanında doğrulanır. SVG/PDF/sahte görseller reddedilir; sunucunun benzersiz dosya adı ve üzerine yazmayan kayıt kullanılır.

Yükleme yalnızca dosyayı kaydeder, about.json değişmez. Panel görsel seçildiğinde ilgili media nesnesinin image/width/height değerlerini birlikte güncelleyip dört dilde alt açıklamalarla page-content PUT yapmalıdır. Moments id/order değerleri değiştirilmez. Lago panel bağlantısı bu aşamada yoktur; belge veya keşif carousel'i eklenmez.

Doğrulama komutları: `npm run test:about`, `npm run lint`, `npm run build`, build sonrasında `npm run test:about-http`. Birim testleri metin/görsel eşliğini, şemayı, seed'i, kanonik revision'ı, kuyruk ve metadata korumasını doğrular. HTTP testi yetki/hatalı istekleri, paralel 200/409 kaydı, sekiz görseli, yükleme ve seçimi, dört dilde yayını ve production sunucusu yeniden başlatıldıktan sonra kalıcılığı kontrol eder. Ortak medya regresyonu için `test:homepage-api`, `test:homepage-http`, `test:rooms`, `test:rooms-http`, `test:restaurants`, `test:restaurants-http` çalıştırılır.

### Spa & Wellness: kalıcı sayfa içeriği

Aktif `/[locale]/spawellness` sayfası `${AZURA_CONTENT_ROOT}/site-pages/spawellness.json` dosyasını `azura-spawellness-content.js` server-only girişinden, `readSpaWellnessPageLocale(locale)` ile okur. `force-dynamic` sayesinde sonraki sunucu isteği güncel kalıcı dosyayı okur; yeniden build veya restart gerekmez. JSON/dil/alan/görsel eksik ya da geçersizse açık hata oluşur; next-intl veya statik görsele sessiz geri dönüş yoktur. `ContactSection2` kendi mevcut ortak içeriğini kullanmaya devam eder.

Kesin şema aşağıdadır. `Group` tam olarak üç metin alanıdır; `tr/en/de/ru` dört dilin tamamı zorunludur. İç nesnelerde gösterilmeyen alanlar kabul edilmez; ek kök metadata kayıt sırasında korunur.

```text
{
  schemaVersion: 1,
  pageKey: "spawellness",
  translations: { tr: LocaleContent, en: LocaleContent, de: LocaleContent, ru: LocaleContent },
  media: {
    hero: Image,
    info: { wellness: Image, sauna: Image },
    gallery: { images: [Gallery1, Gallery2, Gallery3, Gallery4, Gallery5] },
    massage: { images: [Aromatic, Oriental, Classic, Facial] },
    types: { indoor: Image, turkishBath: Image }
  }
}
Group = { subtitle: string, title: string, text: string }
LocaleContent = {
  hero: Group,
  info: {
    intro: Group,
    sauna: Group,
    wellness: { subtitle, title, text, list1, list2, list3, list4, list5, list6, list7 }
  },
  gallery: Group,
  massage: {
    subtitle, title, text, time,
    cards: {
      "spa-massage-aromatic": { title: string },
      "spa-massage-oriental": { title: string },
      "spa-massage-classic": { title: string },
      "spa-massage-facial": { title: string }
    }
  },
  types: { indoor: Group, turkishBath: Group }
}
Image = {
  image: "/uploads/pages/spawellness/<dosya>.webp",
  width: pozitif tamsayı,
  height: pozitif tamsayı,
  translations: { tr: {alt: string}, en: {alt: string}, de: {alt: string}, ru: {alt: string} }
}
GalleryN = { id: "spa-gallery-N", order: N-1, ...Image } // N: 1..5
Aromatic = { id: "spa-massage-aromatic", order: 0, ...Image }
Oriental = { id: "spa-massage-oriental", order: 1, ...Image }
Classic = { id: "spa-massage-classic", order: 2, ...Image }
Facial = { id: "spa-massage-facial", order: 3, ...Image }
```

Metinlerin başlangıç/son boşlukları değiştirilmez. Metinler 1–4000, alt açıklamalar 1–300 karakterdir; yalnızca boşluk veya kontrol karakteri içeren değerler geçersizdir. Başlangıç verisinde boş metin yoktur. Görseller yalnızca `/uploads/pages/spawellness/` altında JPEG/PNG/WebP olabilir. Gerçek dosya imzası, çözülebilirlik, en fazla 8 MiB/16 milyon piksel ve JSON'daki gerçek width/height eşliği doğrulanır. Yol taşması, olmayan dosya ve symlink reddedilir. Aynı kaynak tekrar kullanıldığında her medya kaydının ölçüleri kontrol edilir, dosya bir sunucu okumasında yalnızca bir kez çözümlenir.

| Kalıcı alan | Görünen bileşen / eski Spa anahtarı |
| --- | --- |
| `hero` metin ve medya | `BannerDark`; `Spa.subtitle/title/text` |
| `info.intro` | `SpaInfoSection` ilk metin grubu; `InfoSection.subtitle1/title1/text1` |
| `info.sauna`, `media.info.sauna` | Sol alttaki görsel ve ikinci grup; `InfoSection.*2`, `spa2.webp` |
| `info.wellness`, `media.info.wellness` | Sağ dikey görsel ve üçüncü grup; `InfoSection.*3`, `list1`…`list7`, `spa1.webp` |
| `gallery`, `media.gallery.images` | `SpaHeaderSection`; `GallerySection` ve beş görsel |
| `massage`, `media.massage.images` | `MassageCarousel`; `CarouselSection`, `Spa.time`, `Spa.title1`…`title4` |
| `types.indoor` metin ve medya | `SpaTypesInfoSection`; `SpaTypes.*1` |
| `types.turkishBath` metin ve medya | `SpaReverseInfo`; `SpaTypes.*2` |

Masaj başlıkları ve medya ayrı konumsal listelerle eşleştirilmez: `media.massage.images[].id` aynı dilin `massage.cards[id].title` kaydına bağlanır. Sunucu bileşene tek `{id,order,src,width,height,alt,title}` kart nesnesi verir. Kimlikler ve sıra doğrulanır. Carousel'in dört kartı iki kere render etmesi, 3000 ms autoplay ayarı, boyutları ve animasyonu korunmuştur. Kaynak masaj görselleri 720×1080 veya 360×540'tır; mevcut `Image` sunum ölçüsü 360×540 ve CSS kırpması aynıdır. Galeri gerçek kaynak ölçülerini kullanmaya devam eder.

**Görsel envanteri:** 14 mantıksal kullanım, 12 benzersiz dosya. Masajın döngü için yaptığı dört tekrar sayılırsa HTML'de 17 img ve bir hero CSS arka planı vardır (ortak iletişim bölümü hariç). Tüm dosyalar `/uploads/pages/spawellness/` altındadır; orijinal dosyalar korunur.

| Yeni dosya | Orijinal Spa images dosyası | Gerçek ölçü |
| --- | --- | --- |
| hero.webp | spaBanner.webp | 1876×1038 |
| wellness.webp | spa1.webp | 1001×1500 |
| sauna.webp | spa2.webp | 2160×1440 |
| gallery-1.webp | spa4.webp | 2160×1440 |
| gallery-2.webp | spa3.webp | 961×1440 |
| gallery-3.webp | spa5.webp | 2160×1440 |
| massage-aromatic.webp | aromatic.webp | 720×1080 |
| massage-oriental.webp | oriental.webp | 360×540 |
| massage-classic.webp | clasmassage.webp | 720×1080 |
| massage-facial.webp | masagefaci.webp | 720×1080 |
| indoor.webp | indoor.webp | 2160×1440 |
| turkish-bath.webp | spa9.webp | 2160×1440 |

Galeri sırası `gallery-1 → gallery-2 → gallery-3 → wellness → sauna`dır; son iki kayıt için yeni dosya kopyası üretilmez. Alt açıklamalar ilgili dildeki mevcut bölüm/kart başlıklarından türetilmiştir. CSS banner alt bilgisi veri modelinde bulunur; arka plan görselinin HTML alt niteliği yoktur.

**Kalıcı kurulum:** `client` dizininde, production için her iki mutlak yol tanımlanmışken çalıştırın:

```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads node scripts/seed-persistent-spawellness.mjs
```

Bunlar örnek yollardır; canlı sunucudaki kalıcı mount dizinlerini kullanın. Seed `COPYFILE_EXCL` ve JSON için `wx` kullanır; mevcut içerik/görseller ezilmez. Tekrar çalıştırma eksik başlangıç dosyalarını ekler, mevcut bozuk dosyayı sessizce onarmaz. Development varsayılanları `client/content` ve `client/public/uploads`tur. Salt okunur medya route'u spawellness kapsamına genişletilmiştir.

**Lago uyumu ve farklar:** Lago'nun `content/site-pages/spawellness.json`, `SpaWellnessMediaEditor.jsx`, `panel/icerikler/page.js` ve `lib/admin/site-pages.js` dosyaları yalnızca okunarak incelendi. `hero`, `info.wellness`, `info.sauna`, `gallery`, `massage`, `types.indoor`, `types.turkishBath` medya yolları uyumludur. Lago koleksiyonlarda `src`, Azura ise her medya kaydında `image` kullanır; ayrıca Azura gerçek width/height ister. Lago'nun mevcut galerisi 14, Azura'nınki 5 öğedir. Masaj dört karttır ve Lago'nun mevcut kimlikleriyle aynıdır. Lago şu anda Spa metinleri için `ObjectEditor`, medya için ayrı `SpaWellnessMediaEditor` kullanır. Azura bağlanırken yukarıdaki metin eşleme tablosu, koleksiyon `src ↔ image` dönüşümü, ölçüler ve otel bazlı 5/4 sınırı uyarlanmalıdır. Masaj başlıkları eski `title1..4` alanlarından sabit kart kimliklerine eşlenmelidir. Lago kodu bu geçişte değiştirilmemiştir.

**Mevcut davranış notları:** SpaInfoSection `texts3.slice(3)` ile gönderilen yedi maddenin tamamını gösterir. Önceden masaj görsel nesnelerindeki title kullanılmıyor, ayrı headers dizisi gösteriliyordu; mevcut sırada metin-görsel uyuşmazlığı yoktu, yeni model bu konumsal bağımlılığı kaldırır. Kapalı havuz ve hamam düğmeleri `showLink=false` kalır. Farklı bloklardaki 07:00–20:00 ve 08:00–19:00 saatleri değiştirilmedi. SpaReverseInfo bileşeninin iç adının SpaTypesInfoSection olması eski bir adlandırma tutarsızlığıdır; davranışını ve Hakkımızda kullanımını değiştirmedik. SpaInfoSection, SpaHeaderSection ve SpaTypesInfoSection'ın eski static image prop kullanımları/alt varsayılanları Spor sayfası için korunur. Mesaj dosyaları başlangıç eşliği referansı olarak tutulmuştur; canlı Spa bölümleri artık bunları okumaz. ContactSection2 değişmez.

**Doğrulama:** `npm run test:spawellness`, `npm run test:about`, `npm run lint`, `npm run build`, ardından `npm run test:spawellness-http` ve `npm run test:about-http`; son olarak `git diff --check`. Spa birim testleri dört dil/boşluk eşliği, 14/12 medya sayısı, bayt/ölçü/sıra eşliği, sabit kimlikle kart eşleşmesi, geçersiz veri/dosya ve seed'in veri ezmemesini kapsar. HTTP testi tüm görünür Spa metinlerini, görsel DOM sırasını/alt açıklamalarını, 12 URL'nin baytlarını, dört dilde About/Spor sayfalarını ve kalıcı dosya değişikliğinin restart öncesi/sonrası yayınını doğrular. Piksel karşılaştırması yapılmadı; kaynak className eşliği ve production HTML kontrolü kullanıldı.

### Spa & Wellness içerik ve görsel yönetim API'leri

Tüm yöntemler `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister; token yalnızca panel sunucusunda tutulmalıdır. Yanıtlar `Cache-Control: no-store` taşır. Servis tokenı yapılandırılmamışsa `503`, yanlış/eksik yetkilendirmede `401` döner. Lago panel bağlantısı bu aşamada eklenmemiştir.

`GET /api/azura/spawellness/page-content` ve başarılı `PUT` yanıtının tam biçimi:

```text
{
  "bundle": <spawellness.json.translations>,
  "media": <spawellness.json.media>,
  "revision": "<64 karakterlik küçük harf SHA-256>"
}
```

`PUT /api/azura/spawellness/page-content` başlıkları:

```http
Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>
Content-Type: application/json
If-Match: "<GET revision>"
```

Gövde **yalnızca** `{ "bundle": <dört dilin tamamı>, "media": <14 medya kaydının tamamı> }` içerir. Yukarıdaki kesin şema değişmez. `schemaVersion`, `pageKey`, `revision` ve başka alanlar istek gövdesinde kabul edilmez. JSON gövdesi en fazla **128 KiB** olabilir; Content-Length olmasa bile okunan bayt sayısı sınırlanır. Metinler 1–4000, alt metinler 1–300 karakterdir; boş veya yalnızca boşluk içeren değerler ve kontrol karakterleri reddedilir. Başlangıçtaki geçerli baş/son boşluklar kırpılmaz. Dört dil, yedi liste maddesi, 14 medya kaydı ve gerçek ölçüler zorunludur. Birden fazla medya kaydı aynı görsel yolunu paylaşabilir; her kaydın ölçüleri doğrulanır.

Galeri kimlikleri sırayla `spa-gallery-1`, `spa-gallery-2`, `spa-gallery-3`, `spa-gallery-4`, `spa-gallery-5`; order değerleri `0,1,2,3,4` olmalıdır. Masaj kimlikleri `spa-massage-aromatic`, `spa-massage-oriental`, `spa-massage-classic`, `spa-massage-facial`; order `0,1,2,3` olmalıdır. Her dilin `massage.cards` nesnesi aynı dört kimliği içerir. Kimlikler, sıralar ve kart sayıları bu API ile değiştirilemez; başlık-görsel eşleşmesi kimlikle yapılır.

Revision, doğrulanmış `{bundle,media}` nesnesinin anahtarları her seviyede sıralanmış kanonik JSON içeriğinin SHA-256 değeridir. Dizi sırası korunur; kök metadata revision'a dahil edilmez, revision dosyaya yazılmaz. PUT aynı Spa yazma kuyruğunda dosyayı yeniden okur, güncel revision ile karşılaştırır, yeni medyanın dosya imzası/çözülebilirlik/ölçülerini doğrular ve geçici dosya + fsync + atomik rename ile kaydeder. Yalnızca translations/media değiştirilir; schemaVersion, pageKey ve diğer kök alanlar korunur. Başarısız işlem kuyruğu kilitlemez. **Kuyruk yalnızca aynı Node.js süreci içindeki yazmaları korur; ayrı worker/process veya sunucular arasında kilit sağlamaz.** Çok süreçli kurulumda ayrıca ortak kilit veya veritabanı gerekir.

Başarılı PUT `200` döner ve `/tr/spawellness`, `/en/spawellness`, `/de/spawellness`, `/ru/spawellness` yollarını yeniden doğrular. Hata yanıtı `{ "error": "..." }` biçimindedir:

| Kod | Durum |
| --- | --- |
| 401 | Yetkisiz istek |
| 400 | Geçersiz JSON/şema/görsel veya biçimsiz If-Match |
| 415 | Yanlış Content-Type |
| 428 | If-Match eksik |
| 409 | Eski revision; dosya değiştirilmez |
| 413 | İstek boyutu sınırı aşıldı |

409 sonrasında panel güncel bundle/media/revision'ı tekrar GET ile alıp çakışmayı değerlendirmelidir. Tırnaksız hash, zayıf ETag ve yıldız If-Match kabul edilmez. Aynı revision ile iki farklı eşzamanlı değişiklikte yalnızca biri başarılı olur.

`GET /api/azura/spawellness/images` yanıtı:

```json
{
  "images": [
    {
      "image": "/uploads/pages/spawellness/hero.webp",
      "mimeType": "image/webp",
      "size": 123,
      "width": 1876,
      "height": 1038,
      "modifiedAt": "2026-09-19T00:00:00.000Z"
    }
  ]
}
```

Örnekte size/tarih temsildir; gerçek değerler dosyadan okunur. Liste yalnızca `${AZURA_UPLOADS_ROOT}/pages/spawellness/` içindeki uygun dosyaları döndürür. Bozuk/sahte dosyalar ve symlink'ler listelenmez.

`POST /api/azura/spawellness/images` aynı Bearer tokenıyla tek `file` alanlı multipart/form-data kabul eder. Başarıda `201` yanıtı (boyutlar örnektir):

```json
{
  "image": "/uploads/pages/spawellness/spawellness-<sunucu-uuid>.webp",
  "mimeType": "image/webp",
  "size": 123,
  "width": 720,
  "height": 1080
}
```

Ortak medya doğrulaması gerçek JPEG/PNG/WebP, en fazla **8 MiB** ve **16 milyon piksel**, dosya imzası/MIME uyumu ve çözülebilirlik kontrolü uygular. Multipart gövde sınırı 8 MiB + 128 KiB'dir. Kullanıcı dosya adı kullanılmaz; güvenli benzersiz ad sunucuda üretilir. Mevcut dosyanın veya symlink'in üzerine yazılmaz. Tür/imza hatası 415, boyut aşımı 413, bozuk multipart/tek file kuralı ihlali 400 döner. Yükleme spawellness.json'u değiştirmez. Yayın için panel ilgili medya kaydındaki image/width/height alanlarını birlikte değiştirmeli ve dört dilde alt metinlerle page-content PUT yapmalıdır. Paylaşılan yolun tek kaydını değiştirmek diğer medya kayıtlarını otomatik değiştirmez.

Doğrulama: `npm run test:spawellness` ve build sonrası `npm run test:spawellness-http`. API HTTP testi yetki, 400/415/428/409/413, geçersiz istekte bayt koruması, paralel 200/409, yükleyip seçme, dört dilde yayın, metadata ve restart sonrası revision kalıcılığını kapsar. Önceki sayfa HTTP testi ve About/Spor regresyonu korunur. Ortak medya regresyonları için `test:about`, `test:about-http`, `test:restaurants`, `test:restaurants-http`, `test:rooms`, `test:rooms-http`, `test:homepage-api`, `test:homepage-http` çalıştırılır.

### Oda detayları: ilk kalıcı içerik — Deluxe

Yalnızca aktif `/[locale]/rooms/deluxeroom` dönüştürülmüştür. `${AZURA_CONTENT_ROOT}/site-pages/deluxeroom.json` kullanılır; oda liste sayfasına ait `rooms.json` değişmez. `azura-room-detail-content.js` server-only giriş noktası, ortak `readRoomDetailLocale("deluxe", locale)` okuyucusunu sunar. Dosya adı ve medya sahipliği `roomDetailConfig` içindeki sabit izin listesinden gelir; kullanıcı girdisi dosya adına eklenmez. Bu aşamada `deluxe` dışında oda okumak/seed yapmak hata verir. Family/Fantasy verileri ve sayfaları dönüştürülmemiştir.

Kesin başlangıç şeması (tüm gösterilen alanlar zorunlu, ek alanlar reddedilir):

```text
{
  schemaVersion: 1,
  pageKey: "deluxeroom",
  roomKey: "deluxe",
  translations: { tr: LocaleContent, en: LocaleContent, de: LocaleContent, ru: LocaleContent },
  media: {
    hero: Image,
    gallery: { images: [Gallery1, ..., Gallery9] },
    background: Image,
    otherOptions: { images: [FamilyOption, FantasyOption] }
  },
  tours: [
    {id: "land", order: 0, url: KuulaURL},
    {id: "sea", order: 1, url: KuulaURL},
    {id: "partialSea", order: 2, url: KuulaURL}
  ]
}
LocaleContent = {
  subtitle, title, text1, text2, text3,
  RoomInfo: {
    subtitle, title, text, title2, title3, text2,
    amenities: {doubleBed, singleBed, sofa},
    features: {area, dresser, nonSmoking, minibar, safe, hairdryer,
               bathEssentials, teaCoffee, tvWifi, balcony, shower}
  },
  BackgroundSection: {subtitle, title, text},
  RoomTour: {
    land: {subtitle, title, text},
    sea: {subtitle, title, text},
    partialSea: {subtitle, title, text}
  },
  OtherOptions: {
    span, title, buttonText,
    cards: {
      family: {subtitle, title, m, capacity, text},
      fantasy: {subtitle, title, m, capacity, text}
    }
  }
}
Image = {
  image: "/uploads/pages/deluxeroom/<dosya>.jpg",
  width: pozitif tamsayı, height: pozitif tamsayı,
  translations: {tr:{alt}, en:{alt}, de:{alt}, ru:{alt}}
}
GalleryN = {id: "deluxe-gallery-N", order: N-1, ...Image} // N: 1..9
FamilyOption = {id: "family", order: 0, ...Image}
FantasyOption = {id: "fantasy", order: 1, ...Image}
```

Metin yapısındaki bütün yapraklar string'dir. En fazla 4000 karakter, alt açıklamalarda 300 karakter; yalnızca boşluk, HTML etiketi/kontrol karakteri içeren değerler reddedilir. Geçerli baş/son boşluklar aynen korunur. Özellik kimlikleri yukarıdaki 11 anahtardır; `ROOM_FEATURE_IDS` sırası mevcut `RoomFeatures` ikon dizisine eşlenir. İkon/SVG/JSX veride tutulmaz. Galeri, öneri ve tur kimlikleri/sıraları sabittir. Kart başlığı, görseli ve hedef aynı `family`/`fantasy` kimliğiyle eşleşir; serbest URL veya hedef alanı yoktur. `roomDetailLink` kod içindeki izin listesiyle `/rooms/familyroom` ve `/rooms/fantasyroom` üretir; Deluxe kendisini önermez.

Kuula URL'si yalnızca `https://kuula.co/share/collection/<5 alfanümerik karakter>` yapısını kabul eder. Kullanıcı bilgisi, fragment, başka host/protokol/yol ve bilinmeyen/tekrarlanan query parametreleri reddedilir. İzinli parametreler: logo/info/fs/vr/autopalt (0 veya 1), autorotate (pozitif sayısal biçim), autop/thumbs/margin (tam sayı biçimi), alpha (0–1). İlk mevcut URL'nin sonunda bulunan boş `alph` parametresi açık bir geriye uyumluluk istisnasıdır; URL normalize edilmez. Üç mevcut koleksiyon kimliği `7brmW`, `7brpw`, `7bBZw` sırasıyla korunmuştur. Iframe HTML'i saklanmaz; `RoomTour` mevcut iframe davranışını korur. Dış Kuula servisinin ağ erişilebilirliği bu testlerin kapsamında değildir.

| Veri | Görünen bileşen / kaynak mesaj |
| --- | --- |
| subtitle/title/text1..3 + media.hero | SubRoomBanner; DeluxeRoom.subtitle/title/span1..3 |
| media.gallery.images | SubroomCarousel; deluxe1..9, aynı sıra ve modal davranışı |
| RoomInfo | RoomFeatures; DeluxeRoom.RoomFeatures, subtitle2→title2, subtitle3→title3; özellikler sabit kimliklere eşlenir |
| BackgroundSection + media.background | BackgroundSection; yalnızca mevcut subtitle/title/text |
| RoomTour[id] + tours[id].url | Üç RoomTour; span→subtitle ve mevcut diğer metinler |
| OtherOptions + media.otherOptions | İki OtherOptions kartı; area→m, person→capacity, ortak subtitle→kart subtitle |

**Parallax yoktur.** `BackgroundSection` normal CSS cover arka planıdır; kaydırma/parallax işlevi eklenmez. Background düğmesi yorum satırında kalır. Deluxe'ün gönderilmeyen list1/list2 ve buttonText alanları, boş ve gösterilmeyen DeluxeRoom.text, kullanılmayan OtherOptions.span1/span2 yeni içerik olarak eklenmez. Ortak rezervasyon widget'ı Reservation mesajlarını, mevcut telefon ve rezervasyon bağlantısını kullanmayı sürdürür; bu ortak işlevler ve ContactSection2 kapsam dışındadır. Mesaj dosyaları korunur: OtherOptions'ın dönüştürülmemiş kullanımları hâlâ DeluxeRoom.OtherOptions başlık/düğmesini okur.

**Medya sahipliği ve kopyalar:** 13 mantıksal medya kaydı, 10 benzersiz dosya. Galeri ve iki öneri 11 img üretir; hero/background iki CSS arka planıdır (modalın isteğe bağlı tekrar gösterimi ve ContactSection2 hariç).

- `/uploads/pages/deluxeroom/deluxe1.jpg` … `deluxe9.webp`: orijinal uzantılar korunur (`1,2,3,4,8` jpg; `5,6,7,9` webp). İlk görsel hero'da, üçüncü background'da, dördüncü Family önerisinde yeniden kullanılır; ek kopya yoktur.
- `/uploads/pages/room-options/fantasy-preview.jpg`: orijinal Fantasy `fantasy4.jpg` dosyasının ortak öneri görseli kopyasıdır. Sahibi ortak oda öneri medya alanıdır; diğer odalar sonraki geçişte aynı yolu kullanabilir. Family/Fantasy JSON'una veya onların özel medya dizinine yazılmaz.
- Deluxe dosyaları Deluxe'e aittir; ileride başka oda önerileri aynı Deluxe dosyasını referans alabilir. Dosya silme politikası sonraki yönetim aşamasında referansları dikkate almalıdır.

Gerçek ölçüler: deluxe1 2048×1365; deluxe2/3 2048×1367; deluxe4..9 2160×1440; fantasy-preview 2159×1440. Başlangıç dosyaları kaynaklarla bayt düzeyinde aynıdır. Hero/galeri/background yalnızca `pages/deluxeroom` altında olabilir. OtherOptions ayrıca `pages/room-options` kullanabilir. JPEG/PNG/WebP gerçek imzası, çözülebilirlik, 8 MiB/16 milyon piksel ve JSON ölçülerinin dosyayla eşliği kontrol edilir; eksik/sahte/symlink dosya ve yol taşması açık hata verir. Aynı yolun tüm kayıtları doğrulanır, tek okuma içinde tekrar decode edilmez.

Kalıcı kurulum (`client` dizininden; yollar örnektir):

```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads node scripts/seed-persistent-room-details.mjs deluxe
```

Seed JSON için `wx`, görseller için `COPYFILE_EXCL` kullanır; var olan kayıtları veya ortak görsel dosyasını ezmez. Var olan bozuk veri sessizce düzeltilmez. Salt okunur `/uploads/...` sunumu yalnızca iki yeni izinli dizine genişletilmiştir. Sayfa `force-dynamic` olarak her istekte kalıcı JSON'u doğrulayarak okur; dosya değişikliği restart/build olmadan görünür.

**Lago eşlemesi:** Lago'nun `superiorroom.json`, `rooms/superiorroom/page.js`, `SuperiorRoomMediaEditor.jsx`, panel ObjectEditor kullanımı ve `normalizeRoomDetailContent` şeması yalnızca referans olarak okunmuştur. Banner text1..3, RoomInfo başlık/metin alanları, RoomTour subtitle/title/text, OtherOptions span/title/buttonText ve kart m/capacity alanları, hero/gallery/background medya adları eşdeğerdir. Lago'daki madde1..12/list1..3 özellikleri Azura'nın sabit özellik/olanak kimliklerine; numaralı RoomTour alanları üç tur kimliğine; numaralı öneri alanları family/fantasy kartlarına uyarlanmalıdır. Koleksiyon src→image, gerçek width/height ve otel bazlı 9 galeri/3 tur/2 öneri sınırı gerekir. Lago'nun üç önerisi ve parallax'ı Azura'ya taşınmaz. Family (12 galeri/2 tur/ek background listeleri) ve Fantasy (11 galeri/1 tur/farklı olanaklar) daha sonra aynı ortak okuyucunun oda konfigürasyonuyla etkinleştirilmeli; bu aşamada izin listesinde değildir.

**Mevcut tutarsızlıklar korunmuştur:** Family önerisi Deluxe `deluxe4.jpg` kullanır. Rusça Deluxe banner ve RoomFeatures başlıkları Fantasy der; `SСейф`/`Фенr` yazımları da kaynaktaki gibidir. Background metni iki yatak odasından söz eder. İlk tur URL'si `&alph` ile biter. OtherOptions kart açıklaması span1/span2 yerine ortak subtitle'dan gelir. Mobil göstergedeki tanımsız `handleJump` çağrısı yönetim API geçişinde düzeltildi: her gösterge mevcut Embla örneğinin `scrollTo(i)` yöntemini çağırır. Mevcut %33.3 sınıfı ve diğer tasarım sınıfları korunur. Fantasy sayfasının kendisini öneren eski kartı yalnızca tespit edildi; bu görevde o sayfaya dokunulmadı.

**Doğrulama:** `npm run test:room-details`, `npm run lint`, `npm run build`, ardından `npm run test:room-details-http` ve `git diff --check`. Birim testleri dört dil/boşluk eşliği, bayt/ölçü/kimlik/sıra eşliği, hedef eşlemesi, geçersiz oda/özellik/tur/görsel ve seed korumasını kapsar. HTTP testi dört dilde Deluxe yayınını, on URL'nin baytlarını, dokuz galeri/iki öneri sırasını, üç iframe URL'sini, Family/Fantasy/Handicap ortak bileşen regresyonunu ve dosya değişikliğinin restart öncesi/sonrası görünmesini kontrol eder. Piksel karşılaştırması yapılmamıştır; className kaynak eşliği ve production HTML doğrulaması kullanılır.

Son doğrulama (21 Eylül 2026): depolama/seed testleri **6/6**, production HTTP testi **1/1**, lint ve `git diff --check` başarılı. Production build, çalışan geliştirme sunucusunun `.next` çıktısıyla çakışmaması için aynı kaynakların geçici kopyasında başarıyla çalıştırıldı. HTTP sunucusu ve istekleri aynı `localhost` adını kullanır; `-H 127.0.0.1` ile `localhost` karışımı middleware rewrite isteklerinde yönlendirme döngüsüne yol açtığı için test düzeltildi. Uygulamanın routing/middleware kodu değiştirilmedi. İlk denemelerdeki karışmış geliştirme/build çıktısı ve sandbox Google Fonts DNS hatası temiz production doğrulamasında giderildi. Mevcut next lint kaldırılma, birden fazla lockfile ve webpack next-intl cache uyarıları bu değişiklikten bağımsızdır.

### Deluxe oda detay yönetim API'leri

Güncel yönetim izin listesi `roomKey=deluxe` ve `roomKey=family` içerir. Yetkilendirmeden sonra Fantasy/Handicap ve bilinmeyen oda kimlikleri 404 döner. Dosya adı `roomDetailConfig` izin listesinden gelir. Lago, başlangıç metinleri, tur URL'leri ve diğer odaların içerikleri değiştirilmez.

`GET /api/azura/room-details/deluxe/page-content` ve başarılı PUT **yalnızca** şu üç alanı döndürür:

```text
{
  "bundle": {
    "translations": {"tr": LocaleContent, "en": LocaleContent, "de": LocaleContent, "ru": LocaleContent},
    "tours": [
      {"id":"land", "order":0, "url":KuulaURL},
      {"id":"sea", "order":1, "url":KuulaURL},
      {"id":"partialSea", "order":2, "url":KuulaURL}
    ]
  },
  "media": {
    "hero": Image,
    "gallery": {"images": [Gallery1, ..., Gallery9]},
    "background": Image,
    "otherOptions": {"images": [FamilyOption, FantasyOption]}
  },
  "revision": "<64 küçük harf hexadecimal SHA-256>"
}
```

`LocaleContent`, `Image`, `GalleryN`, `FamilyOption` ve `FantasyOption` yukarıdaki kesin şemayla aynıdır. JSON örneğindeki tip adları yer tutucudur; gerçek başlangıç gövdesi `content/site-pages/deluxeroom.json` içindeki translations/tours/media alanlarından oluşur. Metinler 1–4000, alt metinler 1–300 karakter; yalnızca boşluk, HTML ve kontrol karakterleri kabul edilmez, geçerli baş/son boşluklar silinmez. Tur URL sınırı 1500 karakterdir. 11 özellik kimliği, 9 galeri kimliği (`deluxe-gallery-1`…`9`, order 0…8), 3 tur ve `family`→`fantasy` önerileri (order 0→1) zorunludur. Serbest link, iframe, özellik, parallax veya ek bölüm alanı kabul edilmez. Toplam 13 medya kaydı korunur.

İstek örneği (`client` dizini dışında da çalışır; token ortamdan alınır):

```sh
curl -H "Authorization: Bearer $AZURA_PANEL_SERVICE_TOKEN" \
  http://localhost:3000/api/azura/room-details/deluxe/page-content
```

PUT gövdesi **yalnızca** `{ "bundle": <GET.bundle>, "media": <GET.media> }` olmalı; revision gövdeye eklenmez:

```http
PUT /api/azura/room-details/deluxe/page-content
Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>
Content-Type: application/json
If-Match: "<GET.revision>"

{"bundle":{"translations":<dört dil>,"tours":<üç tur>},"media":<tam medya nesnesi>}
```

128 KiB içerik sınırı hem bildirilen Content-Length hem gerçekten okunan byte sayısıyla uygulanır. GET/PUT yanıtları `Cache-Control: no-store` kullanır. Revision kanonik (nesne anahtarları sıralı, diziler sırası korunmuş) bundle+media SHA-256 değeridir; kök metadata dahil değildir ve dosyaya yazılmaz. JSON'un `schemaVersion/pageKey/roomKey` ve diğer kök alanları korunur; API bunları düzenleyemez. Sunucu genelindeki Symbol kayıtlı ortak Promise kuyruğunda dosya yeniden okunur, revision kontrol edilir, bütün görseller yeniden doğrulanır, geçici dosya fsync+rename ile atomik kaydedilir. Hatalı işlem sonraki kayıtları kilitlemez. **Kuyruk yalnızca aynı Node.js sürecini korur; birden fazla worker/instance için ayrı ortak kilit veya veritabanı gerekir.** Başarılı kayıt dört dilde Deluxe yolunu revalidate eder; force-dynamic okuyucu yeni veriyi her istekte okur.

| Kod | Anlam |
| --- | --- |
| 401 | Eksik/geçersiz Bearer token |
| 404 | Etkin olmayan oda kimliği |
| 400 | Geçersiz içerik/görsel veya biçimsiz If-Match |
| 415 | Yanlış Content-Type |
| 428 | Eksik If-Match |
| 409 | Eski revision; dosya değişmez |
| 413 | Gövde sınırı aşıldı |

Token sunucuda yapılandırılmamışsa mevcut API'lerle tutarlı 503 döner. Diğer hatalar `{ "error": "..." }` biçimindedir.

`GET/POST /api/azura/room-details/deluxe/images` aynı Bearer yetkisini ve oda izin listesini kullanır. GET yanıtı:

```json
{"images":[{"image":"/uploads/pages/deluxeroom/deluxe1.jpg","mimeType":"image/jpeg","size":123,"width":2048,"height":1365,"modifiedAt":"2026-09-21T00:00:00.000Z"}]}
```

`size` ve tarih örnektir; gerçek dosya bilgileri döner. GET yalnızca `pages/deluxeroom/` ve `pages/room-options/` köklerindeki güvenli, geçerli görselleri listeler; alt dizin, sahte dosya ve symlink listelenmez. Ortak görseller yalnızca `media.otherOptions.images` içinde seçilebilir; hero/galeri/background için reddedilir. Başka oda dizini veya istemciden gelen dizin parametresi kullanılmaz.

POST yalnızca tek `file` alanlı multipart kabul eder. Sunucu dosya adını üretir, yalnızca `${AZURA_UPLOADS_ROOT}/pages/deluxeroom/` dizinine yazar. Ortak dosyalara yazmaz, mevcut dosyayı ezmez. JPEG/PNG/WebP gerçek imza ve decode kontrolü, 8 MiB/16 milyon piksel sınırı uygulanır. Multipart sınırı 8 MiB + 128 KiB; geçersiz tür 415, bozuk/ek alan 400, boyut aşımı 413 döner.

```sh
curl -H "Authorization: Bearer $AZURA_PANEL_SERVICE_TOKEN" \
  -F 'file=@oda.jpg' http://localhost:3000/api/azura/room-details/deluxe/images
```

201 yanıtı (modifiedAt olmadan):

```json
{"image":"/uploads/pages/deluxeroom/<sunucu-adi>.jpg","mimeType":"image/jpeg","size":123,"width":800,"height":600}
```

Yükleme JSON'u değiştirmez. Yayın için ilgili medya kaydının `image`, `width`, `height` değerleri birlikte içerik PUT'unda seçilir; dört dilde alt metinler de korunmalı/güncellenmelidir.

Testler: `npm run test:room-details` depolama, kuyruk ve gerçek OtherOptions bileşeninin derlenmiş tıklama işleyicisini kontrollü Embla örneğiyle doğrular. Bu test tarayıcı/piksel testi değildir. `npm run test:room-details-production` kaynakları geçici dizine kopyalar (node_modules paylaşılır, .next/.env kopyalanmaz), orada production build ve HTTP testini çalıştırır; çalışan dev sunucusunun build çıktısına dokunmaz. HTTP testi yetki/oda izin listesi, hatalı isteklerin dosyayı koruması, 200/409 paralel kayıt, yükleyip seçme, ortak görsel kuralları, dört dil ve restart sonrası revision/içerik kalıcılığını kapsar.

Bu API geçişinin doğrulama sonucu (21 Eylül 2026): oda/etkileşim/medya testleri **9/9**, izole production build ve API+sayfa HTTP testi **1/1**, lint ve `git diff --check` başarılı. Ortak medya/About/Spa/restoran/oda regresyon grubu **30/33**: restoran Almanca list2 içindeki mevcut `hetheth` ve oda liste verisindeki mevcut `azure` ekleri nedeniyle üç eski metin eşliği testi başarısızdır. İlgili içerik, mesaj ve test dosyaları bu görevde değiştirilmedi; medya güvenliği testleri geçti. Gerçek tarayıcıda mobil dokunma veya piksel karşılaştırması yapılmadı; tıklama testi gerçek derlenmiş bileşenin olay işleyicisini kontrollü Embla API'siyle çalıştırır, dört oda sayfası da production HTTP regresyonundan geçer.

### Family oda detayları — yalnızca kalıcı okuma

Family artık `${AZURA_CONTENT_ROOT}/site-pages/familyroom.json` üzerinden aynı `readRoomDetailLocale("family", locale)` ve server-only giriş noktasını kullanır. Yukarıdaki ilk Deluxe geçişindeki “Family dönüştürülmedi” notu tarihsel kapsamı anlatır; güncel okunabilir odalar `deluxe` ve `family`'dir. **İlk okuma geçişinde Family yönetimi kapalıydı; aşağıdaki yönetim adımıyla mevcut ortak API Family için de etkinleştirildi.** Güncel `roomDetailApiConfig` izin listesi Deluxe ve Family içerir; genel içerik API okuma/yazma fonksiyonları da bu kontrolü yapar. Kopya route veya ayrı depolama sistemi yoktur.

Kesin Family şeması:

```text
{
  schemaVersion: 1, pageKey: "familyroom", roomKey: "family",
  translations: {tr: FamilyTexts, en: FamilyTexts, de: FamilyTexts, ru: FamilyTexts},
  media: {
    hero: Image,
    gallery: {images: [{id:"family-gallery-1",order:0,...Image}, ...,
                       {id:"family-gallery-12",order:11,...Image}]},
    background: Image,
    otherOptions: {images: [{id:"deluxe",order:0,...Image},
                           {id:"fantasy",order:1,...Image}]}
  },
  tours: [{id:"land",order:0,url:KuulaURL}, {id:"sea",order:1,url:KuulaURL}]
}
FamilyTexts = {
  subtitle, title, text1, text2, text3,
  RoomInfo: {
    subtitle, title, text, title2, title3, text2,
    amenities: {doubleBed, singleBed, sofa},
    features: {area, dresser, nonSmoking, minibar, safe, hairdryer,
               bathEssentials, teaCoffee, tvWifi, balcony, shower}
  },
  BackgroundSection: {subtitle, title, text, list1, list2},
  RoomTour: {land:{subtitle,title,text}, sea:{subtitle,title,text}},
  OtherOptions: {
    span, title, buttonText,
    cards: {deluxe:{subtitle,title,m,capacity,text},
            fantasy:{subtitle,title,m,capacity,text}}
  }
}
Image = {image,width,height,translations:{tr:{alt},en:{alt},de:{alt},ru:{alt}}}
```

Bütün metin yaprakları string'dir. Genel Deluxe sınırları (4000 karakter metin, 300 alt, 1500 tur URL'si, 8 MiB/16 milyon piksel, gerçek tür/ölçü doğrulaması) aynen geçerlidir. Fazladan metin/medya alanları reddedilir; mevcut kök metadata korunabilir. İkonlar kodda kalır; 11 özellik sırası Deluxe ile aynıdır. Galeri/tur/öneri kimlikleri ve background alanları oda konfigürasyonundan doğrulanır.

| Aktif bileşen | Family verisi ve Deluxe farkı |
| --- | --- |
| SubRoomBanner | subtitle/title/text1..3 + hero; ilk Family görseli |
| SubroomCarousel | 12 görsel (Deluxe 9), family-gallery-1…12 |
| RoomFeatures | Aynı 11 ikon; Family metinleri ve doubleBed/singleBed/sofa |
| BackgroundSection | subtitle/title/text **ve görünür list1/list2**; üçüncü Family görseli |
| RoomTour | land→sea: **2 tur**, koleksiyonlar 71LrW→715J7; URL/query aynen korunur |
| OtherOptions | **Deluxe→Fantasy**, iki kart; hedefler kodda /rooms/deluxeroom ve /rooms/fantasyroom |

Parallax yoktur. Arka plan düğmesi yorum satırında kalır. Kullanılmayan FamilyRoom.text, BackgroundSection.buttonText, OtherOptions.span1/span2 taşınmaz. Reservation widget ve ContactSection2 değişmez. Ortak bileşenler değiştirilmemiştir; mevcut mobil scrollTo düzeltmesi korunur. Mesaj anahtarları bu geçişte kaldırılmamıştır.

**Medya:** 16 kullanım (hero 1 + galeri 12 + background 1 + öneri 2), **14 benzersiz dosya**. 12 Family dosyası `/uploads/pages/familyroom/family1.webp`…`family12.jpg` altındadır; orijinal uzantılar korunur (2,6,11,12 jpg; diğerleri webp). Hero galeri1'i, background galeri3'ü paylaşır. Diğer iki yol `/uploads/pages/room-options/deluxe-preview.jpg` ve mevcut `fantasy-preview.jpg`'dir. Bu adım 12 Family ve 1 ortak Deluxe kopyası ekler; mevcut Fantasy kopyasını tekrar üretmez. Ortak Deluxe kopyasının kaynağı deluxe4.jpg; bu ortak öneri alanına aittir. Family'nin başka odanın özel dizinini okumasına izin açılmaz. Ortak dizin yalnızca önerilerde kabul edilir. Deluxe'ün mevcut JSON veya görselleri taşınmaz/değiştirilmez. Tüm kopyaların bayt ve gerçek ölçü eşliği test edilir; orijinaller silinmez.

Kurulum (`client` içinde):

```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads node scripts/seed-persistent-room-details.mjs family
```

Aynı seed betiği oda konfigürasyonuyla çalışır; yeni depolama/seed sistemi yoktur. `wx`/`COPYFILE_EXCL` mevcut Family, Deluxe ve ortak dosyaları ezmez. Salt okunur medya sunumuna familyroom izinli dizini eklenmiştir. Family sayfası force-dynamic okur; dosya değişikliği build/restart gerektirmez.

**Bilerek korunan mevcut tutarsızlıklar:** İlk önerinin hedefi ve görseli Deluxe iken FamilyRoom.OtherOptions.title1/text1 alanları Aile Odası anlatır. İsteğin metin eşliği şartı nedeniyle aynen taşınır; kimliği/hedefi `deluxe` olarak kalır, Family kendisine bağlantı vermez. OtherOptions bölüm başlığı/düğmesi eski ortak bileşende DeluxeRoom.OtherOptions'tan okunuyordu; başlangıç değerleri gerçekten görünen bu kaynaktan alınır. Almanca FamilyRoom.RoomFeatures.feature1 yoktur; mevcut next-intl ekranda `FamilyRoom.RoomFeatures.feature1` döndürür. Bu gerçek görünen metin `features.area` içinde saklandı; 50 m² gibi tahmini bir çeviri eklenmedi. Rusça `SСейф`/`Фенr`, diller arasında Fantasy 50/58 m² farkı ve diğer boşluklar korunmuştur.

Doğrulama: `npm run test:room-details`, `npm run test:room-details-production`, `npm run lint`, `git diff --check`. Family testleri dört dilde görünür eşlik (eksik Almanca anahtar dahil), dosya eşliği, oda şeması, API kapalı kalması ve tekrar seed korumasını kapsar. Ortak production HTTP testi Family/Deluxe metin ve görsellerini, iki/dokuz/on iki öğelik koleksiyonları, dört dilde Family JSON değişikliğinin restart öncesi/sonrası görünmesini, Deluxe API 200/409 ve Family yönetim API'lerinin 404 kalmasını, Fantasy/Handicap regresyonlarını kontrol eder. Production build geçici dizinde çalışır; geliştirme sunucusunun .next dizinine dokunmaz. Piksel karşılaştırması yapılmamıştır.

Family geçişi test sonucu: Family'ye özel **4/4** test geçti; toplam oda/etkileşim grubu **12/13**. Tek başarısız test eski Deluxe mesaj eşliği testidir: HEAD'de zaten bulunan `Deluxe Oda herhrt`, `Sigara İçilmez het` ve subtitle son boşluğu eski mesajlarla farklıdır. Deluxe JSON ve mesaj dosyaları bu geçişte değiştirilmedi. İzole production build, genişletilmiş HTTP testi **1/1**, lint ve `git diff --check` başarılı. Family page.js className değerleri önceki sürümle birebir karşılaştırıldı; ortak bileşenler değiştirilmedi.


### Family yönetimi — güncel Lago sözleşmesi

Aynı dinamik route'lar çalışır:

- `GET/PUT /api/azura/room-details/family/page-content`
- `GET/POST /api/azura/room-details/family/images`

Tüm yöntemlerde `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` zorunludur. Yalnızca deluxe/family yönetilebilir; diğer kimlikler geçerli yetkiyle 404 döner. GET ve başarılı PUT yanıtı tam olarak şöyledir:

```text
{
  "bundle": {
    "translations": {"tr": FamilyTexts, "en": FamilyTexts, "de": FamilyTexts, "ru": FamilyTexts},
    "tours": [{"id":"land","order":0,"url":KuulaURL},
              {"id":"sea","order":1,"url":KuulaURL}]
  },
  "media": {
    "hero": Image,
    "gallery": {"images": [{"id":"family-gallery-1","order":0,...Image}, ...,
                           {"id":"family-gallery-12","order":11,...Image}]},
    "background": Image,
    "otherOptions": {"images": [{"id":"deluxe","order":0,...Image},
                               {"id":"fantasy","order":1,...Image}]}
  },
  "revision": "<64 karakter küçük harf hexadecimal SHA-256>"
}
```

`FamilyTexts` ve `Image` yukarıdaki kesin Family şemasıdır. `BackgroundSection` **subtitle/title/text/list1/list2** ister. Dört dil, 11 özellik, üç olanak, 12 galeri, iki tur, iki öneri ve toplam **16 medya kaydı** korunur. Parallax yoktur. Deluxe şeması ayrı oda konfigürasyonunda kalır; Family sınırları Deluxe'e uygulanmaz.

```http
PUT /api/azura/room-details/family/page-content
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "<GET revision>"

{"bundle":{"translations":<tam dört dil nesnesi>,"tours":<iki tur dizisi>},"media":<tam medya nesnesi>}
```

PUT yalnızca bundle/media kabul eder; gövdede revision, metadata veya kimlik düzenleme alanı yoktur. 128 KiB; metin 4000, alt 300, tur URL 1500 karakter sınırları ve geçerli boşlukları koruma davranışı aynıdır. Hatalar 401 yetkisiz, 404 oda kapalı, 400 geçersiz veri/If-Match, 415 Content-Type, 428 eksik If-Match, 409 eski revision, 413 boyut aşımıdır. Token yapılandırılmamışsa 503. GET/PUT no-store döner.

Revision yalnızca odanın kanonik bundle+media içeriğine aittir; dosyaya yazılmaz. Ortak kuyrukta o odanın dosyası tekrar okunur, revision kontrol edilir ve atomik kaydedilir. schemaVersion/pageKey/roomKey ve ek kök alanlar korunur. Family kaydı Deluxe dosyasını veya revision'ını değiştirmez. Başarılı kayıt, oda konfigürasyonundaki pageKey üzerinden dört dilde `/rooms/familyroom` sayfasını revalidate eder; force-dynamic okuma yeni içeriği gösterir. **Kuyruk yalnızca aynı Node.js sürecindeki işlemleri korur; çok süreç/instance için ayrıca ortak kilit gerekir.**

Görsel GET:

```json
{"images":[{"image":"/uploads/pages/familyroom/<dosya>.jpg","mimeType":"image/jpeg","size":123,"width":800,"height":600,"modifiedAt":"2026-09-21T00:00:00.000Z"}]}
```

POST tek file alanlı multipart kabul eder:

```sh
curl -H "Authorization: Bearer $AZURA_PANEL_SERVICE_TOKEN" \
  -F 'file=@family.jpg' http://localhost:3000/api/azura/room-details/family/images
```

201 yanıtı:

```json
{"image":"/uploads/pages/familyroom/<sunucu-adi>.jpg","mimeType":"image/jpeg","size":123,"width":800,"height":600}
```

Örnek sayısal değerlerin yerine gerçek dosya bilgileri döner. JPEG/PNG/WebP, 8 MiB ve 16 milyon piksel; gerçek tür/decode/ölçü doğrulaması, symlink koruması ve mevcut dosyayı ezmeyen sunucu adı kullanılır. Multipart sınırı 8 MiB + 128 KiB. Yükleme yalnızca `${AZURA_UPLOADS_ROOT}/pages/familyroom/` altına yapılır. GET yalnızca Family ve room-options köklerindeki geçerli dosyaları listeler; Deluxe veya başka odaların özel dizinlerini göstermez. Ortak görseller yalnızca öneri kartlarında seçilir; hero/galeri/background alanlarında reddedilir. Ortak dizine yükleme yapılmaz. Yükleme JSON'u değiştirmez: yayın için image/width/height içerik PUT'unda birlikte seçilir.

Test verileri yalnızca geçici content/uploads dizinlerine yazılır. `npm run test:room-details-production` ayrı build dizini kullanır. Family HTTP kontrolleri token, 400/404/409/413/415/428, hatada dosya koruma, paralel 200/409, Family+Deluxe paralel 200/200, yükleme/listeleme/seçme, ortak medya sınırlaması, dört dilde yayın ve restart sonrası içerik/revision kalıcılığını kapsar. Önceki “Family 404” testleri yalnızca Fantasy/Handicap/bilinmeyen odalar için devam eder. Seed koruma testleri aynen çalışır. Mevcut hatalı görünen Family öneri metni ve Almanca çeviri anahtarı değiştirilmemiştir.

Family yönetim geçişi doğrulama sonucu: Family testleri **5/5**, Family + mevcut homepage/oda medya güvenliği grubu **11/11**, toplam oda/etkileşim grubu **13/14**. Tek eski başarısızlık, Deluxe JSON ile eski mesajlar arasındaki `herhrt`/`het`/boşluk farkını kontrol eden metin eşliği testidir; bu içerikler değiştirilmedi. İzole production build ve genişletilmiş Family+Deluxe API HTTP testi **1/1**, lint ve `git diff --check` başarılı. Testler gerçek içerikleri değiştirmeden geçici dizinlerde çalıştı. Tasarım, ContactSection2, Lago ve mevcut Family çeviri tutarsızlıkları değiştirilmedi.

### Fantasy kalıcı okuma — ortak oda sözleşmesi

Fantasy de aynı `schemaVersion:1` oda detay sözleşmesini, `azura-room-detail-storage.mjs` okuyucu/doğrulamasını, server-only `azura-room-detail-content.js` girişini ve `seed-persistent-room-details.mjs` betiğini kullanır. Yeni depolama veya form sistemi yoktur. Okunabilir odalar Deluxe/Family/Fantasy; **yönetilebilir odalar yalnızca Deluxe/Family**. Fantasy page-content GET/PUT ve images GET/POST geçerli token ile 404 döner.

Kesin Fantasy yapısı (metinlerde gösterilen yapraklar string, bütün alanlar zorunludur):

```text
{
  schemaVersion: 1, pageKey: "fantasyroom", roomKey: "fantasy",
  translations: {tr: RoomTexts, en: RoomTexts, de: RoomTexts, ru: RoomTexts},
  media: {
    hero: Image,
    gallery: {images: [{id:"fantasy-gallery-1",order:0,...Image}, ...,
                       {id:"fantasy-gallery-11",order:10,...Image}]},
    background: Image,
    otherOptions: {images: [{id:"deluxe",order:0,...Image},
                           {id:"family",order:1,...Image}]}
  },
  tours: [{id:"sea",order:0,url:KuulaURL}]
}
RoomTexts = {
  subtitle, title, text1, text2, text3,
  RoomInfo: {
    subtitle, title, text, title2, title3, text2,
    amenities: {couples, kingBed, jacuzziTerrace},
    features: {area, dresser, nonSmoking, minibar, safe, hairdryer,
               bathEssentials, teaCoffee, tvWifi, balcony, shower}
  },
  BackgroundSection: {subtitle, title, text, list1, list2},
  RoomTour: {sea: {subtitle, title, text}},
  OtherOptions: {
    span, title, buttonText,
    cards: {deluxe: {subtitle,title,m,capacity,text},
            family: {subtitle,title,m,capacity,text}}
  }
}
Image = {image,width,height,translations:{tr:{alt},en:{alt},de:{alt},ru:{alt}}}
```

Kök, bölüm, dil, görsel, koleksiyon, sıra ve hedef bağlantı sözleşmesi diğer odalarla aynıdır. Sadece `amenityIds`, galeri/tur/öneri kimlikleri ve background alanları oda konfigürasyonunda tanımlanır; Deluxe/Family JSON şeması değiştirilmez. Fantasy'nin üç olanağı couples/kingBed/jacuzziTerrace'dir; eski span1/span2/span3 değerleri aynı yatak/yatak/havuz ikonlarına aktarılır, sofa gösterilmez. Ayrı Fantasy bileşeni, SVG verisi, HTML, serbest bağlantı veya parallax alanı eklenmez. Ortak 4000 karakter metin, 300 karakter alt, 1500 karakter güvenli Kuula URL sınırları ve gerçek JPEG/PNG/WebP, 8 MiB/16 milyon piksel kontrolleri korunur.

| Bölüm | Aktif veri ve fark |
| --- | --- |
| SubRoomBanner | subtitle/title/text1..3; fantasy1.webp |
| SubroomCarousel | 11 öğe, fantasy-gallery-1…11, order 0…10 |
| RoomFeatures | Aynı 11 özellik ikonu, Fantasy'ye ait üç olanak, sofa=false |
| BackgroundSection | Metin + iki görünür liste maddesi, fantasy3.webp; parallax yok |
| RoomTour | Tek sea turu; Kuula koleksiyonu 7brLW, query parametreleri aynen korunur |
| OtherOptions | deluxe→family; iki sabit hedef /rooms/deluxeroom ve /rooms/familyroom |

**Öneri düzeltmesi ve metin eşliği:** Eski ikinci kart Fantasy'yi kendisine öneriyordu. Kullanıcının “Fantasy kendisini önermesin” talebi doğrultusunda yalnızca bu öneri Family ile değiştirildi. Yeni Family kartı, mevcut DeluxeRoom.OtherOptions içindeki Family başlık/alan/kapasite/açıklama metinlerini ve Family family1.webp görselini kullanır; yeni metin yazılmaz. İlk kart Deluxe'e bağlanmasına rağmen FantasyRoom.OtherOptions.title1/text1 içinde Family anlatır; bu mevcut tutarsızlık değiştirilmez. Bölüm başlığı/düğmesi eski ortak bileşenin gerçekten kullandığı DeluxeRoom.OtherOptions değerlerinden alınır. Bunların dışında görünür Fantasy metinleri baş/son boşluklarıyla aynıdır. Almanca çift kapanış parantezi, Rusça SСейф/Фенr ve çevrilmemiş Fantasy Room başlıkları korunur. Görünmeyen FantasyRoom.text, BackgroundSection.buttonText ve OtherOptions.span1/span2 aktarılmaz; yorumdaki düğme açılmaz. Messages dosyaları ve ContactSection2 değişmez.

**Medya:** 15 kullanım = hero 1 + galeri 11 + background 1 + öneri 2; **13 benzersiz dosya**. Hero galeri1'i, background galeri3'ü kullanır. 11 özgün Fantasy kopyası `/uploads/pages/fantasyroom/` altında orijinal dosya adı/uzantısıyla tutulur. Öneriler mevcut `/uploads/pages/room-options/deluxe-preview.jpg` ve yeni `/uploads/pages/room-options/family-preview.webp` kullanır. Ortak dosyalar ezilmez; başka odanın özel dizinine erişim açılmaz. Fantasy'nin diğer odalarda kullanılan eski ortak fantasy-preview.jpg dosyası korunur; Fantasy'nin kendi galeri dosyası oda sahipliği için özel dizinde kalır. Kaynak dosyalar silinmez; kopyalar bayt ve gerçek ölçü testinden geçer.

```sh
# client dizininden; yalnızca eksik JSON/görsel dosyalarını kurar
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads node scripts/seed-persistent-room-details.mjs fantasy
```

`${AZURA_CONTENT_ROOT}/site-pages/fantasyroom.json` force-dynamic sunucu okumasıyla bileşenlere aktarılır. Önceden metinler next-intl'den ve görseller statik importlardan geliyordu; şimdi aynı görsel yapı ve bileşen props'ları kalıcı JSON'dan gelir. Shared rezervasyon widget ve iletişim bileşeni kendi mevcut kaynaklarını kullanmayı sürdürür. Seed aynı wx/COPYFILE_EXCL korumasıyla çalışır. Salt okunur uploads sunumuna yalnızca fantasyroom eklenmiştir.

**Sonraki aşama önerisi — uygulanmadı:** Aynı `/api/azura/room-details/fantasy/page-content` GET/PUT sözleşmesi `{bundle:{translations,tours},media,revision}` ile yönetim izin listesine eklenebilir. Bearer, application/json, tırnaklı If-Match, 128 KiB, ortak process kuyruğu ve atomik kayıt kuralları değişmemeli. `/images` GET/POST aynı liste/yükleme nesnesini kullanmalı; yüklemeler yalnızca fantasyroom, ortak öneriler yalnızca seçilebilir olmalı. Bu aşamada iki endpoint'in tüm yöntemleri 404 kalır; panel bağlantısı kurulmamıştır.

Testler: `test:room-details` Fantasy başlangıç/boşluk ve öneri kaynağı eşliği, 15/13 medya, sıra/kimlik/tur, bozuk/eksik JSON, yanlış alan/ölçü/yol, symlink ve tekrar seed korumasını kapsar. `test:room-details-production` izole build altında dört dilde Fantasy metin/görsel/tur yayınını, dosya değişikliğinin restart öncesi/sonrası görünmesini, Deluxe/Family sayfa ve API regresyonlarını ve Fantasy API 404 sınırını doğrular. Ortak medya testindeki sıfır fstat boyutu regresyonu korunur. Ortak bileşen dosyaları değiştirilmedi; Family/Deluxe sözleşmesi aynı kaldı. Piksel karşılaştırması yapılmadı.

Fantasy geçişi sonucu (22 Eylül 2026): Fantasy'ye özel **4/4**, ortak medya güvenliği ve sıfır fstat regresyonu **7/7**, toplam oda testleri **17/18** geçti. Tek eski başarısızlık Deluxe JSON'daki `herhrt`/`het` ve boşluk farklarının eski mesajlarla eşliğidir; ilgili içerik değiştirilmedi. İzole production build, genişletilmiş HTTP testi **1/1**, lint ve `git diff --check` başarılı. Fantasy page.js className değerleri eski sürümle birebir doğrulandı; piksel karşılaştırması yapılmadı.

### Fantasy yönetimi — güncel durum

Önceki Fantasy bölümündeki “salt okunur / API 404” ifadeleri ilk veri dönüşümünün durumudur. Artık mevcut ortak API yönetim izin listesi **deluxe, family, fantasy** içerir. Handicap ve bilinmeyen kimlikler 404 kalır. Aynı oda JSON'u, bileşenler ve veri sözleşmesi kullanılır; sayfa tasarımı/başlangıç içeriği değişmez, Lago henüz bağlanmamıştır.

- `GET/PUT /api/azura/room-details/fantasy/page-content`
- `GET/POST /api/azura/room-details/fantasy/images`

Bütün yöntemler `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` gerektirir. GET ve başarılı PUT yanıtı tam olarak:

```text
{
  "bundle": {
    "translations": {"tr":RoomTexts,"en":RoomTexts,"de":RoomTexts,"ru":RoomTexts},
    "tours": [{"id":"sea","order":0,"url":KuulaURL}]
  },
  "media": {
    "hero":Image,
    "gallery":{"images":[{"id":"fantasy-gallery-1","order":0,...Image}, ...,
                         {"id":"fantasy-gallery-11","order":10,...Image}]},
    "background":Image,
    "otherOptions":{"images":[{"id":"deluxe","order":0,...Image},
                              {"id":"family","order":1,...Image}]}
  },
  "revision":"<64 karakter küçük harf hexadecimal SHA-256>"
}
```

RoomTexts/Image yukarıdaki kesin Fantasy şemasıyla aynıdır; değişmemiştir. 11 özellik, üç amenities anahtarı (couples/kingBed/jacuzziTerrace), 11 galeri, tek sea turu, deluxe→family önerileri ve 15 medya kaydı oda konfigürasyonundan doğrulanır. BackgroundSection subtitle/title/text/list1/list2 içerir; parallax yoktur.

```http
PUT /api/azura/room-details/fantasy/page-content
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "<GET revision>"

{"bundle":{"translations":<dört dilin tam metinleri>,"tours":<tek tur>},"media":<tam medya>}
```

Yalnızca bundle/media gövdesi kabul edilir. 128 KiB, metin 4000, alt 300, güvenli Kuula URL 1500 karakter sınırları aynıdır. Revision kanonik bundle+media hash'idir; kök metadata dahil değildir ve JSON'a yazılmaz. Kuyruk içinde ilgili oda dosyası yeniden okunur, revision karşılaştırılır ve atomik yazılır; diğer kök alanlar ve diğer odalar korunur. Başarılı PUT dört dilin Fantasy yolunu revalidate eder. **Ortak kuyruk yalnızca aynı Node.js sürecini korur; çok süreç için ayrı ortak kilit gerekir.** 401/404/400/415/428/409/413 ve no-store davranışı korunur; eski revision dosyayı değiştirmez. Token yapılandırılmamışsa 503.

Medya GET `{images:[{image,mimeType,size,width,height,modifiedAt}]}` döndürür. Liste yalnızca fantasyroom ve room-options köklerindeki geçerli dosyalardır; Deluxe/Family özel dizinleri dahil değildir. Ortak görseller sadece önerilerde seçilebilir, hero/galeri/background için reddedilir.

```sh
curl -H "Authorization: Bearer $AZURA_PANEL_SERVICE_TOKEN" \\
  -F 'file=@fantasy.jpg' http://localhost:3000/api/azura/room-details/fantasy/images
```

POST tek file alanlı multipart kabul eder; 201 yanıtı:

```json
{"image":"/uploads/pages/fantasyroom/<sunucu-adi>.jpg","mimeType":"image/jpeg","size":123,"width":800,"height":600}
```

Sayılar örnektir; gerçek dosya ölçü/boyut bilgileri döner. JPEG/PNG/WebP, 8 MiB/16 milyon piksel, gerçek tür/decode, güvenli ad, symlink koruması ve üzerine yazmama kuralları aynıdır. Multipart sınırı 8 MiB + 128 KiB'dir. Ortak dizine veya başka odanın özel dizinine yükleme yapılmaz. Yükleme JSON'u değiştirmez; yayın için image/width/height içerik PUT'unda birlikte seçilir. Önceki sıfır fstat boyutu düzeltmesi korunur.

Testler geçici content/uploads ve izole production build kullanır. Fantasy için yetki/oda izinleri, 400/415/428/409/413, dosya koruma, paralel 200/409, yükleme/listeleme/seçme, ortak görsel sınırları, kök metadata, dört dil ve restart sonrası revision kalıcılığı kontrol edilir. Deluxe/Family API ve sayfa kontrolleri aynı HTTP testinde sürer. Seed ve mevcut içerik eşliği testleri korunur; gerçek düzenlenmiş içeriklere test yazması yapılmaz.

Fantasy API doğrulama sonucu: Fantasy testleri **5/5**, ortak medya güvenliği/sıfır fstat regresyonu **7/7**, toplam oda testleri **18/19** geçti. Tek eski başarısızlık Deluxe JSON'daki herhrt/het/boşluk farklarının eski mesajlarla eşliğidir; içerikler değiştirilmedi. İzole production build ve kapsamlı üç oda HTTP testi **1/1**, lint ve git diff --check başarılı. Yönetim izni değiştiği için eski Family testindeki “Fantasy 404” beklentisi Handicap 404 olarak güncellendi. Sayfa bileşenlerinde bu API adımı için ek değişiklik gerekmedi; Lago bağlantısı, commit ve deploy yapılmadı.

## Spor: kalıcı içerik ve yönetim API’si

Aktif route `app/[locale]/spor/page.js`, `/tr/spor`, `/en/spor`, `/de/spor`,
`/ru/spor` adreslerinde çalışır. Önceden `messages/{locale}.json` içindeki
`Sport` metinlerini ve yerel statik görselleri okurdu. Artık `force-dynamic`
sunucu sayfası, `azura-spor-content.js` server-only girişinden
`readSporPageLocale` çağırır; doğrulanmış metinleri ve `{src,width,height,alt}`
görselleri aynı bileşenlere verir. Mevcut sınıflar, sıralama, gizli düğmeler ve
ContactSection2 değişmedi. Mesaj anahtarları silinmedi.

### Tam veri sözleşmesi ve görünür alan eşlemesi

`content/site-pages/spor.json` başlangıç verisidir. Kalıcı dosya
`${AZURA_CONTENT_ROOT}/site-pages/spor.json`, medya dizini
`${AZURA_UPLOADS_ROOT}/pages/spor/` olur. Ortak `resolveAzuraPaths` geliştirme
varsayılanlarını ve production ortam değişkenlerini kullanır.

Aşağıdaki gösterimde `Group` tam olarak `{subtitle:string,title:string,text:string}`,
`Image` ise `{image:string,width:integer,height:integer,translations:{tr:{alt:string},
en:{alt:string},de:{alt:string},ru:{alt:string}}}` anlamına gelir:

```text
{
  schemaVersion: 1,
  pageKey: "spor",
  translations: {
    tr/en/de/ru: {
      hero: Group,
      info: {
        intro: Group,
        sauna: Group,
        wellness: {subtitle,title,text,list1,list2,list3,list4}
      },
      gallery: Group,
      types: {
        fitness: Group,
        personalTrainer: {title:string,text:string}
      }
    }
  },
  media: {
    hero: Image,
    info: {wellness:Image,sauna:Image},
    gallery: {images:[
      {id:"spor-gallery-1",order:0,...Image},
      {id:"spor-gallery-2",order:1,...Image},
      {id:"spor-gallery-3",order:2,...Image}
    ]},
    types: {fitness:Image,personalTrainer:Image}
  }
}
```

| JSON alanı | Bileşen / eski kaynak |
| --- | --- |
| `hero` | BannerDark; `Sport.subtitle/title/text` |
| `info.intro` | SpaInfoSection ilk metin grubu; `InfoSection.*1` |
| `info.sauna` | SpaInfoSection sol görsel üzeri; `InfoSection.*2` |
| `info.wellness` | SpaInfoSection sağ görsel üzeri; `InfoSection.*3` ve görünür `list1…4` |
| `gallery` | SpaHeaderSection; `GallerySection` |
| `types.fitness` | SpaTypesInfoSection; `SpaTypes.*2` |
| `types.personalTrainer` | SpaReverseInfo; `SpaTypes.title1/text1` |

`info.wellness/sauna` isimleri Spa formunun mevcut yapısal yuvalarıyla uyumludur;
Spor sayfasına sauna/hamam içeriği eklenmiş değildir. Panel bu yuvaların
etiketlerini Spor için değiştirmelidir. Form yapılandırması: dört liste maddesi,
üç galeri öğesi, `fitness/personalTrainer` tür anahtarları; personalTrainer üst
başlık alanı yok. Spa’da beş galeri, yedi liste maddesi ve dört masaj kartı vardır.
Spor şemasında `massage` kabul edilmez. Galeri kimlikleri ve sıra kesin olarak
yukarıdaki gibidir; liste kimlikleri mevcut sözleşmeyle `list1…list4` anahtarlarıdır.

### Medya, doğrulama ve seed

Sekiz medya kaydı altı benzersiz kaynak dosyasını kullanır:

| Kalıcı dosya (`/uploads/pages/spor/`) | Orijinal (`app/[locale]/spor/images/`) | Kullanım |
| --- | --- | --- |
| fitness-centre.jpg | fitnessBanner.jpg | hero ve info.sauna |
| group-fitness.jpg | group_fit.jpg | info.wellness |
| table-tennis.jpg | table_ten.jpg | galeri 1 ve personalTrainer |
| dumbbells.jpg | gallery_orta.jpg | galeri 2 |
| treadmills-4800x3200.jpg | gallery_sag.jpg | galeri 3; orantılı küçültme |
| aqua-fitness.jpg | aqua.jpg | fitness |

Alt açıklamaları dört dilde görselin gerçek içeriğini anlatır. Orijinaller
korunur. Ortak `azura-page-content-validation.mjs`, Spa’dan çıkarılan kesin
alan/metin/medya doğrulayıcılarını ve güvenli dosya okumasını paylaşır;
Spor kendi bölüm şemasını tanımlar, Spa şeması gevşetilmez.
Metinler boş olamaz, en fazla 4000 karakterdir; alt metin en fazla 300 karakterdir.
Kontrol karakterleri reddedilir, baştaki/sondaki boşluklar değiştirilmez.
Dört dil ve tanımlı alt anahtarlar eksiksiz olmalıdır; fazladan alt alanlar reddedilir.
Medya yalnızca Spor dizinindeki güvenli dosya adlarını kabul eder;
JPEG/PNG/WebP imzası, çözülebilirlik, dosya boyutu, gerçek ölçüler ve symlink
kontrolleri uygulanır. Eksik/bozuk JSON veya görsel açık hata verir; statik
kaynağa veya başka sayfaya sessiz dönüş yoktur.

```sh
AZURA_CONTENT_ROOT=/kalici/azura/content \
AZURA_UPLOADS_ROOT=/kalici/azura/uploads npm run seed:spor
```

Seed yalnızca eksik dosyaları `COPYFILE_EXCL` ve JSON’u `wx` ile ekler.
Mevcut JSON ve görselleri ezmez; işlem sonunda kalıcı veriyi doğrular.
Salt okunur `/uploads/pages/spor/...` sunumu etkindir. Yönetim/yükleme sözleşmesi aşağıdadır.

### Korunan mevcut tutarsızlıklar

- Eski sayfa son bölüme `sspan` gönderiyordu, bileşen `span` okuyordu.
  `Sport.SpaTypes.subtitle1` hiç görünmüyordu. Görünmeyen üst başlık bu şemaya
  alınmadı ve etkinleştirilmedi; eski mesajda duruyor.
- “Fitness Merkezi” tanıtımı su jimnastiği fotoğrafı, “Kişisel Eğitmen” tanıtımı
  masa tenisi fotoğrafı kullanmaya devam eder. Galeri de masa tenisiyle başlar.
- Giriş metninde masaj/hamam/sauna anlatımı mevcut metnin parçasıdır; Spor’a
  masaj bölümü veya yeni bir işlev eklenmedi.

### Kontroller ve sonraki adım önerisi

`npm run test:spor` metin/boşluk eşliğini, kaynak baytlarını, ölçüleri,
kimlikleri/sırayı, geçersiz veriyi ve tekrar seed’i sınar.
`npm run test:spor-production` ayrı geçici proje/build kullanır; düzenlenmiş
kalıcı içeriğe veya çalışan geliştirme sunucusunun `.next` dizinine dokunmaz.
Dört dilin HTTP çıktısı, görsel URL’leri, restart öncesi/sonrası JSON değişikliği,
Spa/About regresyonları ve mevcut Spa API HTTP testleri çalışır.
Piksel karşılaştırması yapılmadı; ortak bileşen dosyaları değiştirilmedi.

**Uygulanan Spor API sözleşmesinin özeti:**

- Bearer servis tokenıyla `GET /api/azura/spor/page-content` →
  `{bundle: translations, media, revision: "64 küçük harf SHA-256"}`.
- Aynı adres `PUT`, yalnızca `{bundle,media}`, JSON Content-Type,
  tırnaklı `If-Match`, 128 KiB sınırı; ortak kuyruk içinde yeniden okuma,
  revision kontrolü, diğer kök alanları koruyan atomik yazma.
  401/400/415/428/409/413 davranışı mevcut Spa API’siyle aynı olmalı.
- `GET /api/azura/spor/images` → `{images:[{image,mimeType,size,width,height,modifiedAt}]}`;
  `POST` tek `file` multipart → 201 `{image,mimeType,size,width,height}`.
  Yeni yüklemeler yalnızca Spor dizinine; dosyayı yüklemek içeriği yayınlamaz.
  Yayın için içerik PUT’unda seçilir. Yeni yüklemelerde mevcut 8 MiB / 16 milyon
  piksel güvenlik sınırları korunmalı.

Panel bağlandığında yalnızca kalıcı JSON güncellenir; sayfa ve bileşenlerin
tekrar dönüştürülmesi gerekmez.

Spor galeri 3 için onaylı dönüşüm: orijinal `gallery_sag.jpg` (5472×3648)
korundu; yeni `treadmills-4800x3200.jpg` 4800×3200 (15.360.000 piksel)
olarak kırpılmadan, otomatik yön düzeltmesi ve JPEG kalite 95 / 4:4:4 ile
üretildi. JSON ölçüleri çıktı dosyasından okundu. Yalnızca bu kopyada bayt eşliği
beklenmez; diğer beş benzersiz kaynakta bayt eşliği zorunludur. 16 milyon piksel
sınırı değişmedi; hash kontrollü okuma istisnası yoktur.

Eski `treadmills.jpg` dosyasının üzerine yazılmadı. Seed yalnızca yeni adı ekler.
Daha önce kurulmuş kalıcı `spor.json`, eski `/uploads/pages/spor/treadmills.jpg`
yolunu içeriyorsa seed bu JSON’u değiştirmez: `media.gallery.images[2]` kaydının
`image` alanını `/uploads/pages/spor/treadmills-4800x3200.jpg`, `width` alanını
4800, `height` alanını 3200 olarak ayrıca güncellemek gerekir. Eski dosya
19,96 milyon piksel olduğu için güncellenmeden doğrulama hatası vermeye devam
eder. Bu görevde gerçek kalıcı kurulum dosyaları değiştirilmedi.

Son doğrulama (23 Eylül 2026): Spor birim testleri 5/5, Spa 8/8, ortak medya
7/7; izole production Spor HTTP 1/1, Spa sayfa/API HTTP 2/2 başarılı.
Production build, lint ve `git diff --check` geçti. Test edilen gruplarda
başarısız test yok. Next lint kullanım dışı bırakılma/çoklu lockfile ve webpack
next-intl önbellek uyarıları mevcut; derlemeyi engellemedi. Piksel karşılaştırması
yapılmadı. Kullanılan altı benzersiz dosyaya ek olarak eski, artık JSON'un
referans vermediği `treadmills.jpg` yerinde korundu; seed bu eski dosyayı taşımaz.


### Spor API: Lago entegrasyonu için kesin sözleşme

`GET/PUT /api/azura/spor/page-content` ve `GET/POST /api/azura/spor/images`
mevcut `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` gerektirir.
Yanıtlar `Cache-Control: no-store` kullanır. Token yok/yanlış ise 401;
sunucuda token yapılandırılmamışsa mevcut API yaklaşımıyla 503 döner.

İçerik GET ve başarılı PUT yanıtı tam olarak:

```json
{
  "bundle": { "tr": {}, "en": {}, "de": {}, "ru": {} },
  "media": {},
  "revision": "<64 karakter küçük harf SHA-256>"
}
```

Buradaki boş nesneler aşağıdaki **zorunlu** alanların yer tutucularıdır;
gerçek istek/yanıtta boş olamaz. Her dilin tam metin alanları:

```text
hero: {subtitle, title, text}
info:
  intro: {subtitle, title, text}
  sauna: {subtitle, title, text}
  wellness: {subtitle, title, text, list1, list2, list3, list4}
gallery: {subtitle, title, text}
types:
  fitness: {subtitle, title, text}
  personalTrainer: {title, text}
```

Her değer string, en fazla 4000 karakter; boş/yalnızca boşluk ve kontrol
karakterleri geçersizdir. Geçerli baş/son boşluklar korunur. Alt metinler
1–300 karakterdir. Eksik/fazla dil veya alt alanlar, `massage`, görünmeyen
personalTrainer `subtitle` alanı ve beşinci liste maddesi reddedilir.

Sekiz medya kaydının kesin JSON yolları ve başlangıç dosyaları:

| JSON yolu | `/uploads/pages/spor/` altındaki dosya |
| --- | --- |
| `media.hero` | fitness-centre.jpg |
| `media.info.wellness` | group-fitness.jpg |
| `media.info.sauna` | fitness-centre.jpg |
| `media.gallery.images[0]` | table-tennis.jpg |
| `media.gallery.images[1]` | dumbbells.jpg |
| `media.gallery.images[2]` | treadmills-4800x3200.jpg |
| `media.types.fitness` | aqua-fitness.jpg |
| `media.types.personalTrainer` | table-tennis.jpg |

Her kayıt `{image,width,height,translations:{tr:{alt},en:{alt},de:{alt},ru:{alt}}}`.
Galeri kayıtları ayrıca değişmez `id/order` içerir:
`spor-gallery-1/0`, `spor-gallery-2/1`, `spor-gallery-3/2`.
Görsel yolları yalnızca `/uploads/pages/spor/` altında olabilir; pozitif tam
sayı ölçüler gerçek dosya ile eşleşmelidir. Gerçek JPEG/PNG/WebP, en fazla
8 MiB ve 16 milyon piksel; symlink veya bozuk görsel kabul edilmez.

Lago kayıt akışı: GET yanıtından revision’ı sakla; yanıtın yalnızca bundle ve
media alanlarını PUT gövdesine koy (revision’ı gövdeye ekleme):

```http
PUT /api/azura/spor/page-content
Authorization: Bearer <servis-tokenı>
Content-Type: application/json
If-Match: "<GET revision>"

{"bundle": <dört dilin yukarıdaki tam metin nesneleri>, "media": <sekiz tam medya kaydı>}
```

Başarılı 200 yanıt güncel `{bundle,media,revision}` döndürür. Eksik If-Match
428, biçimsiz başlık/geçersiz JSON veya şema/görsel 400, yanlış Content-Type
415, eski revision 409, 128 KiB üstü gövde 413. Gövde sınırı hem bildirilen
uzunluk hem gerçekten okunan baytlar üzerinden kontrol edilir.

Revision doğrulanmış bundle+media’nın kanonik SHA-256 özetidir; nesne anahtar
sırası etkisiz, koleksiyon sırası anlamlıdır. JSON’a revision yazılmaz.
Dosya başına process genelindeki ortak kuyruk içinde güncel JSON yeniden
okunur, revision karşılaştırılır, yalnızca translations/media değiştirilir.
Diğer kök alanlar korunur; geçici dosya + fsync + rename ile atomik kayıt
uygulanır. Başarısız işlem kuyruğu kilitlemez. **Kuyruk yalnızca aynı Node.js
sürecini korur; birden fazla worker/instance için dağıtık kilit veya veritabanı
gerekir.** Başarılı kayıt `/tr/spor`, `/en/spor`, `/de/spor`, `/ru/spor`
yollarını yeniden doğrular; sayfa ayrıca force-dynamic okur.

Görsel GET yanıtı:

```json
{"images":[{"image":"/uploads/pages/spor/spor-<uuid>.jpg","mimeType":"image/jpeg","size":123,"width":800,"height":600,"modifiedAt":"2026-09-23T00:00:00.000Z"}]}
```

POST tek `file` alanlı multipart/form-data ister; dosya adını sunucu üretir.
201 yanıtı `{image,mimeType,size,width,height}`; `modifiedAt` içermez.
Başka sayfanın dizinine yazılamaz; dosyalar üzerine yazılmadan kaydedilir.
Yükleme spor.json’u değiştirmez. Yayın için yükleme yanıtındaki yol ve gerçek
ölçüler bir medya kaydına birlikte atanıp içerik PUT’u gönderilir.
Listeleme gerçek baytları doğrulamaya devam eder; `FileHandle.stat()` sıfır
boyut bildirse de geçerli dosya atlanmaz. Eski 19,96 milyon piksellik
`treadmills.jpg`, sahte dosyalar ve symlink’ler listede bulunmaz.

Yerel aktif içerik kontrolü: Next ortam dosyaları yüklendikten sonra çözümlenen
`client/content/site-pages/spor.json` ve `client/public/uploads` doğrulamadan
geçti. Üçüncü galeri yeni dosyayı 4800×3200 kullanıyor; içerik değiştirilmedi.
Uzak production kurulumu bu kontrol kapsamında değildir. Eski kalıcı dosya
kullanan bir kurulumda yukarıdaki geçiş notu hâlâ geçerlidir; seed kullanıcı
JSON’unu ezmez.

API ekleme doğrulaması (23 Eylül 2026): Spor birim 6/6 (kanonik revision ve
kuyruk sonrası toparlanma dahil), Spa birim 8/8, ortak medya 7/7 geçti.
İzole production build ardından Spor sayfa/API HTTP 2/2 ve Spa sayfa/API HTTP
2/2 geçti. Spor listesindeki altı geçerli başlangıç dosyası HTTP üzerinden
listelendi ve URL’leri açıldı; eski büyük dosya/sahte/symlink kayıtları atlandı.
Yetki, şema, boyut, 200/409 paralel kayıt, yükleyip seçme, dört dilde yayın,
metadata koruması ve restart sonrası revision kalıcılığı doğrulandı.
Lint ve `git diff --check` başarılı. Bu test gruplarında başarısız test yok.
Testler yalnızca geçici içerik ve uploads dizinlerine yazdı.

## Beach & Pools: kalıcı içerik ve yönetim API’leri

Aktif kaynak `app/[locale]/beachpools/page.js`. Gerçek yerelleştirilmiş yollar:
`/tr/plaj-havuz`, `/en/beach-pool`, `/de/strand-pool`, `/ru/plaj-basseyn`.
Sayfa `force-dynamic`; server-only `azura-beachpools-content.js` üzerinden
`readBeachPoolsPageLocale` ile doğrulanmış JSON’u okur. Metinler artık
`content/site-pages/beachpools.json` başlangıç verisinden kurulacak kalıcı
`${AZURA_CONTENT_ROOT}/site-pages/beachpools.json` içinde tutulur.
Görseller `${AZURA_UPLOADS_ROOT}/pages/beachpools/` altındadır.

### Kesin şema

Aşağıda `Group` tam olarak `{subtitle:string,title:string,text:string}` demektir.
`Image` tam olarak `{image:string,width:integer,height:integer,translations:{tr:{alt:string},en:{alt:string},de:{alt:string},ru:{alt:string}}}`;
`Background` yalnızca `{image:string,width:integer,height:integer}` içerir.
Banner ve hover CSS arka planları alt metin tüketmediğinden `translations.alt`
eklenmemiştir; bu alanlar background şemasında kabul edilmez.

```text
{
 schemaVersion: 1,
 pageKey: "beachpools",
 translations: {
  tr/en/de/ru: {
   hero: Group,
   info: {subtitle,title,text,span,list1,list2,list3},
   activities: {subtitle,title,text,cards:{
    activity1:{title,span},activity2:{title,span},
    activity3:{title,span},activity4:{title,span}
   }},
   video: Group,
   pools: {subtitle,title,text,cards:{
    main:{subtitle,title,text,outdoor,area,depth},
    indoor:{subtitle,title,text,outdoor,area,depth},
    kids:{subtitle,title,text,outdoor,area,depth},
    aqua:{subtitle,title,text,outdoor,area,depth},
    indoorKids:{subtitle,title,text,outdoor,area,depth}
   }}
  }
 },
 media: {
  hero:{desktopBackground:Background},
  info:{primary:Image,secondary:Image},
  activities:{
   activity1:{id:"activity1",order:0,...Image},
   activity2:{id:"activity2",order:1,...Image},
   activity3:{id:"activity3",order:2,...Image},
   activity4:{id:"activity4",order:3,...Image}
  },
  pools:{
   main:{id:"main",order:0,image:Image,hover:Background},
   indoor:{id:"indoor",order:1,image:Image,hover:Background},
   kids:{id:"kids",order:2,image:Image,hover:Background},
   aqua:{id:"aqua",order:3,image:Image,hover:Background},
   indoorKids:{id:"indoorKids",order:4,image:Image,hover:Background}
  }
 }
}
```

Kart metinleri ve görseller aynı sabit anahtardan birleştirilir; nesnenin JSON
içindeki yazılış sırasına güvenilmez. Kimlikler ve `order` değerleri doğrulanır.
Metin/alt metin sınırları 4000/300 karakterdir; boş, eksik/fazla dil veya alan,
kontrol karakteri, güvensiz yol, yanlış tür/ölçü, eksik/sahte/symlink dosya
reddedilir. Geçerli metin boşlukları korunur. JPEG/PNG/WebP, 8 MiB ve 16 milyon
piksel sınırları aynıdır; bu sayfada sınır aşan dosya veya istisna yoktur.
Ortak doğrulama yardımcısına yalnızca CSS kayıtları için açık `withAlt=false`
seçeneği eklendi; diğer sayfalar için varsayılan zorunlu alt şeması korunur.
Eksik/geçersiz kalıcı veride statik kaynağa sessiz dönüş yapılmaz.

### Bileşen ve medya eşleşmesi

| Alan | Görünür bileşen / eski kaynak |
| --- | --- |
| hero | BannerDark; BeachPools.subtitle/title/text; banner.webp |
| info | ClinaryInfoSection; TwoImageSection; primary=blok2.jpg, secondary=blok1.jpg |
| activities | Beach3 → Slider2; BeachCarousel; dört kart |
| video metinleri | Beach4; BeachGif |
| pools | Beach5; PoolSection; beş normal/hover çifti |

Aktiviteler sırayla `activity1…4`: `Group427319248.jpg`, `Group427319247.jpg`,
`Group427319249.jpg`, `Group427319250.jpg`. Başlangıç alt metni dört dilde
ilgili kart başlığından alınır. Slider2 mevcut döngü davranışıyla bu dört kartı
DOM’da iki kez oluşturur; yeni kart eklenmemiştir. Slider2’ye yalnızca opsiyonel
alt prop desteği eklendi, yoksa eski başlık davranışı sürer.

| Havuz kimliği / sıra | Normal orijinal (`Images/hoversız/`) | Hover orijinal (`Images/hover/`) |
| --- | --- | --- |
| main / 0 | beach4.jpg | beach3.jpg |
| indoor / 1 | beach1.jpg | beach2.jpg |
| kids / 2 | beach5.jpg | beach5.jpg |
| aqua / 3 | beach3.jpg | beach4.jpg |
| indoorKids / 4 | beach2.jpg | beach1.jpg |

Kalıcı dosyalar: `hero.webp`, `info-primary.jpg`, `info-secondary.jpg`,
`activity1.jpg…activity4.jpg`, `pool-main.jpg/pool-main-hover.jpg`,
`pool-indoor.jpg/pool-indoor-hover.jpg`, `pool-kids.jpg/pool-kids-hover.jpg`,
`pool-aqua.jpg/pool-aqua-hover.jpg`, `pool-indoorKids.jpg`.
Son havuzun kaynak normal ve hover dosyalarının baytları aynı olduğundan aynı
kalıcı dosya iki alanda kullanılır. **17 mantıksal medya kullanımı / 16 benzersiz
dosya** vardır; carousel ve responsive DOM tekrarları bu sayıya dahil değildir.
Bütün kopyalar bayt düzeyinde aynı; orijinaller korunmuştur. Gerçek ölçüler
JSON’dan doğrulanır; kartların mevcut 349×233 ve slider’ın 360×540 sunum ölçüleri,
sınıfları ve animasyonları değiştirilmez.

### Video ve korunmuş davranışlar

Tek video `/videos/azuramob2.mp4`; mobil/masaüstü aynı element ve kaynağı
kullanır. autoPlay, loop, muted, playsInline, object-cover/object-center,
loading ve Türkçe tarayıcı fallback metni aynen korunur. Video medya JSON’una
konulmadı, kopyalanmadı ve yönetilebilir yapılmadı. `translations.video`
yalnızca videonun üzerindeki üç görünür metindir. İleride ayrı bir sözleşmede
izinli video yolu, MIME, dosya boyutu, codec/süre sınırları, isteğe bağlı poster
ve responsive kaynaklar kararlaştırılmalı; ham iframe/HTML kabul edilmemeli.
Bu görev video yükleme veya doğrulama altyapısı eklemez.

- ClinaryInfoSection `span` değerini liste başlığı değil ilk liste maddesi olarak
  gösterir: span + list1…3 = dört madde. Liste mobilde gizlidir, korunur.
- Havuzlar masaüstünde 2+3 grid ve hover; mobilde beş kartlı carousel, hover
  istatistikleri olmadan gösterilir. Bağlantılar `showLink=false`, etkinleştirilmedi.
- Kapalı havuzlar dahil tüm hover kartlarında mevcut `outdoor` (Açık) etiketi
  korunur; kullanılmayan `indoor` ve `span1…5` alanları taşınmadı.
- İlk aktivitenin Yüzme & Dinlenme başlığı ile Kokteyller & Atıştırmalıklar
  etiketi dahil mevcut metin eşleşmeleri düzeltilmedi.
- Beach5 mobil göstergesindeki tanımsız `handleJump(i)` çağrısı API adımında
  `emblaApi?.scrollTo(i)` ile düzeltildi. Mevcut carousel, sınıflar ve kart sırası korunur.
- Kullanılmayan BeachMobile, harita/grafik/wave/cabana görselleri kapsama alınmadı.
- ContactSection2 ve Form değiştirilmedi. Form `isOpen` verilmediği için görünmez;
  mevcut ESC işleyicisinde `onClose` verilmemiş olması da ayrı mevcut sorundur.
- Mesaj anahtarları silinmedi. Ortak ClinaryInfoSection dosyası değiştirilmedi.

### Lago referansı ve sınırlar

Salt okunur incelenen Lago dosyaları:
`client/content/site-pages/beachpools.json`,
`client/app/[locale]/panel/icerikler/BeachPoolsMediaEditor.jsx` ve bu editörü
bağlayan `page.js`. `info.primary/secondary`, `activities.activity1…4`,
`pools.<id>.image/hover` ve `hero.desktopBackground` alan adları uyumludur.
Azura tek hero arka planını her ekran boyutunda kullanır; Lago’nun ayrı mobil
arka planı, başlık grafiği, dalga katmanı ve cabana arka planı eklenmedi.
Lago dokuz havuz bekliyor, Azura beş; `main/indoor/aqua` ortak, `kids/indoorKids`
Azura yapılandırmasıdır. Formda otel bazlı izinli alanlar/kimlikler, gerçek ölçüler,
CSS alanlarında alt metin göstermeme ve metin bundle eşlemesi gerekir.
Lago reposuna yazılmadı.

### Kurulum, test ve sonraki adım

```sh
AZURA_CONTENT_ROOT=/kalici/azura/content \
AZURA_UPLOADS_ROOT=/kalici/azura/uploads npm run seed:beachpools
npm run test:beachpools
npm run test:beachpools-production
```

Seed `COPYFILE_EXCL` ve `wx` ile yalnızca eksik dosyaları kurar; tekrarında
mevcut JSON/görselleri ezmez. Salt okunur medya sunumu beachpools dizinini
kabul eder. Production testleri ayrı geçici checkout/build ve içerik/uploads
kullanır; çalışan dev sunucusunun `.next` çıktısını veya kullanıcı içeriğini
değiştirmez. Dört dil, kaynak baytları/ölçüler, kart kimlikleri/sırası/hover
çiftleri, video kodu, geçersiz veri, seed koruması, HTTP ve restart kontrol edilir.
Piksel karşılaştırması ve gerçek tarayıcı hover/video oynatma testi yapılmadı.

**Uygulanan sözleşmenin özeti:**
`GET/PUT /api/azura/beachpools/page-content` → `{bundle,media,revision}`;
bundle yukarıdaki dört dil metinleri, media mevcut şema, revision kanonik SHA-256.
Bearer token, tırnaklı If-Match, 128 KiB, ortak kuyruk/atomik kayıt ve mevcut
401/400/415/428/409/413 davranışları kullanılmalı. Yayında gerçek yerelleştirilmiş
dört yol revalidate edilmeli.
`GET/POST /api/azura/beachpools/images`: mevcut güvenli görsel sözleşmesi;
video kabul edilmez. Kesin API ayrıntıları aşağıdadır.

Lago metin referansı (`client/messages/tr.json → BeachPools`) aynı birebir
bundle değildir: mevcut `ClinaryInfoSection` Azura `info`, `Carousel` Azura
`activities`, `PoolSection/PoolList` Azura `pools` alanlarına adapter ile
bağlanmalıdır. Lago’nun `mobileTitle`, `buttonText` ve `ImageBackground`
alanları Azura’ya eklenmedi; video metinleri Azura’ya özgü `video` grubundadır.

Doğrulama sonucu: Beach & Pools 6/6, Spa 8/8, ortak medya 7/7 başarılı.
Spor regresyonları 5/6; tek hata mevcut `spor.json` Türkçe `hero.subtitle`
sonundaki boşluğun eski mesajla eşleşmemesi (`" FORMUNUZU KORUYUN "` /
`" FORMUNUZU KORUYUN"`). Spor JSON’u bu görevde değiştirilmedi; kullanıcı
metinlerini test geçirmek için düzeltmedik. Toplam 26/27 birim testi geçti.
İzole production build başarılı; Beach HTTP 1/1, Spa HTTP 2/2 başarılı.
Beach HTTP testinde dört dil, 16 dosyanın URL/bayt eşliği, kart/hover sırası,
video URL ve playback attribute’ları, restart kalıcılığı; Restaurants/About/Spa
sayfaları doğrulandı. Lint ve `git diff --check` geçti. Beş değişen görünüm
dosyasındaki className değerleri ve Beach4 video bloğu HEAD ile birebir
karşılaştırıldı; değişmedi. Gerçek tarayıcı hover ve piksel testi yapılmadı.


### Beach & Pools API — Lago bağlantısı

Her iki uçtaki bütün yöntemler mevcut
`Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` gerektirir.
Token yok/yanlışsa 401; sunucuda yapılandırılmamışsa mevcut ortak davranışla 503.
Yanıtlar `Cache-Control: no-store` taşır.

`GET /api/azura/beachpools/page-content` ve başarılı PUT yanıtı tam olarak:

```text
{ "bundle": <beachpools.json.translations>,
  "media": <beachpools.json.media>,
  "revision": "<64 küçük harf hexadecimal SHA-256>" }
```

Yukarıdaki kesin JSON şemasındaki bütün tr/en/de/ru metin alanları zorunludur.
`video` yalnızca subtitle/title/text grubudur; video yolu, HTML veya dosya alanı
kabul edilmez. Kart anahtarları, id/order ve medya alt alanları değişmedi.
PUT yalnızca `{bundle,media}` gövdesini kabul eder:

```http
PUT /api/azura/beachpools/page-content
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "<GET revision>"

{"bundle": <GET bundle nesnesinin düzenlenmiş tamamı>, "media": <GET media nesnesinin düzenlenmiş tamamı>}
```

Başarı 200 güncel bundle/media ve yeni revision döndürür. `revision` gövdeye
veya kalıcı dosyaya yazılmaz. Eksik If-Match 428, biçimsiz başlık/geçersiz
JSON/şema/görsel 400, yanlış Content-Type 415, eski revision 409, 128 KiB üstü
gövde 413. Gövde sınırı Content-Length ve gerçek okunan baytlarda uygulanır.
Metinler 1–4000, alt açıklamalar 1–300 karakter; yalnızca boşluk ve kontrol
karakterleri reddedilir. Geçerli baş/son boşluklar korunur.

Medya alanlarının **tam yolları** (N=alt metinli normal görsel, B=alt metinsiz
CSS arka planı):

```text
media.hero.desktopBackground       B
media.info.primary                 N
media.info.secondary               N
media.activities.activity1         N + id:"activity1", order:0
media.activities.activity2         N + id:"activity2", order:1
media.activities.activity3         N + id:"activity3", order:2
media.activities.activity4         N + id:"activity4", order:3
media.pools.main.image              N
media.pools.main.hover              B
media.pools.indoor.image            N
media.pools.indoor.hover            B
media.pools.kids.image              N
media.pools.kids.hover              B
media.pools.aqua.image              N
media.pools.aqua.hover              B
media.pools.indoorKids.image        N
media.pools.indoorKids.hover        B
```

N: `{image,width,height,translations:{tr:{alt},en:{alt},de:{alt},ru:{alt}}}`.
B: `{image,width,height}`; B’ye translations/alt eklenmesi reddedilir.
Aktivitelerde id/order doğrudan görsel kaydı üzerindedir. Havuzlarda
`media.pools.<key>` **üst kaydı** `{id,order,image,hover}` biçimindedir;
image ve hover alt kayıtlarına id/order konmaz. Havuz kimlik/sırası:
main/0 → indoor/1 → kids/2 → aqua/3 → indoorKids/4.

Kanonik revision doğrulanmış bundle+media’dan hesaplanır. Aynı dosyaya yazma
ortak process kuyruğunda yapılır: kilit içinde güncel dosya okunur, revision
karşılaştırılır; yalnızca translations/media değişir. schemaVersion, pageKey
ve diğer kök alanlar korunur. Görseller yeniden doğrulanır; fsync+rename ile
atomik kayıt yapılır. Başarısız işlem kuyruğu kilitlemez. **Bu kuyruk yalnızca
aynı Node.js sürecini korur; çoklu worker/instance için ayrı kilit gerekir.**
Başarılı PUT gerçek `/tr/plaj-havuz`, `/en/beach-pool`, `/de/strand-pool`,
`/ru/plaj-basseyn` yollarını revalidate eder. Ortak HTTP yardımcısına yalnızca
bu yerelleştirilmiş yolları geçebilmek için opsiyonel yol listesi eklendi;
Spa ve Spor’un varsayılan davranışı değişmedi.

`GET /api/azura/beachpools/images`:

```json
{"images":[{"image":"/uploads/pages/beachpools/beachpools-<uuid>.jpg","mimeType":"image/jpeg","size":123,"width":800,"height":600,"modifiedAt":"2026-09-23T00:00:00.000Z"}]}
```

Aynı adrese POST tek `file` alanlı multipart/form-data kabul eder.
201 yanıt `{image,mimeType,size,width,height}`; modifiedAt içermez.
Yalnızca gerçek JPEG/PNG/WebP, en fazla 8 MiB ve 16 milyon piksel kabul edilir.
Dosya adı sunucudan gelir; mevcut dosyaya yazılmaz. Scope yalnızca
`/uploads/pages/beachpools/`; başka sayfa dizini, symlink ve sahte dosya
reddedilir. Önceki sıfır FileHandle.stat boyutu düzeltmesi aynen korunur;
nihai boyut kontrolü okunan baytlardadır.

Yükleme içerik JSON’unu değiştirmez. Panel normal/hover seçiminde yükleme
veya liste yanıtından image/width/height değerlerini ilgili kayda birlikte
aktarır. Normal kaydın dört dil alt metinleri korunur/düzenlenir; hover’a alt
metin eklenmez. Yayın için içerik PUT’u gerekir. `/videos/azuramob2.mp4`, video
oynatma kodu ve kapalı havuzlardaki Açık etiketi değiştirilmedi.

Mobil düzeltme testi gerçek Beach5 JSX’ini derleyip beş göstergenin click
handler’ını çalıştırır; mevcut Embla mock’una 4,0,3,1,2 indekslerinin sırayla
iletildiğini ve API hazır değilken hata çıkmadığını doğrular. Gerçek tarayıcı
carousel/hover testi veya piksel karşılaştırması yapılmadı.

Beach API adımı doğrulaması: Beach birim 6/6 + mobil gösterge 1/1; Spa 8/8,
ortak medya 7/7; Spor 5/6 (yukarıda belgelenen mevcut son boşluk farkı).
Toplam 27/28; yeni başarısızlık yok. İzole production build, Beach sayfa/API
HTTP 2/2, Spa HTTP 2/2, Spor HTTP 2/2 başarılı. HTTP’de 16 başlangıç dosyası
listelendi ve URL’leri açıldı; yüklenen görsel normal ve hover alanlarında
seçilerek dört dilde yayınlandı. 200/409 paralel kayıt, hatalarda dosyanın
korunması, metadata, video kaynağı ve restart sonrası revision doğrulandı.
Lint ve git diff --check başarılı. Başlangıç/kullanıcı içerikleri değiştirilmedi.

Bu API adımının dosyaları: yeni `app/api/azura/beachpools/page-content/route.js`
ve `images/route.js`; güncellenen `lib/azura-beachpools-storage.mjs`,
`lib/azura-homepage-media.mjs`, `lib/azura-page-api.js`; tek davranış düzeltmesi
`Beach5.jsx`; yeni `azura-beachpools-api-http.test.mjs` ve
`azura-beachpools-indicator.test.mjs`; test komutları için package.json ve
`scripts/test-beachpools-production.mjs`; bu README. Diğer kirli dönüşüm
dosyaları önceki kalıcı içerik adımına aittir.

## Kids Club: kalıcı içerik ve yönetim API’leri

Aktif `app/[locale]/kidsclub/page.js`, `azura-kidsclub-content.js` server-only girişinden
`azura-kidsclub-storage.mjs` okuyucusunu çağırır. `force-dynamic` sayesinde dosya değişiklikleri
sonraki istekte okunur. ContactSection2 ve mesaj dosyaları değiştirilmedi. Ortak CuisinesCarousel yalnızca mobil gösterge düzeltmesini içerir.
Kaynaklar: `content/site-pages/kidsclub.json`, `public/uploads/pages/kidsclub/`.
Kalıcı kurulum:

```sh
AZURA_CONTENT_ROOT=/persistent/content AZURA_UPLOADS_ROOT=/persistent/uploads npm run seed:kidsclub
```

Hedefler `AZURA_CONTENT_ROOT/site-pages/kidsclub.json` ve
`AZURA_UPLOADS_ROOT/pages/kidsclub/`. Seed JSON'u `wx`, görselleri `COPYFILE_EXCL` ile
**yalnızca yoklarsa** oluşturur; mevcut düzenlemeleri ezmez. Ardından mevcut dosyaları doğrular;
geçersiz mevcut içeriği otomatik onarmaz. Gerçek içerikleri değiştirmeyen testler:
`npm run test:kidsclub`, `npm run test:kidsclub-production` (izole kopyada build + HTTP).

### Kesin sözleşme

Kök `{schemaVersion:1,pageKey:"kidsclub",translations:{tr,en,de,ru},media}`.
Aşağıdaki şekil her dil için aynıdır; nesnelerde belirtilmeyen alt alanlar reddedilir:

```text
translations.<locale>
  hero: {subtitle,title,text}
  info: {subtitle,title,text}
  icons: {environment,activities,social,staff}
  activities: {subtitle,title,text,items:{
    activity1:{title,repeatTitle}, activity2:{title,repeatTitle},
    activity3:{title,repeatTitle}, activity4:{title,repeatTitle},
    activity5:{title,repeatTitle}
  }}
  pools: {subtitle,title,text,cards:{
    slide:{subtitle,title,text}, children:{subtitle,title,text},
    indoor:{subtitle,title,text}
  }}
  moments: {title}

media
  hero: CSSImage
  info: {primary:Image,secondary:Image}
  activities: {items:{activity1:OrderedImage,...,activity5:OrderedImage}}
  pools: {slide:OrderedImage,children:OrderedImage,indoor:OrderedImage}
  moments: {images:[OrderedImage,OrderedImage,OrderedImage]}

CSSImage = {image,width,height}
Image = {image,width,height,translations:{tr:{alt},en:{alt},de:{alt},ru:{alt}}}
OrderedImage = {id,order,...Image}
```

Metin sınırı 4000, alt metin 300 karakter; boş/kontrol karakterli değerler reddedilir,
trim uygulanmaz. Yalnızca `activity4/5.repeatTitle` boş olabilir (mevcut görünüm).
Dört dil zorunludur. Görseller gerçek JPEG/PNG/WebP, en fazla 8 MiB / 16 milyon piksel;
boyutları gerçek dosyayla eşleşmelidir. Başka sayfa yolları, yol taşması, symlink,
bozuk/eksik dosya veya JSON açık hata üretir. Önceki gerçek okunan bayt doğrulaması korunur.

| Görünür bileşen | Metin | Medya |
|---|---|---|
| BannerDark | hero | hero (CSS; alt alanı yok) |
| ClinaryReverseInfo | info | info.secondary arkada, info.primary önde |
| KidsIconsSection | icons | Sabit dört SVG kodda kalır |
| KidsclubCarousel | activities | activities.items; beş öğe iki kez render edilir |
| CuisinesCarousel | pools | pools; slide → children → indoor |
| KidsMomentCarousel | moments.title | moments.images; üç öğe |

`id/order`, etkinlik ve havuzların **medya kaydında** bulunur; metinler aynı nesne anahtarıyla
birleşir. Etkinlikler `activity1…activity5`, sıra `0…4`; havuzlar `slide,children,indoor`,
sıra `0…2`; moments `kidsclub-moment-1…3`, sıra `0…2`. Kimlikler/sıralar sabittir.

### Tam medya yolları ve sahiplik

Aşağıdaki tüm dosya adlarının öneki `/uploads/pages/kidsclub/`:

| JSON alanı | Dosya | Orijinal (`kidsclub/images/` altında) |
|---|---|---|
| media.hero | club-main.webp | kids4.webp |
| media.info.primary | club-play.webp | kids3.webp |
| media.info.secondary | club-main.webp | kids4.webp |
| media.activities.items.activity1 | activity-1.jpg | submenu/childactivite.jpg |
| media.activities.items.activity2 | activity-2.jpg | submenu/ballpool.jpg |
| media.activities.items.activity3 | activity-3.jpg | submenu/babyroom.jpg |
| media.activities.items.activity4 | activity-4.jpg | submenu/gamerooms.jpg |
| media.activities.items.activity5 | activity-5.jpg | submenu/childactivite-1.jpg |
| media.pools.slide | pool-slide.jpg | kids7.jpg |
| media.pools.children | pool-children.jpg | child_pool.jpg |
| media.pools.indoor | pool-indoor.jpg | 2149046677.jpg |
| media.moments.images[0] | club-play.webp | kids3.webp |
| media.moments.images[1] | club-main.webp | kids4.webp |
| media.moments.images[2] | club-moments.webp | kids5.webp |

**14 medya kaydı, 11 benzersiz dosya**; kaydırıcı tekrarlarıyla DOM'da 18 normal img ve
1 CSS arka planı vardır. Orijinaller korunur, bütün kopyalar bayt eşidir. Video yoktur.
Normal görsellerde yerelleştirilmiş alt metin için mevcut başlıklar kullanılır; CSS hero
alt metni taşımaz. Görsel ölçüleri kayıtta gerçek dosyadan alınır; etkinlik kaydırıcısının
mevcut 360×540 sunum ölçüsü ve bütün tasarım sınıfları korunur.

### Bilerek korunmuş tutarsızlıklar ve kapsam dışı alanlar

- Eski etkinlik kodunda 5 görsel ve 4 başlık ayrı ayrı ikiye katlanıyordu. Görünen
  başlık dizisi `title1,title2,title3,title4,title1,title2,title3,title4,boş,boş` idi.
  `title/repeatTitle` aynı kart kimliğinin iki render turuna aittir; kayma düzeltilmedi.
  Mesajlardaki `CarouselSection.title5` görünür başlık olarak etkinleştirilmedi;
  beşinci görselin alt açıklamasında kullanılabilir. İleride panelde bu farklılık açıklanmalıdır.
- Etkinlik göstergesindeki `selectedIndex/2` davranışı korunur.
- Ortak CuisinesCarousel mobil göstergesindeki tanımsız `handleJump` çağrısı yönetim API geçişinde düzeltildi: mevcut Embla üzerinde `emblaApi?.scrollTo?.(index)` kullanır. Sınıflar ve kart sırası korunur.
- Almanca Mini-Disco kullanımı, Rusça yazım hataları ve fotoğraf/başlık tutarsızlıkları korunur.
- Havuz kartlarındaki eski `link:"/"` alanı bileşen tarafından render edilmiyordu;
  yönetilebilir bağlantı eklenmedi. İkinci tanıtım paragrafı boş kalır.
- Kullanılmayan KidsBamboo, KidsRestaurantCarousel, RestaurantMainBanner dahil edilmedi.
  ContactSection2 ve diğer tüketicilerin çevirileri korunur.

### Lago eşleşmesi

Lago `content/site-pages/kidsclub.json`, `KidsClubMediaEditor.jsx` ve genel içerik editörü
salt okunur incelendi. `hero`, `info`, `activities.items`, `pools`, `moments.images` adları
uyumludur. Lago'nun 9 etkinliği yerine 5; mini/junior/teenage ve bambu yerine Azura'nın iki
örtüşen tanıtım görseli vardır. Panda, çocuk restoranı ve Lago havuz kimlikleri eklenmez.
Lago koleksiyonlarının `src` alanı Azura'nın `image` alanına uyarlanmalı; gerçek width/height,
CSS alt ayrımı, Azura ikon metinleri ve iki tur başlıkları sayfa yapılandırmasında tanımlanmalıdır.
Metinler mevcut next-intl anahtarlarından yukarıdaki bölüm adlarına eşlenir; Lago'ya kod yazılmadı.

### Yönetim API sözleşmesi

Her iki API aynı `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` başlığını ister.
Yanıtlar `Cache-Control: no-store` taşır. Token yapılandırılmamışsa ortak davranış 503;
geçersiz/eksik Bearer 401'dir.

```http
GET /api/azura/kidsclub/page-content
Authorization: Bearer <token>
```

GET ve başarılı PUT tam olarak:
```json
{"bundle": "kidsclub.json.translations nesnesinin tamamı", "media": "kidsclub.json.media nesnesinin tamamı", "revision": "64 karakter küçük harf SHA-256"}
```
Buradaki açıklama stringlerinin yerinde yukarıdaki kesin şemadaki **nesneler** bulunur.
Eksiksiz gerçek örnek: `content/site-pages/kidsclub.json`; `translations` alanı API'de
`bundle` adıyla taşınır. Kimlik/metaveri kök alanları API gövdesine konmaz.

```http
PUT /api/azura/kidsclub/page-content
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "<GET revision>"

{"bundle": <dört dilin tamamı>, "media": <14 medya kaydının tamamı>}
```

Gövde yalnızca bu iki alanı kabul eder. Üst sınır 128 KiB; metin 4000, alt açıklama 300
karakterdir. Eksik If-Match 428, biçimsiz If-Match/veri 400, eski revision 409,
yanlış Content-Type 415, boyut aşımı 413. Hatalar `{error:"..."}` biçimindedir.

Boş string (`""`) yalnızca **her bir tr/en/de/ru dilinde** şu alanlarda kabul edilir:
`bundle.<locale>.activities.items.activity4.repeatTitle` ve
`bundle.<locale>.activities.items.activity5.repeatTitle`. Bunlar başlangıçta boş olan
iki tekrar başlığıdır. Boşluklardan oluşan string geçersizdir; bu iki alana ileride geçerli
metin yazılabilir. Diğer zorunlu metinler boş olamaz; başlık kayması kendiliğinden düzeltilmez.

Revision, doğrulanmış bundle/media'nın kanonik JSON SHA-256 hash'idir; kök metaveri
revision'a katılmaz ve revision dosyaya yazılmaz. Ortak `enqueuePageWrite` kuyruğunda
dosya yeniden okunur, revision karşılaştırılır, yalnızca translations/media değiştirilir,
diğer kök alanlar korunarak atomik kaydedilir. Hatalı işlem kuyruğu kilitlemez.
**Kuyruk yalnızca aynı Node.js süreci içindeki yazmaları korur; çok süreç/çok sunucu
kurulumu için süreçler arası kilit veya ortak transactional depolama gerekir.**
Başarılı PUT `/tr/kidsclub`, `/en/kidsclub`, `/de/kidsclub`, `/ru/kidsclub` yollarını
revalidate eder; dinamik sunucu okuması güncel kalıcı veriyi gösterir.

```http
GET /api/azura/kidsclub/images
Authorization: Bearer <token>
```
```json
{"images":[{"image":"/uploads/pages/kidsclub/<sunucu-adı>.jpg","mimeType":"image/jpeg","size":123,"width":720,"height":1080,"modifiedAt":"ISO-8601 tarih"}]}
```

POST aynı adrese tek `file` alanlı multipart gönderir; Content-Type boundary istemci
FormData tarafından üretilir. 201 yanıtı aynı görsel nesnesidir, `modifiedAt` içermez:
```json
{"image":"/uploads/pages/kidsclub/<sunucu-adı>.jpg","mimeType":"image/jpeg","size":123,"width":720,"height":1080}
```

Dosya adını sunucu üretir; yalnızca Kids Club dizinine yeni dosya yazılır. JPEG/PNG/WebP,
8 MiB ve 16 milyon piksel, gerçek dosya türü/çözülebilirlik, güvenli dizin/symlink ve
üzerine yazmama kontrolleri ortak medya katmanından gelir. FileHandle.stat() sıfır boyut
regresyon düzeltmesi ve gerçek okunan bayt doğrulaması değiştirilmedi. Yükleme JSON'u
kendiliğinden değiştirmez. Yayınlamak için seçilen yol ve gerçek width/height ilgili medya
kaydına konup içerik PUT'u yapılmalıdır; CSS hero'ya alt metin eklenmez.

Gerçek tarayıcı, hover veya piksel karşılaştırması yapılmadı; metin/medya/şema ve
production HTTP kontrolleri tasarımın piksel eşliğinin kanıtı değildir.

Doğrulama sonucu (bu geçiş): Kids Club birim testleri **5/5**, izole production
HTTP testi **1/1** başarılı. HTTP; dört dilin bütün görünür metinlerini, 18 img sırasını,
CSS hero'yu, 11 dosyanın URL/bayt eşliğini, canlı dosya değişikliğini ve restart sonrasını
kontrol eder. Hakkımızda, restoran liste ve ana restoran detay sayfaları dört dilde 200 döner.
About/restoran/ortak medya regresyonları **18/19**: tek eski hata restoran Almanca
`mainRestaurant.list2` değerindeki ` hetheth` ekinin mesaj dosyasıyla eşleşmemesidir;
içerik değiştirilmedi. Next.js **15.5.26** izole production build, lint ve
`git diff --check` başarılı. Değişen iki Kids bileşeninin className ifadeleri HEAD ile aynıdır.

Eklenen dosyalar: Kids Club JSON ve 11 uploads kopyası, `azura-kidsclub-storage.mjs`,
`azura-kidsclub-content.js`, iki Kids test dosyası, `seed-persistent-kidsclub.mjs`,
`test-kidsclub-production.mjs`. Değişenler: aktif Kids page.js, KidsIconsSection,
KidsclubCarousel, salt okunur medya route izin listesi, package.json komutları ve bu README.

Yönetim API geçişi dosyaları: `app/api/azura/kidsclub/page-content/route.js` ve
`images/route.js` ortak handler fabrikalarını kullanır; `azura-kidsclub-storage.mjs`
revision/okuma/kuyruklu yazma işlevlerini içerir. `azura-homepage-media.mjs` yalnızca
Kids Club kapsam sarmalayıcılarıyla genişletildi. `CuisinesCarousel.jsx` içinde dört
satırlık güvenli gezinme fonksiyonu eklendi. `azura-kidsclub-api-http.test.mjs`,
`azura-kidsclub-indicator.test.mjs`, mevcut Kids birim/HTTP testleri ve package.json
komutları güncellendi. Başlangıç JSON ve görsel dosyaları bu API geçişinde değiştirilmedi.

Ortak CuisinesCarousel tüketicileri: Kids Club; restoran detaylarından mainrestaurant,
orchestrarestaurant, bellaazura, ottomanrestaurant, patisserie, mazurka ve lyric.
Restoran liste sayfası ve About da HTTP regresyon kapsamındadır. Gösterge testi gerçek
JSX'i derleyip üç tıklamanın indekslerini doğrular; gerçek tarayıcı etkileşim testi değildir.

Son yönetim API doğrulaması: Kids birim/bileşen testleri **7/7**, izole production
HTTP testleri **2/2** başarılı. Eksik/bozuk yetki ve revision, 400/401/409/413/415/428,
şema/boş metin/kimlik/sıra kontrolleri, paralel 200/409, dosya ve kök alanların korunması,
11 kayıtlı görselin HTTP listesi/URL'leri, yükleme sonrası 12 öğelik liste, normal görsel
ve CSS hero seçimi, dört dilde yayın ve restart sonrası aynı içerik/revision doğrulandı.
Next.js **15.5.26** izole production build, lint ve `git diff --check` başarılı.
About/restoran/ortak medya testleri **18/19**; yalnızca yukarıda belgelenen eski Almanca
restoran metin eşliği hatası sürer. FileHandle.stat() regresyon testi geçti.
Gerçek kullanıcı içerikleri testlerde kullanılmadı; yalnızca geçici kopyalar güncellendi.

## Azura Barlar: kalıcı içerik ve yönetim API’leri

Gerçek liste route'u `app/[locale]/bars/page.js`; `i18n/routing.js` içinde bars için
özel yerelleştirilmiş pathname yoktur. Adresler `/tr/bars`, `/en/bars`, `/de/bars`,
`/ru/bars` olarak kalır. Azura'nın **Restoranlar ve Kafeler / Barlar** ayrımı korunur;
Lago'nun **Restoranlar / Barlar ve Kafeler** ayrımı Azura'ya uygulanmaz.

Önce: `messages/<locale>.json` içindeki `Bars` metinleri ve statik importlar.
Şimdi: server-only `azura-bars-content.js` → ortak doğrulama yardımcılarını kullanan
`azura-bars-storage.mjs` → kalıcı `site-pages/bars.json` → seçili dilde bileşen props'ları.
Sayfa `force-dynamic` ile her istekte güncel içeriği okur. Panel bağlandığında site
panelden veri çekmeyecek; yönetim API’si kalıcı dosyayı değiştirecek, site aynı okuyucuyu kullanacak.

### Kesin JSON şeması ve görünür alanlar

```text
{
 schemaVersion: 1,
 pageKey: "bars",
 translations: {
  tr|en|de|ru: {
   hero: {subtitle,title,text},
   culinaryInfo: {subtitle,title,text},
   featureBackgrounds: {bars:{subtitle,title,text}},
   bars: {subtitle,title,text,cards:{
    lobbyPiano:{subtitle,title,text},
    chacha:{subtitle,title,text},
    pier:{subtitle,title,text},
    lyricSnack:{subtitle,title,text}
   }},
   discover: {subtitle,title,text}
  }
 },
 media: {
  hero: CSSImage,
  culinaryInfo: {primary:Image,secondary:Image},
  featureBackgrounds: {bars:CSSImage},
  bars: {lobbyPiano:OrderedImage,chacha:OrderedImage,pier:OrderedImage,lyricSnack:OrderedImage},
  discover: CSSImage
 }
}
CSSImage = {image,width,height}
Image = {image,width,height,translations:{tr:{alt},en:{alt},de:{alt},ru:{alt}}}
OrderedImage = {id,order,...Image}
```

Dört dilin hepsi zorunludur. Görünür kaynak alanlarında boş değer yoktur; mevcut
baştaki/sondaki boşluklar aynen korunur. Zorunlu metinler boş/yalnızca boşluk olamaz;
metin en fazla 4000, alt metin 300 karakterdir. Kontrol karakterleri reddedilir.
Bölüm alt anahtarları kesin doğrulanır; kafe veya yeni bölüm eklenemez. Kök gelecekteki
metaveri alanlarına izin verir. Kartların sırası `lobbyPiano → chacha → pier → lyricSnack`,
`order: 0…3`; `id/order` medya kart kayıtlarının üst seviyesindedir. Metinler aynı
anahtarla eşleşir. Bağlantılar JSON'da düzenlenemez.

| Bileşen | Metin | Medya |
|---|---|---|
| BannerDark | hero | hero |
| ClinaryInfoSection | culinaryInfo | primary/secondary; DOM'da secondary önce |
| BackgroundSection | featureBackgrounds.bars | featureBackgrounds.bars |
| OtherOptions4 | bars ve bars.cards | bars.<kart kimliği> |
| DiscoverBackground | discover | discover |
| ContactSection2 | Değişmedi | Değişmedi |

### Tam medya yolları

| JSON nesne yolu | Kalıcı URL | Mevcut kaynak (`app/[locale]/` altında) |
|---|---|---|
| media.hero | /uploads/pages/bars/hero.jpg | bars/images/Banner.jpg |
| media.culinaryInfo.primary | /uploads/pages/bars/intro-primary.png | bars/images/blok2.png |
| media.culinaryInfo.secondary | /uploads/pages/bars/intro-secondary.png | bars/images/blok22.png |
| media.featureBackgrounds.bars | /uploads/pages/bars/bars-background.png | bars/images/POOL.png |
| media.bars.lobbyPiano | /uploads/pages/bars/lobby-piano.png | bars/images/PIANOBAR.png |
| media.bars.chacha | /uploads/pages/bars/chacha.png | bars/images/Chacha.png |
| media.bars.pier | /uploads/pages/bars/pier.png | bars/images/Pierbar.png |
| media.bars.lyricSnack | /uploads/pages/bars/lyric-snack.png | bars/images/discobar.png |
| media.discover | /uploads/pages/bars/discover.jpg | restaurants/orchestrarestaurant/images/orchestra3.jpg |

**9 medya kaydı / 9 benzersiz dosya**, 6 normal img + 3 CSS arka planı.
Bütün kopyalar bayt eşidir; orijinaller korunur. Hero/background/discover CSS kullandığı
 için alt metin içermez. Diğer alt metinler mevcut yerelleştirilmiş bölüm/kart başlıklarından
alınır. Gerçek ölçüler JSON'da tutulur; sunum ölçüleri/sınıfları değişmez.
Restoran klasöründeki orchestra3.jpg **önceden de Barlar keşif bölümünde kullanılıyordu**;
restoran liste sayfasından yeni bir bölüm veya içerik taşınmadı.

### Kurulum ve güvenlik

```sh
AZURA_CONTENT_ROOT=/persistent/content AZURA_UPLOADS_ROOT=/persistent/uploads npm run seed:bars
```

Hedef JSON `${AZURA_CONTENT_ROOT}/site-pages/bars.json`; görseller
`${AZURA_UPLOADS_ROOT}/pages/bars/`. Seed `wx` ve `COPYFILE_EXCL` kullanır: mevcut JSON
ve görsellerin üzerine yazmaz. Sonrasında mevcut kalıcı içeriği doğrular; bozuk mevcut
kaydı sessizce seed ile değiştirmez. Varsayılan geliştirme kaynakları client/content ve
client/public/uploads'dır. Üretimde mevcut Azura ortam değişkenleri kullanılmalıdır.

Eksik/geçersiz JSON, dil, alan, kimlik/sıra, dosya yolu veya bulunamayan görsel açık hata
üretir. Yalnızca bars kapsamındaki gerçek JPEG/PNG/WebP, 8 MiB / 16 milyon piksel,
gerçek ölçü eşliği ve güvenli dosya/dizin/symlink kontrolleri kullanılır. Ortak medya
sunumuna yalnızca salt okunur `bars` kapsamı eklendi; önceki gerçek bayt kontrolü korunur.

### Korunan tutarsızlıklar / kapsam dışı

- Lyric Snack Bar başlığı/metni `discobar.png` ile eşleşiyordu; aynı eşleşme korundu.
- Kartların eski hedefleri kodda sırasıyla `/bars/lobby-piano-bar`,
  `/bars/chacha-pool-bar`, `/bars/pier-bar`, `/bars/pier-bar` olarak korunur.
  OtherOptions4 bunları render etmiyordu; bağlantılar etkinleştirilmedi.
- BackgroundSection ve DiscoverBackground düğmeleri yorum satırında kalır.
  Görünmeyen buttonText alanları JSON'a alınmadı; mesaj anahtarları silinmedi.
- Keşif bölümü restoranları anlatır ve `link="/bars"` alır; bağlantı görünmez.
  Başlık/metin/görsel değiştirilmedi.
- Türkçe ilk kartın saat metnindeki `00:00Mayıs` birleşikliği ve diğer yazımlar korunur.
- OtherOptions4 mobil göstergesindeki tanımsız handleJump çağrısı API geçişinde
  mevcut Embla örneğinde `emblaApi?.scrollTo?.(index)` ile düzeltildi. Kart sırası,
  sınıflar, animasyon ve masaüstü davranışı değişmedi.
- Kullanılmayan BarCarouselSection ve kullanılmayan sabit İngilizce backgroundTexts2
  başlangıç verisine alınmadı. Aktif listede video veya ayrı galeri yoktur.
- Bar detay sayfaları, restoran sayfası ve ContactSection2 değiştirilmedi.
  Ortak OtherOptions4 yalnızca `room.img.alt ?? room.title` desteği aldı;
  üç bar detayındaki eski alt metin davranışı korunur.

### Lago formu ve uygulanmış yönetim sözleşmesi

Lago `BarCafesMediaEditor.jsx`, panel kayıt tablosu ve `content/site-pages/barcafes.json`
salt okunur incelendi. Anlamca eşleşen `hero`, `culinaryInfo.primary/secondary`,
`featureBackgrounds.bars`, `bars` ve `discover` isimleri kullanıldı. Otel yapılandırması
Azura için `pageKey: bars`, dört farklı kart kimliği, CSS alt ayrımı ve gerçek ölçüleri
kullanmalıdır. Lago'nun cafes, featureBackgrounds.cafes ve sekiz görsellik carousel alanları
Azura'da yoktur; forma sahte veri veya ek alan olarak zorunlu kılınmamalıdır.

Her iki API mevcut `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` başlığını ister;
yanıtlar `Cache-Control: no-store` kullanır. Token yapılandırılmamışsa mevcut ortak davranış 503'tür.

```http
GET /api/azura/bars/page-content
Authorization: Bearer <token>
```
GET ve başarılı PUT tam olarak `{bundle,media,revision}` döndürür:
- `bundle`: yukarıdaki `translations` nesnesinin dört dilde tamamı.
- `media`: yukarıdaki dokuz medya kaydının tamamı.
- `revision`: doğrulanmış bundle/media'nın kanonik JSON içeriğinden üretilen
  64 karakter küçük harf hexadecimal SHA-256; JSON dosyasına yazılmaz.

```http
PUT /api/azura/bars/page-content
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "<GET revision>"

{"bundle": <dört dilin tüm metin nesneleri>, "media": <dokuz medya kaydının tamamı>}
```
Gövde yalnızca bundle/media kabul eder. Tam başlangıç nesneleri `content/site-pages/bars.json`
içindedir; translations alanı istek/yanıtta bundle adıyla taşınır. schemaVersion/pageKey veya
revision PUT gövdesine eklenemez. **Hiçbir zorunlu metinde boş string istisnası yoktur**;
baştaki/sondaki geçerli boşluklar trim edilmeden korunur. Metin 4000, alt açıklama 300
karakter, içerik gövdesi 128 KiB ile sınırlıdır.

Hatalar `{error:"..."}` biçiminde: 401 yetkisiz, 400 geçersiz veri/biçimsiz If-Match,
415 yanlış Content-Type/desteklenmeyen görsel türü, 428 eksik If-Match, 409 eski revision,
413 boyut aşımı. Başarısız içerik isteği dosyayı değiştirmez.

`enqueuePageWrite` ortak kuyruğunda dosya yeniden okunur, revision kontrol edilir;
yalnızca translations/media güncellenip diğer kök alanlar korunarak atomik kaydedilir.
Kök metaveri revision'a katılmaz. Başarısız işlem kuyruğu kilitlemez.
**Kuyruk yalnızca aynı Node.js sürecini korur**; çok süreç/çok sunucu için süreçler arası
kilit veya transactional depolama gerekir. Başarılı PUT `/tr/bars`, `/en/bars`, `/de/bars`,
`/ru/bars` yollarını yeniden doğrular; dinamik okuma güncel kalıcı dosyayı gösterir.

```http
GET /api/azura/bars/images
Authorization: Bearer <token>
```
```json
{"images":[{"image":"/uploads/pages/bars/<sunucu-adı>.jpg","mimeType":"image/jpeg","size":123,"width":2048,"height":1365,"modifiedAt":"ISO-8601 tarih"}]}
```
POST aynı adrese tek multipart `file` alanı kabul eder. Başarı kodu 201:
```json
{"image":"/uploads/pages/bars/<sunucu-adı>.jpg","mimeType":"image/jpeg","size":123,"width":2048,"height":1365}
```
Sadece `/uploads/pages/bars/` altında benzersiz sunucu adıyla dosya oluşturulur; var olan
 dosya ezilmez. JPEG/PNG/WebP, 8 MiB/16 milyon piksel, gerçek tür/ölçü/çözülebilirlik,
güvenli dizin ve symlink kontrolleri ortaktır. FileHandle.stat() sıfır boyut sorununun
düzeltmesi ve gerçek okunan bayt doğrulaması değiştirilmedi. Yükleme bars.json'u değiştirmez;
yayınlamak için yol/gerçek width/height içerik PUT'unda seçilmelidir. CSS kayıtları alt metinsiz kalır.

Eklenenler: bars.json, dokuz uploads kopyası, azura-bars-storage.mjs,
azura-bars-content.js, seed-persistent-bars.mjs, birim/HTTP testleri ve izole production
betiği. Değişenler: aktif bars/page.js, OtherOptions4 alt desteği, salt okunur medya
route izin listesi, package.json komutları ve README. Yönetim route’ları sonraki API geçişinde eklendi.

Test komutları: `npm run test:bars`, `npm run test:bars-production`, `npm run lint`.
Testler gerçek kullanıcı verisine yazmaz; ayrı geçici içerik/uploads ve build dizinleri
kullanır. Gerçek tarayıcı, hover veya piksel karşılaştırması yapılmadı.

Bu geçişin sonuçları: Barlar birim/bileşen testleri **7/7**, izole production HTTP
**1/1** başarılı. Dört dilin gerçek `/bars` yolları, bütün görünür metinler, altı normal
görselin sırası/alt metni, üç CSS arka planı, dokuz görsel URL'sinin baytları, gizli kart
bağlantıları, canlı JSON değişikliği ve restart sonrası kalıcılık kontrol edildi.
Restoran listesi ve üç bar detay sayfası dört dilde HTTP 200 verdi. OtherOptions4'ün
eski title alt davranışı ve yeni yerelleştirilmiş alt desteği bileşen testinde doğrulandı.
Next.js **15.5.26** izole production build, lint ve `git diff --check` başarılı.
Sayfa ve OtherOptions4 className ifadeleri HEAD ile aynıdır.

Ortak medya + restoran regresyonları **12/13**: tek mevcut başarısızlık restoran Almanca
`mainRestaurant.list2` metnindeki ` hetheth` ekinin mesaj dosyasıyla eşleşmemesidir.
Bunu gidermek için içerik değiştirilmedi. İlk Barlar HTTP denemesindeki URL kodlama
karşılaştırması test hatası düzeltildi; son çalışmada yeni başarısızlık yoktur.

### Barlar API geçişi: dosyalar ve doğrulama

Bu aşamada eklenen route'lar `app/api/azura/bars/page-content/route.js` ve
`images/route.js` olup ortak handler fabrikalarını kullanır. `azura-bars-storage.mjs`
kanonik revision ve ortak kuyrukta atomik yazma ile genişletildi;
`azura-homepage-media.mjs` yalnızca sabit bars kapsamlı listeleme/yükleme sarmalayıcıları aldı.
OtherOptions4'e güvenli gösterge fonksiyonu eklendi. Başlangıç JSON/görseller, restoran
sayfası, bar detay sayfaları ve ContactSection2 bu API aşamasında değiştirilmedi.

Test ekleri: `azura-bars-api-http.test.mjs`, `azura-bars-indicator.test.mjs`, mevcut
storage testindeki kanonik revision/kök alan koruma testi. package.json ve izole
production betiği Barlar + Kids Club + Beach & Pools HTTP paketlerini çalıştırır.
OtherOptions4'ün liste dışındaki tüketicileri lobby-piano-bar, chacha-pool-bar ve pier-bar;
bu sayfalar dört dilde HTTP regresyon kapsamındadır.

Son sonuçlar: Barlar birim/bileşen **9/9**; izole production HTTP Barlar **2/2**,
Kids Club **2/2**, Beach & Pools **2/2** başarılı. Yetki, 400/401/409/413/415/428,
eksik/fazla alanlar, CSS/normal ayrımı, yanlış yol/gerçek ölçü/symlink, paralel 200/409,
hatalı kayıtta dosyanın korunması, kök metaveri, yükleme/listeleme/seçme, dört dilde
yayın ve restart sonrası aynı içerik/revision test edildi. Dokuz geçerli görsel listelenir;
yükleme sonrası on kayıt vardır. Gerçek kullanıcı verisine test yazılmadı.

Ortak medya, Kids Club, Beach & Pools ve restoran birim regresyonları **26/27**:
tek eski başarısızlık yukarıdaki Almanca restoran `hetheth` metin farkıdır. Yeni hata yok.
Next.js **15.5.26** izole production build, lint ve git diff --check başarılı.
Gösterge testi gerçek JSX'i derleyip dört tıklamanın doğru scrollTo indekslerini ve
Embla hazır değilken güvenli davranışı doğrular; gerçek tarayıcı/piksel testi yapılmadı.
