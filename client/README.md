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
