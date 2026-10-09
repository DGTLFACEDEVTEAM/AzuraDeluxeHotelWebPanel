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

## Entertainment: mevcut kullanıcı çalışmasının kalıcı sayfaya bağlanması

Gerçek route `app/[locale]/entertainment/page.js`; dört dilde
`/tr/entertainment`, `/en/entertainment`, `/de/entertainment`, `/ru/entertainment`.
Kalıcı içerik dönüşümünü yönetim API geçişi izler; aşağıdaki uçlar uygulanmıştır.

### Kullanıcının hazırladığı çalışma ve yapılan düzeltmeler

- Dosya adları zaten `lib/azura-entertainment-content.js` ve
  `lib/azura-entertainment-storage.mjs` idi; yeniden adlandırılmadı.
- Server-only giriş, ortak doğrulama/dizin yardımcıları, sabit kimlikler, kategori/link
  eşlemesi, dört dil ve 12 görsel kaydı doğru hazırlanmıştı; korundu.
- JSON'da üç teknik ölçü düzeltildi: `gridSection[3]` beach-activities **1076×1200**;
  `gridSection[6]` step-aerobics **1080×1200**; `gridSection[7]` stage-shows **699×760**.
  Eski değerler üçünün de 698×760 idi. Görsel dosyalarının baytları değiştirilmedi.
- İngilizce `gridSection.title1`, `text1`, `title9`, `text9` değerlerinde eski mesajlardaki
  birer başlangıç boşluğu kullanıcı JSON'unda yoktu. Kullanıcının bu değerleri korundu;
  mesaj dosyasıyla otomatik eşitlenmedi. Diğer kullanılan metinler boşluklarıyla eşittir.
- Bütün kullanıcı alt açıklamaları, dosya adları, yollar ve sıra korundu.
- Yönetilen alanlar kesin doğrulanır; API geçişinde ek kök metaverinin korunmasına izin verildi. Aktif sayfa henüz okuyucuyu çağırmıyordu; şimdi
  async sunucu okuması ve force-dynamic ile doğru dilde props gönderir.
- Kullanıcının storage dosyasında önceden bulunan revision/yazma yardımcıları korunmuştur;
  API geçişinde ortak handler route’una bağlandı; normal sayfa yalnızca okuma işlevini çağırır.

### Kesin JSON sözleşmesi

```text
{
 schemaVersion:1,
 pageKey:"entertainment",
 translations:{tr:Locale,en:Locale,de:Locale,ru:Locale},
 media:{hero:CSSImage,activities:[OrderedImage,OrderedImage],gridSection:[9 OrderedImage]}
}
Locale = {
 activities:{subtitle,title,text,span1,span2,daytime,nighttime},
 gridSection:{subtitle,title,text,
   title1,text1,title2,text2,title3,text3,title4,text4,title5,text5,
   title6,text6,title7,text7,title8,text8,title9,text9,daytime,nighttime}
}
CSSImage = {image,width,height}
OrderedImage = {id,order,image,width,height,
  translations:{tr:{alt},en:{alt},de:{alt},ru:{alt}}}
```

Yönetilen translations/media alt alanlarında eksik/fazla anahtarlar reddedilir; ek kök metaveri korunur. Bilinçli boş metin yoktur;
boş string/yalnızca boşluk kabul edilmez. Metin 4000, alt açıklama 300 karakter;
baştaki/sondaki geçerli boşluklar trim edilmez. Kimlik/sıra sabittir. `activities`
medyası `daytime → nighttime`, order `0 → 1`. Metinler bu kimliklerden `daytime/nighttime`
ve `span1/span2` ile eşleşir. Dokuz grid kartı aşağıdaki sabit kimlik sırasından
`titleN/textN` alanlarına eşlenir; medya id/order doğrulaması geçmeden bu birleşim yapılmaz.
Kullanıcının düz metin anahtarları yeniden düzenlenmedi.

| order / id | Metin | Sabit hedef | Kategori |
|---|---|---|---|
| 0 sport-fitness | title1/text1 | /spor | daytime |
| 1 kids-teen-club | title2/text2 | /kidsclub | daytime |
| 2 water-sports | title3/text3 | /beachpools | daytime |
| 3 beach-activities | title4/text4 | /beachpools | daytime |
| 4 table-tennis | title5/text5 | /spor | daytime |
| 5 water-gymnastics | title6/text6 | /beachpools | daytime |
| 6 step-aerobics | title7/text7 | /spor | nighttime |
| 7 stage-shows | title8/text8 | /entertainment | nighttime |
| 8 darts-boccia | title9/text9 | /spor | daytime |

Linkler veride serbest düzenlenmez; kodda izinli sabit eşlemedir. Mevcut next/link ve
locale öneki taşımayan hedefler aynen korunur. Masaüstünde kartlar bağlantılıdır;
mobil carousel'de bağlantı yoktur. Başlık/kategori tutarsızlığı tahminle düzeltilmedi.

### Medya ve bileşen eşleşmesi

| JSON kaydı | Tam URL | Bileşen |
|---|---|---|
| media.hero | /uploads/pages/entertainment/ent_ban.jpg | MainBannerSection, CSS; metin ve alt yok |
| media.activities[0] | /uploads/pages/entertainment/daytime.jpg | ActivitiesSection |
| media.activities[1] | /uploads/pages/entertainment/nighttime.jpg | ActivitiesSection |
| media.gridSection[0] | /uploads/pages/entertainment/sport-fitness.jpg | EntertainmentTypesSection |
| media.gridSection[1] | /uploads/pages/entertainment/kids-teen-club.jpg | EntertainmentTypesSection |
| media.gridSection[2] | /uploads/pages/entertainment/water-sports.jpg | EntertainmentTypesSection |
| media.gridSection[3] | /uploads/pages/entertainment/beach-activities.jpg | EntertainmentTypesSection |
| media.gridSection[4] | /uploads/pages/entertainment/table-tennis.jpg | EntertainmentTypesSection |
| media.gridSection[5] | /uploads/pages/entertainment/water-gymnastics.jpg | EntertainmentTypesSection |
| media.gridSection[6] | /uploads/pages/entertainment/step-aerobics.jpg | EntertainmentTypesSection |
| media.gridSection[7] | /uploads/pages/entertainment/stage-shows.jpg | EntertainmentTypesSection |
| media.gridSection[8] | /uploads/pages/entertainment/darts-boccia.jpg | EntertainmentTypesSection |

12 medya kullanımı, 12 mevcut dosya yolu, **10 benzersiz dosya içeriği**:
daytime/beach-activities ve nighttime/step-aerobics bayt eşidir. Kullanıcının mevcut
kopyaları birleştirilmedi. Tüm dosyalar aktif eski kaynaklarla bayt eşit, gerçek JPEG ve
8 MiB / 16 milyon piksel sınırları içindedir. Yeniden kopyalama, yeniden adlandırma,
küçültme veya kaynak silme yapılmadı. Masaüstü/mobil DOM'da grid iki kez bulunduğundan
20 normal img + 1 CSS arka planı vardır. Ayrı galeri/video yoktur.

`activities` metni ActivitiesSection'a, `gridSection` metni EntertainmentTypesSection'a
aktarılır. Sınıflar, HTML bölüm sırası, ölçüler ve Embla ayarları değişmez. Normal
img alt değerleri artık kullanıcının dört dildeki alt açıklamalarını kullanır.
MainBannerSection ve ContactSection2 değiştirilmedi. Bu iki güncellenen Entertainment
bileşeninin başka aktif tüketicisi bulunmadı; mesaj anahtarları silinmedi.

### Kurulum, güvenlik ve mevcut kalıcı dosya

```sh
AZURA_CONTENT_ROOT=/persistent/content AZURA_UPLOADS_ROOT=/persistent/uploads npm run seed:entertainment
```

Kaynak `client/content/site-pages/entertainment.json`; hedef
`${AZURA_CONTENT_ROOT}/site-pages/entertainment.json`. Görseller mevcut public/uploads'dan
`${AZURA_UPLOADS_ROOT}/pages/entertainment/` altına yalnızca yoksa kopyalanır.
JSON `wx`, görseller `COPYFILE_EXCL` ile oluşturulur; mevcut düzenlemeler ezilmez.
Ardından mevcut kalıcı dosya şema ve gerçek medya dosyalarıyla doğrulanır. Eksik/geçersiz
JSON, alan, dil, id/order, yol, dosya türü veya gerçek ölçü açık hata verir; eski statik
veriye sessiz dönüş yoktur. Symlink ve dizin taşması kontrolleri ortaktır.

İncelenen yerel ortamda ayrı AZURA_CONTENT_ROOT yapılandırması bulunmadı; geliştirme
client/content dosyasını kullanıyor. Başka bir üretim dizinine erişilip yazılmadı.
Eski kalıcı dosya varsa seed onu otomatik değiştirmez. Yukarıdaki üç yanlış ölçüyü
barındırıyorsa yalnızca ilgili kaydın width/height alanları, dosyanın gerçek ölçüleriyle
ve diğer kullanıcı alanları korunarak ayrıca geçirilmelidir. Bozuk mevcut dosyada seed
hata verir; bu davranış test edilir. Yerel hazırlık JSON'una yapılan geçiş yalnızca bu
üç kaydın ölçülerini değiştirdi; metin, yol ve alt değerlerine dokunmadı.

### Lago uyarlaması ve kapsam dışı konular

Lago EntertainmentMediaEditor.jsx ve entertainment.json salt okunur incelendi.
Hero aynı anlamdadır. Lago `info.daytime/nighttime` alanları Azura'nın `media.activities`
id'lerine; Lago aktiviteleri Azura'nın `media.gridSection` kartlarına otel yapılandırmasıyla
eşlenmelidir. Hazırlanan Azura anahtarlarını bozmak için yeniden adlandırma yapılmadı.
Lago'nun sunset/themed gibi farklı kart isimleri ve galeri bölümü Azura'ya eklenmez;
Azura dokuz gerçek kartını korur. Kullanılmayan ActivityBackgroundSection ve LAGO SVG
bileşenleri etkinleştirilmez.

Mevcut tutarsızlıklar: Step Aerobik kartı nighttime kategorisinde; gündüz şovlarını
anlatan stage-shows da nighttime etiketli. Mobil göstergedeki tanımsız handleJump API geçişinde mevcut Embla üzerinde
`emblaApi?.scrollTo?.(index)` ile düzeltildi. 9 öğeye rağmen %33.3 gösterge genişliği korunur. Masaüstü
linklerinin mobilde bulunmaması ve locale'siz URL davranışı da korundu.

### Uygulanmış yönetim API sözleşmesi

Tüm yöntemler `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister.
Yanıtlar `Cache-Control: no-store` taşır. Token yapılandırılmamışsa ortak davranış 503'tür.

```http
GET /api/azura/entertainment/page-content
Authorization: Bearer <token>
```
GET ve başarılı PUT yanıtında yalnızca üç alan vardır:
```text
{
 "bundle": entertainment.json.translations nesnesinin tamamı,
 "media": entertainment.json.media nesnesinin tamamı,
 "revision": "64 karakter küçük harf hexadecimal SHA-256"
}
```
Nesnelerin kesin iç içe alanları yukarıdaki şema ve mevcut entertainment.json dosyasıdır.
Diziler aynen korunur; nesneye dönüştürülmez. PUT:
```http
PUT /api/azura/entertainment/page-content
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "<GET revision>"

{"bundle": <dört dilin tam nesnesi>, "media": <hero ve iki mevcut medya dizisi>}
```
Yalnızca bu iki gövde alanı kabul edilir. Revision, doğrulanmış bundle/media'nın kanonik
JSON SHA-256 hash'idir; kök metaveriye bağlı değildir, dosyaya yazılmaz. Ortak process
kuyruğunda güncel dosya tekrar okunur, revision karşılaştırılır; yalnızca translations/media
atomik güncellenir, schemaVersion/pageKey ve diğer kök alanlar korunur. Hatalı işlem
kuyruğu kilitlemez. **Kuyruk yalnızca aynı Node.js sürecini korur**; birden çok worker/sunucu
kurulumunda süreçler arası kilit veya transactional depolama gerekir.
Başarılı PUT `/tr/entertainment`, `/en/entertainment`, `/de/entertainment`,
`/ru/entertainment` yollarını yeniden doğrular.

Sınırlar: 128 KiB içerik, 4000 karakter metin, 300 karakter alt açıklama. Hiçbir zorunlu
metinde boş string istisnası yoktur; geçerli baş/son boşluklar normalleştirilmez.
Hatalar `{error:"..."}`: 401 yetkisiz, 400 geçersiz veri/biçimsiz If-Match,
415 yanlış Content-Type/desteklenmeyen görsel türü, 428 eksik If-Match, 409 eski revision,
413 boyut aşımı. Başarısız içerik isteği dosyayı değiştirmez.

```http
GET /api/azura/entertainment/images
Authorization: Bearer <token>
```
```json
{"images":[{"image":"/uploads/pages/entertainment/<sunucu-adı>.jpg","mimeType":"image/jpeg","size":123,"width":2880,"height":1024,"modifiedAt":"ISO-8601 tarih"}]}
```
POST aynı adrese tek multipart file alanı gönderir; 201 yanıtı:
```json
{"image":"/uploads/pages/entertainment/<sunucu-adı>.jpg","mimeType":"image/jpeg","size":123,"width":2880,"height":1024}
```
Yalnızca entertainment dizinine sunucunun oluşturduğu benzersiz adla yazılır; mevcut
 dosya ezilmez. JPEG/PNG/WebP, 8 MiB, 16 milyon piksel, gerçek tür/çözülebilirlik/ölçü,
güvenli yol/dizin ve symlink kontrolleri ortak katmandan gelir. Önceki FileHandle.stat()
sıfır boyut düzeltmesi ve gerçek okunan bayt doğrulaması değişmedi. 12 mevcut yol korunur;
aynı baytlı dosyalar birleştirilmez. Yükleme JSON'u değiştirmez; yayınlamak için yol ve
gerçek width/height içerik PUT'unda seçilir. Hero'ya translations/alt eklenemez.

Üretim kalıcı dizini bu yerel ortamda yapılandırılmadı; canlı geçiş yapılmadı. Canlıya
kurulumda AZURA_CONTENT_ROOT/AZURA_UPLOADS_ROOT ve ayrı servis tokenı yapılandırılmalı,
`npm run seed:entertainment` çalıştırılmalı; eski ölçülü mevcut dosya varsa yukarıdaki
kontrollü ölçü geçişi ayrıca uygulanmalıdır. Seed mevcut içeriği ezmez.

Eklenenler: veri ezmeyen seed, birim/HTTP testleri ve izole build betiği. Değişenler:
kullanıcının JSON'unda üç ölçü kaydı, storage'da kesin kök doğrulaması, content girişinde
son satır sonu, aktif page.js ve iki sayfa bileşeninin props bağlantısı, salt okunur medya
izin listesi, package.json komutları ve README. .DS_Store kullanıcı değişikliği korunur.
Gerçek tarayıcı/piksel testi yapılmadı; gerçek kullanıcı verisine test yazılmadı.

Doğrulama sonucu: Entertainment birim testleri **7/7**, izole production HTTP **1/1**
başarılı. Dört dilde kullanıcı metinleri, 12 URL'nin baytları, 20 img sırası/altları,
masaüstü linkleri, dinamik dosya değişikliği ve restart sonrası kalıcılık doğrulandı.
İlk veri dönüşümü aşamasında yönetim page-content/images uçları 404 idi; sonraki API geçişinde etkinleştirildi. Bars ve Kids Club dört dilde HTTP 200 verdi.
Eski ölçülü kalıcı dosyanın seed ile ezilmediği ayrı testte doğrulandı.
Next.js **15.5.26** izole production build, lint ve git diff --check başarılı.
Ortak medya/Bars/Kids Club/restoran regresyonları **26/27**; tek eski başarısızlık
restoran Almanca mainRestaurant.list2 metnindeki ` hetheth` farkıdır. Kullanıcı içeriği
bu farkı gidermek için değiştirilmedi. Üç değişen JSX dosyasının className ifadeleri
HEAD ile eşit; kullanıcı translations nesnesi işlem öncesi kopyasıyla birebir eşittir.

### Entertainment API geçişi sonuçları

Eklenen route'lar: `app/api/azura/entertainment/page-content/route.js` ve
`images/route.js`; ortak handler fabrikalarını kullanır. Kullanıcının mevcut
revision/read/write yardımcıları yeniden oluşturulmadı. Storage'da ek kök metaveriyi
korumak için kök alan kısıtlaması Bars/Kids Club ile uyumlu hâle getirildi; yönetilen
translations/media şeması değişmedi. Ortak medya dosyasına yalnızca sabit entertainment
kapsam sarmalayıcıları eklendi. EntertainmentTypesSection yalnızca güvenli handleJump
fonksiyonu aldı; filtreleme olmayan aynı dokuz slayt/gösterge dizisi kullanılır.

Test ekleri: entertainment-api-http ve entertainment-indicator; storage'da kanonik
revision/kök alan koruma testi; önceki HTTP testi artık yetkisiz yönetim isteklerinde
401 bekler. package.json ve izole production betiği Entertainment, Bars, Kids Club
HTTP paketlerini çalıştırır. Başlangıç JSON, dosya adları ve görseller bu API aşamasında
değiştirilmedi. Önceden mevcut çalışma ağacı değişiklikleri ve .DS_Store korundu.

Son doğrulama: Entertainment birim/bileşen **9/9**; production HTTP Entertainment
**2/2**, Bars **2/2**, Kids Club **2/2** başarılı. Yetki, 400/401/409/413/415/428,
paralel 200/409, değişmeyen hata dosyası, kök metaveri, CSS/normal şema ayrımı,
kimlik/sıra/sayı/gerçek ölçü, symlink ve başka sayfa yolu, 12 kayıtlı görselin dolu
listesi/URL'leri, yükleme sonrası 13 kayıt, içerikte seçim, dört dilde yayın ve restart
sonrası aynı içerik/revision doğrulandı. Mobil test gerçek JSX'i derler; Embla
viewport'undaki dokuz kart kimliğini ve dokuz göstergenin indekslerini eşleştirir,
API hazır değilken hata olmadığını doğrular. Gerçek tarayıcı/piksel testi değildir.

Ortak medya/Bars/Kids Club/restoran birim regresyonları **28/29**; tek eski başarısızlık
Almanca restoran `mainRestaurant.list2` alanındaki ` hetheth` metin farkıdır.
Next.js **15.5.26** izole production build, lint ve git diff --check başarılı.
Canlı üretim dizini bu ortamda yapılandırılmadı; canlı geçiş/commit/deploy yapılmadı.

## Kalıcı Galeri ve yönetim API’si

Önce statik importlar ve çevrilmiş kategori anahtarları kullanılıyordu. Şimdi `app/[locale]/gallery/page.js`, server-only `lib/azura-gallery-content.js` üzerinden `azura-gallery-storage.mjs` ile dosyayı doğrular ve seçili dilin verisini `GalleryScrollSection` bileşenine aktarır. Panel aşağıdaki yönetim API’siyle kalıcı dosyayı günceller; site panelden veri çekmez. Lago bağlantısı henüz uygulanmadı.

Başlangıç: `content/gallery/gallery.json`. Kalıcı kaynak: `${AZURA_CONTENT_ROOT}/gallery/gallery.json`. Görseller: `${AZURA_UPLOADS_ROOT}/gallery/`; başlangıç kopyaları `public/uploads/gallery/`. Mevcut development/production dizin kuralları geçerlidir. Production ortamında iki kök değişkeni tanımlanmalıdır. Bu çalışma canlı kurulum/deploy yapmaz.

```json
{
  "schemaVersion": 1,
  "categories": [
    {
      "id": "general",
      "images": [
        {
          "id": "general-001",
          "src": "/uploads/gallery/image-4-<kaynak-yolu-hashi>.jpg",
          "order": 0,
          "width": 1200,
          "height": 800,
          "translations": {
            "tr": {"alt": "gallery"}, "en": {"alt": "gallery"},
            "de": {"alt": "gallery"}, "ru": {"alt": "gallery"}
          }
        }
      ]
    }
  ]
}
```

Yukarıdaki tek kategori örnektir; kesin sözleşmede aşağıdaki dokuz kategori bu sırayla zorunludur. Görsel sayıları doğrulayıcıda sabitlenmez; tüm kategoriler boş olabilir. Her kategori içinde `order` sıfırdan başlayıp kesintisiz artar. Kayıt kimlikleri tüm galeride benzersizdir ve okuma sırasında üretilmez. Başlangıç kimlikleri `<kategori>-001` biçimindedir; gelecekte yeniden sıralarken/eklerken eski kimlikler değiştirilmemelidir.

| Kategori | Başlangıç kayıt sayısı |
|---|---:|
| general | 28 |
| rooms | 7 |
| flavours | 12 |
| bar | 6 |
| pool | 6 |
| entertainment | 12 |
| kidsclub | 11 |
| spa | 13 |
| meeting | 0 |

Toplam 95 kayıt, 77 benzersiz kaynak yolu ve 77 uploads dosyası. Aynı kaynak birden çok kategoride aynı `src` ile kullanılır; kayıt kimlikleri ayrıdır. Benzer görünümlü veya baytları eşit farklı kaynaklar birleştirilmez. Kaynak → uploads eşlemesi, gerçek ölçüler ve SHA-256 değerleri `content/gallery/source-manifest.json` içindedir. Manifest kurulum/denetim içindir; runtime içerik sözleşmesine dahil değildir.

Normal görseller dört dilde alt metin taşır. Eski küçük görsellerdeki `gallery` değeri korunmuştur; yeni ayrıntılar uydurulmamıştır. Eski lightbox `Enlarged gallery` değeri, alt metin hâlâ `gallery` ise korunur; düzenlenmiş alt metin lightbox’a da aktarılır. Kategori başlıkları mevcut `Gallery` next-intl mesajlarından gelir. Banner, başlıklar, ContactSection2, diğer sayfaların galerileri değişmez. Boş `meeting` düğmesi görünür kalır. Kolonlar, sınıflar, responsive düzen, klavye okları/Escape ve ileri/geri sarma korunur; kategori değişince veya seçili kayıt kaldırılınca geçersiz lightbox indeksi kullanılmaz.

### Onaylı tek görsel dönüşümü

Orijinal `app/[locale]/gallery/images/spa/spa8.jpg` değiştirilmedi. 5616×3744 / 18.232.600 bayt olan kaynağın yalnızca uploads kopyası EXIF yönü uygulanarak, kırpılmadan ve oran korunarak 4800×3200 JPEG üretildi. Çıktı `spa8-4800x3200-1393793f06e2.jpg`, 8.029.040 bayt, 15.360.000 piksel. Yüksek kalite JPEG (4:4:4) kullanıldı. Yalnızca bu kaynak için bayt eşliği beklenmez; manifest kaynak ve çıktı hash’lerini ayrı saklar. Diğer 76 dosya bayt eşidir. Sınırlar gevşetilmedi: JPEG/PNG/WebP, 8 MiB, 16 milyon piksel, gerçek çözümleme/tür/ölçü denetimi; güvenli dosya adı, dizin ve symlink denetimi. Alt metin sınırı 300 karakterdir, dört dil eksiksiz ve boş olmayan değer ister. Kategori/görsel kayıtlarında bilinmeyen veya eksik alanlar reddedilir; mevcut kök metaverileri korunur.

### Kurulum ve test

```sh
AZURA_CONTENT_ROOT=/kalici/azura/content AZURA_UPLOADS_ROOT=/kalici/azura/uploads npm run seed:gallery
npm run test:gallery
npm run test:gallery-production
```

Seed yalnızca eksik JSON ve görselleri ekler (`wx` / `COPYFILE_EXCL`). Mevcut düzenlemeler ve dosyalar ezilmez; eski/geçersiz mevcut içerik doğrulama hatası üretir, sessizce seed’e dönülmez. Salt okunur mevcut medya sunumu `/uploads/gallery/<dosya>` kapsamını destekler. Yönetim GET/PATCH ve görsel GET/POST uçları aşağıda tanımlanmıştır. Fiziksel silme API’si yoktur.

Birim testleri başlangıç sayıları/kimlikleri, kaynak hash/ölçüleri, dört dil, boş kategori, değişken kayıt sayısı, şema, güvenli yollar/symlink, seed tekrarını kapsar. Bileşen testi lightbox gezinmesi, klavye, boş kategori ve kaldırılan seçimi kontrol eder. Production runner ayrı geçici checkout/build, geçici içerik/uploads ve HTTP sunucusu kullanır; dört dil, 77 görsel URL’si ve restart öncesi/sonrası kalıcı alt metin değişikliği test edilir. Gerçek kullanıcı içeriğine test verisi yazılmaz. Gerçek tarayıcı/piksel testi yapılmadı.

Son doğrulama (2026-09-28): galeri birim/bileşen testleri 4/4, izole production HTTP 1/1, mevcut ortak medya testleri 7/7 geçti. Next.js 15.5.26 production build, lint ve `git diff --check` başarılı. İlk sandbox build denemesinde Google Fonts DNS erişimi engellendi; ağ izinli izole build geçti. HTTP testinin ilk sürümündeki `&`/`&amp;` karşılaştırması düzeltildi; içerik değiştirilmedi. Tam proje test paketi çalıştırılmadı; önceki sayfalardaki bilinen içerik eşliği sorunları bu çalışma kapsamında değiştirilmedi.

### Galeri yönetim sözleşmesi

Bütün uçlar `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister. Ortak yapılandırma kuralıyla servis tokenı en az 32 karakter olmalıdır. Token yanlış/eksikse 401; sunucuda token yapılandırılmamışsa mevcut ortak davranış gereği 503. Yanıtlar `Cache-Control: no-store` taşır.

`GET /api/azura/gallery` ve başarılı `PATCH /api/azura/gallery`:

```json
{"gallery":{"schemaVersion":1,"categories":[]},"revision":"<64 küçük harf hexadecimal SHA-256>"}
```

Örnekte kısaltılan `categories`, yukarıdaki dokuz kategorinin tamamını mevcut sırada içerir; her kategori boş `images` kabul eder. Dosyadaki diğer kök metaveriler yanıtta ve kayıtta korunur. Revision doğrulanmış galeri nesnesinin tamamının kanonik JSON hash’idir (nesne anahtarları sıralanır, dizilerin sırası anlamlıdır); JSON’a eklenmez.

PATCH başlıkları:

```http
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "<GET revision>"
```

İşlem başına tek gövde; aşağıdakiler dışında alan kabul edilmez:

```json
{
  "action":"add", "categoryId":"general",
  "src":"/uploads/gallery/gallery-<server-uuid>.jpg",
  "translations":{
    "tr":{"alt":"Açıklama"},"en":{"alt":"Description"},
    "de":{"alt":"Beschreibung"},"ru":{"alt":"Описание"}
  }
}
```

Sunucu `gallery-<UUID>` kayıt kimliği üretir; gerçek dosyadan width/height alır ve kategori sonuna ekler. Aynı src başka kategoride kullanılabilir. Aynı kategoride yinelenen src 409’dur; başka kategoride bulunan kayıt yanıt olarak döndürülmez.

```json
{"action":"reorder","categoryId":"general","imageIds":["general-002","general-001"]}
```

Örnek iki kayıtlı kategori içindir: güncel kategorideki bütün kimlikler tam bir kez verilmelidir. Başka kategori kimliği, eksik/fazla/tekrarlı kimlik 400’dür. Kimlikler korunur, `order` sıfırdan düzenlenir. Boş kategori için `imageIds: []` geçerlidir.

```json
{
  "action":"update","categoryId":"general","imageId":"general-001",
  "translations":{
    "tr":{"alt":"Yeni açıklama"},"en":{"alt":"New description"},
    "de":{"alt":"Neue Beschreibung"},"ru":{"alt":"Новое описание"}
  }
}
```

Yalnızca dört dilin alt açıklaması güncellenir; src/ölçü/id/order değişmez.

```json
{"action":"remove","categoryId":"general","imageId":"general-001"}
```

Yalnızca bu kategori kaydı çıkarılır ve sıra yeniden düzenlenir. **Fiziksel dosya silinmez**, diğer kategori kayıtları değişmez. Kategoriler eklenemez/silinemez. Kayıt kimliği yalnızca belirtilen kategori içinde aranır; bulunmazsa 404.

### Galeri görselleri

`GET /api/azura/gallery/images`:

```json
{"images":[{"image":"/uploads/gallery/gallery-<server-uuid>.png","mimeType":"image/png","size":123,"width":800,"height":600,"modifiedAt":"2026-09-28T10:00:00.000Z"}]}
```

`POST /api/azura/gallery/images`: tek `file` alanlı multipart; `Content-Type` boundary’sini FormData istemcisi oluşturmalıdır. Başarılı yanıt **201**:

```json
{"image":"/uploads/gallery/gallery-<server-uuid>.png","mimeType":"image/png","size":123,"width":800,"height":600}
```

Yalnızca `${AZURA_UPLOADS_ROOT}/gallery/` dizinine sunucunun ürettiği adla, mevcut dosyayı ezmeden yazılır. Listede yalnızca bu dizindeki geçerli dosyalar bulunur; sahte/bozuk dosyalar ve symlink’ler dışlanır. Gerçek JPEG/PNG/WebP, 8 MiB ve 16 milyon piksel sınırları; gerçek okunan baytlar, çözümleme ve ölçü denetimleri korunur. Sıfır `FileHandle.stat().size` bildiren runtime için önceki düzeltme korunmuştur. Yükleme gallery.json’a kayıt eklemez. **POST yanıtındaki `image`, ayrı PATCH add gövdesindeki `src` değeridir.** Mevcut dosyalar, onaylı spa8 kopyası dahil, yeniden dönüştürülmez.

### Sınırlar, hata ve eşzamanlılık

- PATCH gövdesi en fazla **128 KiB** (başlık beyanından bağımsız, okunan UTF-8 baytlar da sayılır). Alt metin her dil için **1–300 karakter**, yalnız boşluk/kontrol karakterleri geçersizdir; geçerli baştaki/sondaki boşluklar korunur.
- 95 kayıt veya 77 dosya sabit sınır değildir. Toplam kayıt/dosya sayısı için bu aşamada ek kota yoktur. Tam sıralama listesi tek PATCH sınırına sığmalıdır: 44 karakterli sunucu kimliklerinde yaklaşık 2.700 kayıt; izin verilen 128 karakterlik kimliklerde yaklaşık 990 kayıt (JSON biçimleme ve diğer alanlar dahil gerçek bayt sınırı belirleyicidir). Daha büyük galeriler için gövde kapasitesi veya ayrı sıralama protokolü tasarlanmalıdır; panel sınırı aşan listeyi sessizce parçalamamalıdır.
- 400 geçersiz işlem/gövde/biçimsiz If-Match; 401 yetkisiz; 404 kategori/kayıt yok; 409 eski revision veya aynı kategoride yinelenen src; 413 boyut aşımı; 415 yanlış Content-Type/desteklenmeyen görsel türü; 428 eksik veya boş If-Match.
- Hatalı istek JSON’u değiştirmez. Her PATCH aynı galeri dosyası için ortak process kuyruğunda **yeniden okuma → revision kontrolü → işlem → tam şema/dosya doğrulama → atomik kayıt** yapar. Hata kuyruğu kilitlemez. Başarılı işlem `/{tr,en,de,ru}/gallery` yollarını revalidate eder. No-op işlemler içerik değişmediği için aynı revision döndürebilir.
- Kuyruk yalnızca **aynı Node.js sürecini** korur; çoklu worker/instance/harici yazıcı için ortak kilit veya transactional veri deposu gerekir. Seed ayrı process’tir, bu kuyruğa katılmaz: ilk kurulum/bakım sırasında, yönetim yazmaları durdurularak çalıştırılmalıdır. Seed mevcut dosyaları ezmese de production yazmalarıyla eşzamanlı çalıştırılmamalıdır.

### Dosya görevleri ve Lago bağlantısı

- `lib/azura-gallery-storage.mjs`: mevcut okuyucu + işlem doğrulama, kanonik revision, ortak kuyruk ve atomik PATCH; ek kök metaverileri korur.
- `app/api/azura/gallery/route.js`: token korumalı GET/PATCH; ortak `azura-page-api.js` sınırlı gövde, If-Match ve revalidation akışını yeniden kullanır. Ortak fabrikaya isteğe bağlı işlem doğrulayıcı/yazıcı eklendi; mevcut sayfa PUT sözleşmeleri aynı kaldı.
- `app/api/azura/gallery/images/route.js`: mevcut `azura-page-image-api.js` üzerinden GET/POST.
- `lib/azura-homepage-media.mjs`: mevcut güvenli yükleme/listeleme akışının sabit `gallery` kapsamı; `pages/` öneki kullanılmaz. Diğer medya kapsamları değişmez.
- `lib/azura-gallery-api.test.mjs`, `lib/azura-gallery-api-http.test.mjs`: izole işlem, güvenlik, paralellik, paylaşım, yayın ve restart kontrolleri. `test:gallery-production` ayrıca Bars/Kids Club HTTP API regresyonlarını çalıştırır.

Lago’nun kategori seçimi bu dokuz sabit Azura kimliğini kullanmalı; `lobby/other` eklememeli, `meeting` korunmalıdır. Panel GET revision’ını saklar; yükleme POST’u sonrasında `image` yolunu add src olarak gönderir; yukarı/aşağı taşıma tam `imageIds` listesi üretir; alt metin editörü dört dili gönderir; kaldırma yalnızca remove PATCH yapar. Her başarılı yanıt yerel gallery/revision’ı yeniler. 409’da yeniden GET yapılıp kullanıcıya çakışma gösterilmeli, eski değişiklik otomatik zorla yazılmamalıdır. Servis tokenı yalnızca Lago sunucusunda saklanmalıdır. Lago reposu bu görevde değiştirilmedi; fiziksel silme davranışı Azura’ya kopyalanmadı. API uygulanmıştır, gerçek Lago → Azura uçtan uca bağlantısı sonraki adımdır.

Galeri API doğrulama sonucu (2026-09-28): galeri birim/okuyucu/seed/bileşen/işlem testleri **6/6**, mevcut ortak medya testleri **7/7**, izole production galeri HTTP testleri **2/2**, Bars ve Kids Club API HTTP regresyonları **2/2** geçti. Next.js 15.5.26 izole build, lint ve `git diff --check` başarılı. İlk API HTTP denemesinde yalnızca test tokenı ortak 32 karakter şartını karşılamadığı için 503 alındı; test tokenı düzeltildi. Boş If-Match beklentisi mevcut 428 sözleşmesiyle eşleştirildi. Başlangıç içerikleri testleri geçirmek için değiştirilmedi. Gerçek tarayıcı/lightbox etkileşim testi ve Lago uçtan uca entegrasyonu yapılmadı; mevcut bileşen testi korunup çalıştırıldı. Canlı kurulum veya deploy yapılmadı; kalıcı dizinler, en az 32 karakter servis tokenı ve bakım sırasında seed kurulumu canlı ortamda ayrıca gereklidir.

## Azura Blog — kalıcı ziyaretçi okuması

İlk aşamada liste/detay sayfaları ve salt okunur depolama/medya sunumu uygulandı. İkinci aşamada aşağıdaki blog yönetim ve görsel API’leri eklendi. Lago panel bağlantısı henüz yapılmadı. Lago’nun `blog.js`, `blog-versions.mjs`, `blog-blocks.mjs`, `blog-policy.mjs`, ziyaretçi sayfaları ve ilgili testleri yalnızca referans alınmıştır; gerçek Lago yazıları, kullanıcıları, oturum veya depolama yapılandırması taşınmamıştır.

### Dosyalar ve akış

- `lib/azura-blog-storage.mjs`: kesin v2 kayıt doğrulaması, güvenli slug/dosya okuma, yayımlanmış liste/detay ve ortak dil seçicileri.
- `lib/azura-blog-content.js`: `server-only` giriş noktası.
- `app/[locale]/news/page.js`: kullanıcının mevcut banner/imgBanner, Azura Journal, kart sınıfları ve ContactSection2 tasarımı korunarak async okuyucu bağlandı; yorumdaki kart listesi etkinleştirildi. Tanımsız t/Image/mainImg giderildi.
- `app/[locale]/news/[slug]/page.js`: mevcut tasarım ve düz metin blok render’ı korunarak Lago admin bağımlılığı kaldırıldı. Metadata ve içerik yalnız yayımlanmış kopyadan gelir. Back link mevcut `BlogNews.all` anahtarını kullanır.
- `i18n/routing.js`: `/news` ve `/news/[slug]` tanımları dört dilde aynı yol olacak şekilde eklendi; diğer adresler/middleware değişmedi. Gerçek adresler `/{tr,en,de,ru}/news` ve `/{tr,en,de,ru}/news/<slug>`.
- `lib/azura-homepage-media.mjs`: mevcut dosya türü/ölçü/güvenlik denetimini kullanan salt okunur `readBlogImage` eklendi. İkinci aşamada blog kapsamlı güvenli yönetim yükleme/listeleme de eklendi.
- `app/api/azura/media/[...segments]/route.js`: mevcut salt okunur sunuma `/uploads/blog/<dosya>` eklendi.
- `scripts/seed-persistent-blog.mjs`: yalnız dizin oluşturur; yazı/görsel kopyalamaz veya üretmez.
- `lib/azura-blog-{storage.test,http.test,test-fixtures}.mjs`, `scripts/test-blog-production.mjs`, package komutları: izole doğrulama. Fixture yazıları yalnız testlerin geçici dizinlerinde oluşturulur.

Kullanıcının dört dilde önceden eklediği `BlogNews.subtitle/title/readMore/empty/all` değerleri aynen korundu; mesaj dosyalarına yeni değişiklik yapılmadı. Liste banner’ının mevcut sabit `News` başlığı ve boş üst başlığı bu kapsamda değişmedi.

### Kesin kayıt şeması

JSON `${AZURA_CONTENT_ROOT}/blog/posts/<slug>.json`, medya `${AZURA_UPLOADS_ROOT}/blog/`, URL `/uploads/blog/<dosya>`; mevcut Azura development/production kök çözümlemesi kullanılır. Aşağıdaki şema gösteriminde `Post` ve `Translation` tip adıdır, dosyaya yazılacak ek alan değildir:

```text
Record = {
  storageVersion: 2,
  slug: string,
  createdAt: ISO-UTC,
  updatedAt: ISO-UTC,
  publicationUpdatedAt: ISO-UTC | null,
  draft: Post (status="draft"),
  published: Post (status="published") | null
}
Post = {
  slug: string,
  status: "draft" | "published",
  coverImage: "" | "/uploads/blog/<dosya>",
  publishedAt: ISO-UTC,
  updatedAt: ISO-UTC,
  translations: {tr: Translation, en: Translation, de: Translation, ru: Translation},
  contentBlocks: Block[]
}
Translation = {title: string, excerpt: string, content: string,
               seoTitle: string, seoDescription: string}
Block = {
  id: string,
  headingLevel: "h2" | "h3",
  image: "" | "/uploads/blog/<dosya>",
  translations: {
    tr: {heading: string, content: string}, en: {heading: string, content: string},
    de: {heading: string, content: string}, ru: {heading: string, content: string}
  }
}
```

Dört dil nesnesi ve tüm alt alanları zorunlu; çevrilmeyen alanlar boş string olabilir. Her Post’ta en az bir dolu başlık bulunmalıdır. Slug dosya adı ve her iki kopyada aynı olmalı; yalnız küçük ASCII harf/rakam ve arada tek tire, en fazla 120 karakter. Blok kimlikleri yazı kopyası içinde benzersiz, en fazla 128 ASCII harf/rakam/alt çizgi/tire; ilk karakter harf/rakam. Blok sırası dizi sırasıdır. Bilinmeyen/eksik alanlar reddedilir. `storageVersion:1` otomatik dönüştürülmez; gerekirse ayrı açık geçiş gerekir.

Tarihler Lago’nun normalleştirilmiş UTC ISO biçimidir (`2026-09-01T10:00:00.000Z`); takvim dışı tarihler reddedilir. `published:null` olduğunda `publicationUpdatedAt:null` gerekir. Yayın kopyası varsa bu tarih dolu olmalıdır. Tarih tek başına yayınlama yapmaz; zamanlanmış yayın görevi bu adımın kapsamında değildir.

Dosya sınırı **2 MiB** gerçek okunan bayt; title/seoTitle/heading **500**, excerpt/seoDescription **4000**, content **100000 karakter**. Kontrol karakterleri reddedilir; içerikte satır sonu/tab ve geçerli boşluklar saklanır. Görseller boş string veya yalnız blog kapsamındaki tek güvenli dosya adıdır; dış URL/HTML/traversal kabul edilmez. Gerçek JPEG/PNG/WebP, **8 MiB / 16 milyon piksel**, çözümleme ve symlink kontrolleri mevcut ortak katmandan gelir. Editör modeliyle uyum için görseller string URL olarak tutulur; JSON’a yeni width/height alanı eklenmez, gerçek ölçüler dosya çözümlemesinde denetlenir; mevcut `fill` yerleşimleri korunur.

### Taslak, yayın ve hata davranışı

`listPublishedBlogPosts` ve `readPublishedBlogPost` yalnız `record.published` döndürür; draft nesnesi ziyaretçi props/metadata’sına verilmez. Taslağı değiştirmek yayını değiştirmez. Her iki kopyanın şeması doğrulanır; yalnız yayımlanmış kopyanın görsel dosyaları açılıp doğrulanır (taslakta seçilmiş henüz bulunmayan dosya yayını etkilemez, güvenli yol şeması yine zorunludur). Liste tarihe göre azalan, eşit tarihte slug’a göre sıralanır.

Boş veya henüz oluşturulmamış blog dizini boş liste verir. Eksik tek kayıt veya `published:null` okuyucuda null, detayda 404’tür. Bozuk JSON/şema, güvensiz dosya ya da eksik yayımlanmış görsel açık hata üretir; sessizce atlanmaz, taslağa dönülmez veya dosya silinmez. İçerik daima React düz metin olarak render edilir; `dangerouslySetInnerHTML` kullanılmaz. İki sayfa `force-dynamic` çalışır: yayın dosyası değişikliği yeni build gerektirmez.

### Dil ve kapak davranışı

Liste, detay ve metadata aynı `selectBlogTranslation` yardımcısını kullanır: istenen dilde trim sonrası dolu title varsa o **çeviri nesnesinin tamamı**, yoksa tr → en → de → ru içinden ilk dolu başlıklı nesne seçilir. Excerpt/content/SEO başka dillerden birleştirilmez. Boş SEO alanı aynı seçili nesnenin title/excerpt alanına döner.

Bloklarda önce yazı için seçilen dil denenir; o dilin heading veya content alanından biri doluysa iki alan birlikte seçilir. İkisi de boşsa tr → en → de → ru sırasındaki ilk dolu blok çevirisi bütünüyle kullanılır. Hepsi boşsa görsel varsa yalnız görsel gösterilir; tamamen boş blok render edilmez. Paragraflar mevcut bileşendeki gibi çift satır sonundan bölünür.

Kapak yoksa listede mevcut Azura `imgBanner` yedeği kullanılır; detayda kapak konteyneri tamamen gösterilmez. Blok görselinin alt metni seçilen blok başlığı, boşsa seçilen yazı başlığıdır.

### İlk kurulum ve doğrulama

```sh
AZURA_CONTENT_ROOT=/kalici/azura/content AZURA_UPLOADS_ROOT=/kalici/azura/uploads npm run seed:blog
npm run test:blog
npm run test:blog-production
```

Seed yalnız eksik blog/posts ve blog medya dizinlerini oluşturur; örnek yazı veya Lago içeriği eklemez, mevcut JSON ve görselleri hiçbir koşulda ezmez. Gerçek kalıcı dizinlerde bu görev sırasında kurulum/yazma yapılmaz. Production runner ayrı geçici checkout/build ve geçici içerik/uploads ile çalışır; geliştirme `.next` çıktısını kullanmaz.

Blog doğrulama sonucu: storage/seed/dil güvenlik testleri **2/2**, izole production blog HTTP testi **1/1**, galeri API HTTP regresyonu **1/1**, ortak medya + galeri işlem testleri **9/9** geçti. Next.js 15.5.26 production build, lint ve `git diff --check` başarılı. Boş liste, taslak-only 404, yayımdan ayrı taslak, dört dil/fallback, kapaksız detay, H2/H3/paragraflar/blok görselleri, düz metin HTML kaçışı, dosya URL’si, bozuk kayıtta 500 ve restart kalıcılığı HTTP üzerinden doğrulandı. Çalıştırılan kapsamda başarısız test kalmadı; tüm proje test paketi çalıştırılmadı. Gerçek tarayıcı/piksel testi ve canlı kurulum/deploy yapılmadı.

### Blog yönetim API’leri — ikinci aşama, uygulanmış sözleşme

Bütün aşağıdaki endpoint’ler `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister. Token sunucuda en az 32 karakter olmalıdır; yanlış/eksik Bearer 401, yapılandırılmamış servis tokenı 503. Yanıtlar `Cache-Control: no-store` taşır. Servis tokenı yalnız Lago sunucusunda tutulmalı, tarayıcıya gönderilmemelidir. Lago entegrasyonu bu görevde yapılmadı.

**GET `/api/azura/blog/posts`**:

```json
{"posts":[{"record":"<yukarıdaki storageVersion:2 Record nesnesi>","revision":"<64 küçük harf SHA-256>"}]}
```

Şemadaki `record` gerçekte string değil, tam Record nesnesidir; bu gösterim tekrar eden şemayı kısaltır. Liste taslak-only kayıtları da içerir, updatedAt azalan/slug artan sıralıdır. Boş liste `{ "posts": [] }`. Liste okuyucusu bozuk kaydı sessizce atlamaz.

**GET `/api/azura/blog/posts/<slug>`** → `{ "record": Record, "revision": "<SHA-256>" }`. Bulunmayan kayıt 404. Slug güvenli ASCII harf/rakam ve arada tek tire, en fazla 120 karakter; yol taşıması 400.

**POST `/api/azura/blog/posts`**, `Content-Type: application/json`:

```json
{
  "slug":"yeni-yazi",
  "draft":{
    "coverImage":"",
    "publishedAt":"2026-09-28T10:00:00.000Z",
    "translations":{
      "tr":{"title":"Başlık","excerpt":"","content":"","seoTitle":"","seoDescription":""},
      "en":{"title":"","excerpt":"","content":"","seoTitle":"","seoDescription":""},
      "de":{"title":"","excerpt":"","content":"","seoTitle":"","seoDescription":""},
      "ru":{"title":"","excerpt":"","content":"","seoTitle":"","seoDescription":""}
    },
    "contentBlocks":[]
  }
}
```

Başarı **201** `{record,revision}`. Her zaman yalnız taslak oluşturur; `published:null`, `publicationUpdatedAt:null`. Yeni kaynak için If-Match gerekmez; mevcut slug 409 verir ve dosyası ezilmez. Slug, draft.status, updatedAt/createdAt ve storageVersion istemciden Draft içine alınmaz; sunucu üretir. Kurulum dizinleri yoksa 503 ve `seed:blog` gereksinimi döner; mevcut içerik otomatik seed ile ezilmez.

**PUT `/api/azura/blog/posts/<slug>`**:

```http
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "<GET veya son başarılı yazma yanıtındaki revision>"
```

Tam olarak şu üç işlemden biri:

```text
{ "action": "save", "draft": DraftInput }
{ "action": "publish" }
{ "action": "unpublish" }
```

`DraftInput`, POST örneğindeki tam dört alanlı draft nesnesidir: `coverImage`, `publishedAt`, `translations`, `contentBlocks`. Blok şeması ilk aşamayla aynı kalır: `{id,headingLevel,image,translations:{tr:{heading,content},en:{heading,content},de:{heading,content},ru:{heading,content}}`. Bilinmeyen/eksik alanlar reddedilir. Kaydetmek yayınlamak değildir:

- `save`: yalnız draft ve kök updatedAt değişir; published/publicationUpdatedAt korunur. Taslak görsellerinin gerçek dosyaları doğrulanır.
- `publish`: mevcut kayıtlı taslak derin kopyalanarak published yapılır; publicationUpdatedAt/kök updatedAt güncellenir. İstek içinde yeni taslak kabul edilmez; editör önce save, dönen revision ile publish yapmalıdır. Taslağın publishedAt değeri korunur; bu alan zamanlanmış yayın görevi oluşturmaz.
- `unpublish`: yalnız yayın kopyası ve publicationUpdatedAt null yapılır, kök updatedAt güncellenir; taslak korunur.

Her başarılı PUT **200** `{record,revision}` döndürür. Slug yeniden adlandırma bu aşamada yoktur. Yayınlanan içerik `/tr/news`, `/en/news`, `/de/news`, `/ru/news` ve ilgili detay yollarında revalidate edilir. Taslak kaydı ziyaretçi içeriğine veya metadata’ya sızmaz.

**DELETE `/api/azura/blog/posts/<slug>`**: Bearer ve tırnaklı If-Match zorunlu; gövde gönderilmez. Başarı **200**:

```json
{"deleted":true,"slug":"yeni-yazi"}
```

Yalnız bu yazının JSON dosyası kaldırılır. **Kapak/blok görselleri fiziksel olarak silinmez**, başka yazıların dosyaları veya kayıtları değiştirilmez. Silinmiş kaynak tekrar okunduğunda 404’tür. Fiziksel görsel temizleme endpoint’i yoktur.

### Blog medya sözleşmesi

**GET `/api/azura/blog/images`**:

```json
{"images":[{"image":"/uploads/blog/blog-<server-uuid>.png","mimeType":"image/png","size":123,"width":800,"height":600,"modifiedAt":"2026-09-28T10:00:00.000Z"}]}
```

**POST `/api/azura/blog/images`**: tek `file` alanlı multipart. Başarı **201**:

```json
{"image":"/uploads/blog/blog-<server-uuid>.png","mimeType":"image/png","size":123,"width":800,"height":600}
```

Dönen `image`, DraftInput.coverImage veya contentBlocks[].image alanına alınır. Yükleme hiçbir yazıyı oluşturmaz/değiştirmez/yayımlamaz; ayrı save ve publish gerekir. Sadece `${AZURA_UPLOADS_ROOT}/blog/` kullanılır. JPEG/PNG/WebP, 8 MiB, 16 milyon piksel, gerçek dosya imzası/çözümleme, gerçek bayt boyutu, symlink/dizin güvenliği ve sunucu adıyla üzerine yazmayan atomik medya kaydı mevcut ortak katmandan gelir. Önceki sıfır `FileHandle.stat().size` düzeltmesi korunur. Sahte/bozuk veya symlink dosyalar listelenmez.

### Revision, atomik kayıt ve sınırlar

Revision bütün doğrulanmış v2 Record’un kanonik SHA-256 hash’idir; draft, published ve tarihleri kapsar, JSON’a yazılmaz. Nesne anahtarlarının sırası hash’i etkilemez; blok dizisi sırası etkiler. PUT/DELETE için eksik/boş If-Match 428, biçimsiz başlık 400, eski revision 409; dosya değişmez. İçerik/gövde hataları 400, yetki 401, bulunmayan yazı 404, içerik/medya boyut aşımı 413, yanlış Content-Type/desteklenmeyen görsel 415.

POST/PUT gövdesi **128 KiB**; saklanan tam Record **2 MiB** sınırındadır. İlk aşamanın metin sınırları ve dört dil/benzersiz blok/H2-H3 kuralları korunur; geçerli boşluklar normalleştirilmez. İstek başlığına güvenilmez, okunan gerçek baytlar da sınırlandırılır.

Tüm blog oluşturma/PUT/DELETE işlemleri aynı gerçek posts dizinine ait ortak process içi kuyruk kullanır. Kilit içinde yeniden okuma → revision kontrolü → işlem/doğrulama → atomik yazma yapılır. Güncelleme geçici dosya+fsync+rename, ilk oluşturma geçici dosya+fsync+exclusive hard-link ile mevcut dosyayı ezmeden yayımlanır. Silme unlink ve dizin fsync kullanır. Başarısız doğrulama eski dosyayı korur; başarısız işlem kuyruğu kilitlemez. Aynı revision ile paralel PUT’larda bir 200, bir 409 döner. Kaynak zaten silindiyse sonraki işlem 404’tür.

Kuyruk yalnız **aynı Node.js sürecini** korur. Birden fazla worker/instance veya harici yazıcı için ortak kilit/transactional depolama gereklidir; seed ve harici dosya düzenlemeleri production yönetim yazmalarıyla eşzamanlı çalıştırılmamalıdır. İlk oluşturmanın exclusive kaydı başka process’in mevcut dosyasını da ezmez; bu, tüm güncellemeler için süreçler arası kilit yerine geçmez.

### İkinci aşamada gerçekten eklenen/değişen dosyalar

- `app/api/azura/blog/posts/route.js`: GET/POST.
- `app/api/azura/blog/posts/[slug]/route.js`: GET/PUT/DELETE.
- `app/api/azura/blog/images/route.js`: ortak medya handler’ıyla GET/POST.
- `lib/azura-blog-api.js`: Bearer, sınırlı JSON gövdesi, If-Match, hata kodları ve revalidation.
- `lib/azura-blog-management.mjs`: yönetim okuması, revision, oluşturma/save/publish/unpublish/delete, ortak kuyruk ve dosya doğrulaması.
- `lib/azura-blog-storage.mjs`: güvenli Record okuyucusu ayrıştırıldı; ziyaretçi okuyucusu aynı published-only davranışını korur.
- `lib/azura-page-storage.mjs`: ilk oluşturma için opsiyonel exclusive atomik kayıt; mevcut çağrıların rename davranışı aynı.
- `lib/azura-homepage-media.mjs`: sabit blog kapsamlı listeleme/yükleme, mevcut güvenlik yardımcıları yeniden kullanılır.
- `lib/azura-blog-management.test.mjs`, `lib/azura-blog-api-http.test.mjs`, package komutları ve README: ikinci aşama testleri ve kesin sözleşme.

Ziyaretçi sayfalarının tasarımı, mesajlar ve mevcut içerikler ikinci aşamada değiştirilmedi. Git durumunda görülen birinci aşama dosyaları önceki çalışmadan kalmıştır. Lago bağlantısı, canlı kurulum, commit ve deploy yapılmadı.

İkinci aşamada yeniden çalıştırılan sonuçlar: blog storage/seed/model + yönetim birim testleri **3/3**; blog ziyaretçi ve yönetim production HTTP testleri **2/2**; galeri API production HTTP regresyonu **1/1**; ortak medya ve galeri yönetim regresyonları **9/9** geçti. Next.js 15.5.26 izole production build, lint ve `git diff --check` başarılı. Bu kapsamda yeni veya mevcut başarısız test kalmadı; tüm proje test paketi çalıştırılmadı. Gerçek tarayıcı/piksel testi yapılmadı; HTTP testleri geçici içerik/uploads ve ayrı build dizininde çalıştı. Gerçek kullanıcı içeriğine test verisi yazılmadı.

## Dinamik sayfalar — ziyaretçi gösterimi, ilk aşama

Önce Azura yalnızca kodda tanımlı sayfaları gösteriyordu. Şimdi tek segmentli
`/[locale]/<slug>` adresi, Azura'nın kalıcı dosyasındaki **published** kopyasını
okur. Gelecekte Lago editörü Azura yönetim API'sine yazacak; ziyaretçi sitesi
Lago'dan veri çekmeyecek. Yönetim/yükleme/geçmiş API'leri aşağıdaki ikinci aşamada uygulanmıştır; Lago panel
bağlantısı yoktur. Yayımlanmış görünür sayfalar header menüsüne aşağıdaki menü entegrasyonuyla eklenir.

### Kurulum ve dosyalar

Yerel: `npm run seed:dynamic-pages -- --local`.
Production: `AZURA_CONTENT_ROOT=/kalici/azura-content AZURA_UPLOADS_ROOT=/kalici/azura-uploads npm run seed:dynamic-pages`.
Seed yalnızca `pages/` ve `dynamic-pages/` dizinlerini oluşturur; örnek sayfa,
JSON veya görsel yazmaz. Tekrar çalışması mevcut verileri değiştirmez.
Kayıt: `${AZURA_CONTENT_ROOT}/pages/<UUID>.json`; medya:
`${AZURA_UPLOADS_ROOT}/dynamic-pages/<dosya>` → `/uploads/dynamic-pages/<dosya>`.
Boş kurulum geçerlidir. Kaybolmuş tek sayfa 404; bozuk kayıt açık hatadır.

- `lib/azura-pages/schema.mjs`, `block-definitions.mjs`, `section-renderer-registry.mjs`: Lago'nun içerikten bağımsız editör sözleşmesi, fabrika ve renderer tanımları.
- `lib/azura-pages/validation.mjs`: kesin alan, dil, tarih, kimlik, varyant ve bağlantı doğrulaması.
- `lib/azura-pages/routes.mjs`: tek slug normalizasyonu, ayrılmış adresler ve dil URL'leri.
- `lib/azura-dynamic-pages-storage.mjs`: güvenli dosya okuma, published seçimi, çakışma ve görsel denetimi, menü okuyucusu.
- `lib/azura-dynamic-pages-content.js`: server-only giriş.
- `app/[locale]/[...rest]/page.js`: tek segmentli yayın ve metadata.
- `app/[locale]/_dynamic-page/*`: yalnız dinamik sayfalara ait veri odaklı gösterimler; mevcut statik bileşenlerin yerine geçmez.
- `DynamicPageLocaleContext.jsx`, `LocaleSwitcherSelect.jsx`, locale layout: mevcut header dil seçicisine aynı dinamik sayfanın hedef slug'ını iletir. Statik yönlendirme korunur.
- Ortak medya okuyucusu ve salt okunur medya route'u: yalnız yeni dynamic-pages kapsamını ekler.
- `scripts/seed-persistent-dynamic-pages.mjs`: veri ezmeyen dizin kurulumu.
- `lib/azura-dynamic-pages*.test.mjs` ve `scripts/test-dynamic-pages-production.mjs`: geçici veriler, izole build/HTTP/regresyonlar.

### Kesin kayıt ve sayfa sözleşmesi

```js
{
  storageVersion: 2,
  id: "UUID", createdAt: "ISO UTC", updatedAt: "ISO UTC",
  publishedAt: null /* veya ISO UTC */,
  history: [],
  draft: Page /* status: "draft" */,
  published: null /* veya Page, status: "published" */
}
```

`Page` tam alanları:
```js
{
  id: "aynı UUID", schemaVersion: 1, template: "standard",
  slugs: {tr: "...", en: "...", de: "...", ru: "..."},
  status: "draft" /* veya published */, showContactSection: false,
  hero: {image: "", overlay: true, translations: {
    // Her dil: {eyebrow, title, imageAlt}
  }},
  navigation: {visible: true, order: 100, translations: {
    // Her dil: {label}
  }},
  seo: { /* Her dil: {title, description} */ },
  sections: [], createdAt: "ISO UTC", updatedAt: "ISO UTC"
}
```

Bütün translations/seo nesneleri tam `tr,en,de,ru` içerir. Metinler düz
string'dir; boş değerler editörün boş alanlarıyla uyumludur, boşluklar korunur.
Metin sınırı 100.000 karakter, kayıt dosyası sınırı 4 MiB'dir (geçmiş dahil).
Kontrol karakterleri reddedilir. Tarihler `YYYY-MM-DDTHH:mm:ss.sssZ` biçimindedir.
History öğesi Lago ile aynı:
`{versionId,createdAt,action:"draft-save",createdBy:null|{id,username,displayName,role},wasPublished,draft}`.
Geçmiş doğrulanır ve ziyaretçiye verilmez; yönetim işlemleri aşağıda açıklanır.
Bilinmeyen/eksik alanlar reddedilir. Kayıt kimliği ve dosya adı UUID eşleşmelidir.

Her bölüm `{id,type,enabled,translations,...alanlar,variant?}` içerir. Bölüm
sırası sections dizisidir; enabled=false gösterilmez. Aşağıdaki metin alanları
her dilde bulunur; başka tip/varyant kabul edilmez.

| Tip | Varyant | Ortak alanlar | Her dilde metin alanları |
|---|---|---|---|
| intro | centered | — | eyebrow,title,text |
| imageText | imageLeft / imageRight | image,imagePosition:left/right | eyebrow,title,text,imageAlt,buttonText,buttonHref |
| twoAnimationImage | overlap | backgroundImage,foregroundImage | eyebrow,title,text,text2,backgroundImageAlt,foregroundImageAlt,buttonText,buttonHref |
| spaInfo | splitImages | leftImage,rightImage | eyebrow,title,text,leftEyebrow,leftTitle,leftText,leftImageAlt,rightEyebrow,rightTitle,rightText,rightItems,rightImageAlt |
| otherOptions | carousel | options | eyebrow,title,buttonText |
| gallery | horizontal | images | eyebrow,title,text |
| carousel | centered | images | eyebrow,title,text |
| callToAction | image | image,overlay | eyebrow,title,text,imageAlt,buttonText,buttonHref |
| cardCollection | grid / carousel | displayMode:grid/carousel,cards | eyebrow,title,text |

`images` öğesi: `{id,src,order,translations:{<dil>:{imageAlt}}}`.
`cards` öğesi: `{id,image,order,translations:{<dil>:{title,text,imageAlt,buttonText,buttonHref}}}`.
`options` öğesi: `{id,image,order,translations:{<dil>:{eyebrow,title,size,capacity,text,imageAlt,buttonHref}}}`.
Koleksiyonlar boş veya değişken uzunlukta olabilir. Kimlikler (en fazla 128
karakter) ve negatif olmayan tam sayı order değerleri koleksiyon içinde
benzersizdir. Görseller string olarak kalır; editör uyumu için zorunlu ölçü
nesnesine dönüştürülmez. Gerçek tür/ölçü sunucuda denetlenir.

### Yayın, URL, dil ve güvenlik

Yalnız published metinleri, medya ve SEO gösterilir; değişen draft canlı
kopyayı etkilemez. `force-dynamic` ile dosya değişikliği rebuild gerektirmez.
Aynı dilde aynı published slug'a sahip iki kayıt açık hata üretir.

Slug NFC Unicode normalizasyonu + dilin küçük harf dönüşümünü kullanır;
harf/rakam ve tek tire ayırıcıları, en fazla 160 karakter kabul edilir.
Saklanan slug zaten normalleştirilmiş olmalıdır. next-intl rewrite sonrası kodlu kalabilen route parametresi sınırda bir kez
çözülür; sonuçta kalan yüzde, slash ve traversal reddedilir. Depolanan slug
üzerinde URL-decode uygulanmaz.
URL üretiminde encodeURIComponent kullanılır. Büyük harfle gelen geçerli
adres aynı normalize edilmiş sayfayı bulur; otomatik canonical redirect yoktur.
Statik route kökleri, yerelleştirilmiş karşılıkları ve panel/api/uploads/_next
alanları tüm dillerde ayrılmıştır. İç içe dinamik adres desteklenmez;
`/news/[slug]` ve statik route'lar korunur.

Dil seçici aynı sayfanın hedef dil slug'ına gider. SEO/hero/bölümler seçilen
dilin bütün nesnesini kullanır; farklı dillerden alan birleştirmez. Dört dil
zorunlu olduğundan boş çeviri otomatik başka dil metniyle doldurulmaz.
Metadata başlığı: seçili seo.title → hero.title → `Azura Deluxe Hotel`.
`showContactSection` yalnız mevcut ContactSection2 gösterimini koşullandırır.

Bağlantılar yalnız yerel `/...`, `#anchor` veya kimlik bilgisi içermeyen
`https://...` olabilir; javascript/data/protocol-relative URL reddedilir.
İçerik HTML olarak çalıştırılmaz. Medya yalnız dynamic-pages kapsamında gerçek
JPEG/PNG/WebP, 8 MiB ve 16 milyon piksel sınırındadır; symlink/dizin dışına
çıkma reddedilir. Diğer sayfa/galeri klasörleri otomatik yetkilendirilmez.

### İlk aşamanın entegrasyon notları (API ikinci aşamada eklendi)

Lago formu yukarıdaki alan/blok sözleşmesini kullanabilir; medya seçicisi Azura
kapsamına ve desteklenen türlere sınırlanmalı. Aşağıdaki yönetim API'sinde kalıcı
UUID ile liste/oluşturma/okuma/taslak/yayın/yayından kaldırma/silme, Bearer yetki,
If-Match/revision, kilit içinde yeniden okuma ve atomik kayıt gerekir. Geçmiş
oluşturma/geri yükleme ikinci aşamada uygulanmıştır; fiziksel görseller otomatik
silinmez. Yükleme API'si aşağıda belgelenmiştir.

`listDynamicPageNavigation(locale)` yalnız yayımlanmış görünür sayfaları
`{id,label,href,order}` olarak verir. Menü entegrasyonu bu sonucu iki header'a
sunucu prop'u olarak aktarır; dinamik bağlantılar mevcut sabit bağlantılardan sonra gelir.

Doğrulama komutları: `npm run test:dynamic-pages`,
`npm run test:dynamic-pages-production`, `npm run lint`, `git diff --check`.
Production betiği ayrı geçici checkout/build ve içerik/uploads kullanır;
çalışan geliştirme sunucusunun .next çıktısına veya gerçek içeriğe yazmaz.

Bu uygulamanın doğrulama notu: dinamik sayfa birim testleri 5/5, dört dilde
production HTTP/yayın/restart testi başarılı; Next.js 15.5.26 production build,
lint ve diff kontrolü geçti. Blog birim 3/3, galeri birim 6/6 ve anasayfa
birim/API 58/58 başarılı. Oda birim testlerinde 8/11 geçti; üç eski metin
eşliği beklentisi mevcut `azure` eklenmiş içeriklerle uyuşmuyor. Oda HTTP
regresyonu Fantasy detayına ulaşınca eksik fixture nedeniyle 500 beklenmedik
sonucuna düşüyor: fixture yalnız rooms/homepage/shared verisini kuruyor,
Fantasy kalıcı detay dosyasını kurmuyor. Bunları geçirmek için içerikler veya
mevcut testler değiştirilmedi. Gerçek tarayıcı/piksel ve etkileşimli carousel
karşılaştırması yapılmadı; dil bağlantısı birim ve dört dil HTTP düzeyinde
kontrol edildi.

## Dinamik sayfalar — ikinci aşama: uygulanmış yönetim API'leri

Bu bölüm artık öneri değildir. Lago bağlantısı/header menüsü/arayüz yapılmadı;
Azura'nın aşağıdaki sunucular arası uçları uygulandı. Bütün yanıtlar
`Cache-Control: no-store` ve bütün uçlar
`Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister. Bu token bir insan
kullanıcısının rolü değildir; Lago proxy'si kendi rollerini ayrıca denetlemelidir.

### Tam istek sözleşmesi

`POST /api/azura/pages`, `Content-Type: application/json`, örnek eksiksiz gövde:

```json
{
  "draft": {
    "schemaVersion": 1,
    "template": "standard",
    "slugs": {"tr":"ozel-konaklama","en":"special-stay","de":"besonderer-aufenthalt","ru":"особый-отдых"},
    "showContactSection": false,
    "hero": {
      "image": "",
      "overlay": true,
      "translations": {
        "tr":{"eyebrow":"","title":"Özel konaklama","imageAlt":""},
        "en":{"eyebrow":"","title":"Special stay","imageAlt":""},
        "de":{"eyebrow":"","title":"Besonderer Aufenthalt","imageAlt":""},
        "ru":{"eyebrow":"","title":"Особый отдых","imageAlt":""}
      }
    },
    "navigation": {
      "visible": false,
      "order": 100,
      "translations": {"tr":{"label":""},"en":{"label":""},"de":{"label":""},"ru":{"label":""}}
    },
    "seo": {
      "tr":{"title":"","description":""},
      "en":{"title":"","description":""},
      "de":{"title":"","description":""},
      "ru":{"title":"","description":""}
    },
    "sections": []
  }
}
```

Başarı **201**: `{record,revision}`. `record` yukarıdaki storageVersion:2 tam
kayıttır. UUID, createdAt/updatedAt sunucuda üretilir; `draft.status="draft"`,
`published=null`, `publishedAt=null`, `history=[]`. İstemci draft içindeki
`id,status,createdAt,updatedAt` alanlarını göndermez; bunlar salt okunurdur.
İstemci kökte history/published/id gönderirse de 400 döner. Bloklar ve dört dil
alanları birinci aşamadaki sözleşmenin aynısıdır; ikinci editör şeması yoktur.

| Uç | İstek gövdesi | Başarılı yanıt |
|---|---|---|
| GET /api/azura/pages | yok | 200 `{pages:[{record,revision}]}` |
| POST /api/azura/pages | yukarıdaki `{draft}` | 201 `{record,revision}` |
| GET /api/azura/pages/[id] | yok | 200 `{record,revision}` |
| PUT /api/azura/pages/[id] | `{action:"save",draft}` | 200 `{record,revision}` |
| PUT /api/azura/pages/[id] | `{action:"publish"}` | 200 `{record,revision}` |
| PUT /api/azura/pages/[id] | `{action:"unpublish"}` | 200 `{record,revision}` |
| DELETE /api/azura/pages/[id] | **yok** | 200 `{deleted:true,record,revision}` |
| GET /api/azura/pages/[id]/history | yok | 200 `{record,revision}`; geçmiş `record.history` içinde |
| POST /api/azura/pages/[id]/history/[versionId]/restore | **yok** | 200 `{record,revision}` |

DELETE yanıtındaki record/revision silinen son kaydın teyididir; dosyada bir
tombstone veya yeniden kullanılabilir revision saklanmaz. Sonraki GET 404'tür.
Silme geri dönüşüm kutusu oluşturmaz; bu aşamada fiziksel JSON kaydını kaldırır,
görselleri **silmez**.

PUT, DELETE ve restore her zaman `If-Match: "<64 küçük harf SHA-256>"` ister.
PUT ayrıca application/json ister. Restore/DELETE `{}` dahil gövde kabul etmez.
İşlem başına bilinmeyen/eksik alanlar reddedilir. Save, publish ve unpublish
ayrı isteklerdir; publish yalnız daha önce kaydedilmiş taslağı yayınlar.

Tam save isteği, yukarıdaki POST nesnesinin aynı draft içeriğiyle:
```js
const response = await fetch(`/api/azura/pages/${id}`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${serviceToken}`,
    "Content-Type": "application/json",
    "If-Match": `"${revision}"`
  },
  body: JSON.stringify({action: "save", draft: createRequest.draft})
});
const saved = await response.json(); // {record, revision}
```
Yayın isteğinde gövde tam olarak `{"action":"publish"}`, yayından kaldırmada
`{"action":"unpublish"}` olur. Her başarılı cevabın revision'ı bir sonraki
mutasyon başlığında kullanılmalıdır.

### Revision, atomik kayıt ve adres kuralları

Revision bütün record'un (draft, published, history, sunucu zamanları dahil)
kanonik JSON SHA-256 değeridir; dosyaya revision yazılmaz. Hatta aynı taslağın
tekrar kaydı updatedAt nedeniyle revision değiştirir. İçerik aynıysa gereksiz
geçmiş snapshot'ı oluşturulmaz.

Bütün sayfa dosyaları **aynı pages dizini kuyruğunu** kullanır. Oluşturma,
kayıt, yayın, restore ve silme sırasında dosyalar kilit altında yeniden okunur;
revision, şema, gerçek medya ve slug denetimlerinden sonra mevcut ortak atomik
geçici dosya/fsync/rename mekanizması çalışır. Yeni dosyada exclusive kayıt
kullanılır. Hata kuyruğu kilitlemez. Bu koruma yalnız **aynı Node.js süreci**
içindir; birden fazla worker/container veya dışarıdan dosya yazan araç arasında
kilit sağlamaz. Böyle bir deployment için ortak işlem/kilit sistemi gerekir.
Seed veri yazmaz ama kurulum/manuel dosya taşıma işlemleri canlı yönetim
mutasyonlarıyla eşzamanlı yürütülmemelidir.

Slug rezervasyonu Lago'daki gibi diğer bütün kayıtların **draft + published**
kopyalarını kapsar; kendi iki kopyası birbirini engellemez. Oluşturma/save/
restore/publish denetler. Eski yayın adresi, taslak adresi değişse bile yeni
sürüm yayınlanana veya sayfa yayından kaldırılana kadar ayrılmış kalır.
Yayından kaldırmada mevcut taslağın adresi hâlâ ayrılmıştır. Silme iki kopyanın
rezervasyonunu kaldırır. Başlangıçta dışarıdan çakışan iki taslak yazılmışsa
iki yayın isteği de 409 alabilir; rastgele birine öncelik verilmez.

Başarılı işlemler önceki ve sonraki published dört dil yollarını yeniden
 doğrular. Slug değişikliği yayınlanınca eski adres 404; yönlendirme geçmişi
oluşturulmaz. Save/restore eski canlı adresi, metadata'yı, dil geçişini ve
navigation okuyucusunu değiştirmez. Yayından kaldırma/silme ziyaretçide 404'tür.

### Geçmiş ve restore

Lago alanları korunur:
`{versionId,createdAt,action:"draft-save",createdBy:null,wasPublished,draft}`.
- İlk oluşturma geçmiş oluşturmaz.
- Anlamlı save önceki taslağı snapshot yapar (yeni taslağı değil).
- Publish/unpublish snapshot oluşturmaz; canlı kopya ayrı tutulur.
- Restore seçilen sürümü önce belleğe alır, mevcut taslağı snapshot yapar ve
  seçilen içeriği güncel sunucu zamanıyla yalnız taslağa koyar. Canlı kopya aynı kalır.
- Başka sayfanın versionId'si 404; restore medya/slug/şema denetiminden geçer.
- Varsayılan **3** snapshot; `AZURA_PAGE_HISTORY_LIMIT` tam sayı **1–100**.
  Sonraki snapshot en yeniyi öne ekleyip sınırı aşan eskileri düşürür.
- createdBy **null**: servis tokenından sahte insan/rol bilgisi türetilmez.

### Medya sözleşmesi

`GET /api/azura/pages/images` → 200:
```json
{"images":[{"image":"/uploads/dynamic-pages/dynamic-pages-UUID.png","mimeType":"image/png","size":1234,"width":800,"height":600,"modifiedAt":"2026-09-29T00:00:00.000Z"}]}
```
`POST /api/azura/pages/images`: tek `file` alanlı multipart/form-data → 201:
```json
{"image":"/uploads/dynamic-pages/dynamic-pages-UUID.png","mimeType":"image/png","size":1234,"width":800,"height":600}
```
Adı sunucu üretir; dosya üzerine yazılmaz. image değeri mevcut string hero/
blok image/src alanına verilir; form sözleşmesi ölçü nesnesine dönüştürülmez.
Yüklemek JSON/taslak/yayın oluşturmaz. Görseli draft save ile seçip ayrı publish
isteğiyle yayınlamak gerekir. Sayfa/blok silme ve restore dosya silmez.
Diğer sayfa/galeri/blog medya dizinleri kabul edilmez. Dosya boyutu yalnız
FileHandle.stat() sonucuna dayanmaz; gerçek okunan baytlar ayrıca denetlenir.

### Sınırlar, hatalar ve kurulum

- JSON istek: **128 KiB**; Content-Length olmasa da akış sırasında sınırlı.
- Her metin: **100.000 karakter**, önceki şema sınırı; paragraf satır sonları
  ve geçerli boşluklar korunur. HTML/JS çalıştırılmaz.
- Sayfa: **100 bölüm**, bölümdeki her koleksiyon **200 öğe**; dosya/geçmiş dahil
  **4 MiB**. HTTP 128 KiB sınırı bir isteğin gerçek kullanılabilir kapasitesini
  ayrıca sınırlar; bu sayılar başlangıç içerik sayısına bağlı değildir.
- Koleksiyon kimlikleri en fazla 128 karakter; sıra negatif olmayan benzersiz
  tam sayıdır. Dört dil ve bilinen tip/varyantlar zorunludur.
- Görsel: JPEG/PNG/WebP, **8 MiB**, **16 milyon piksel**; multipart toplamı
  **8 MiB + 128 KiB** ve akış sırasında denetlenir. Gerçek çözülebilirlik/tür/
  ölçü, güvenli dizin ve symlink kontrolleri korunur.
- 400 geçersiz JSON/şema/kimlik/If-Match; 401 yetkisiz; 404 bulunamayan kayıt/
  sürüm; 409 eski revision veya slug çakışması; 413 boyut; 415 Content-Type/
  görsel türü; 428 eksik If-Match; 503 eksik token/kurulum veya geçersiz geçmiş
  sınırı. Başarısız doğrulama/revision isteği dosyayı değiştirmez.

Yerel kurulum:
```sh
npm run seed:dynamic-pages -- --local
```
Production kurulum (**--local kullanılmaz**):
```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads npm run seed:dynamic-pages
```
Aynı dizin değişkenlerini ve ayrı servis tokenını çalışan Next sunucusuna verin.
Kurulmamış pages/dynamic-pages dizinleri yönetim uçlarında anlaşılır 503 verir.
Bu geliştirme ortamında canlı production kurulumu veya Lago bağlantısı yapılmadı.

İkinci aşama dosyaları: `azura-dynamic-pages-management.mjs` ortak kuyruk ve
yaşam döngüsü; `azura-dynamic-pages-api.js` yetki/HTTP/revalidation; beş route
ailesi; `azura-json-request.mjs` blog ile paylaşılan sınırlı JSON okuyucu;
ortak medya modülündeki yeni scope wrapper'ları; yönetim birim/HTTP testleri.
İlk aşama okuyucusu yönetim için ham kayıt okuyucusunu paylaşır; ziyaretçi
okuyucusu yalnız published döndürmeye devam eder.

İkinci aşamada yeniden çalıştırılan doğrulama: dinamik okuyucu + yönetim birim
**10/10**, dinamik ziyaretçi + yönetim production HTTP **2/2**, blog birim
**3/3** ve HTTP **2/2**, galeri birim **6/6** ve API HTTP **1/1**, ortak medya
**7/7**, anasayfa HTTP **3/3** geçti. Next.js 15.5.26 izole production build,
lint ve `git diff --check` başarılı. Toplu production betiği mevcut oda HTTP
fixture'ının Fantasy verisini kurmaması nedeniyle yine başarısız durum koduyla
biter; yeni dinamik API testleri başarısız değildir. Gerçek kullanıcı dosyaları
bu testlerde değiştirilmedi. Gerçek tarayıcı/piksel testi yapılmadı.

Lago proxy uyarlaması: formun aynı içerik alanlarından salt okunur
id/status/createdAt/updatedAt çıkarılıp `draft` gönderilmeli; dönen
`record.draft` editöre, `record.history` geçmiş arayüzüne aktarılmalı. Save ile
publish ayrı isteklerdir ve her adım yeni revision kullanmalıdır. Lago'nun
oturum/rol/edit-lock kodu Azura'ya taşınmadı. İstemci servis tokenını almamalı;
Lago sunucusu Azura'ya Bearer eklemelidir.


### Yayımlanmış dinamik sayfaların header menüsüne bağlanması

Locale layout aynı server-only `listDynamicPageNavigation(locale)` okuyucusunu
bir kez çağırır, sonucu Header ve HeaderWhite'a geçirir. Her header'ın mevcut
responsive açılır menüsü masaüstü ve mobilde aynı listeyi kullanır. Sabit
bağlantılar/sıraları korunur; dinamik bağlantılar listenin sonuna eklenir.
Sıralama navigation.order, eşitlikte kalıcı UUID üzerindendir. Etiket mevcut
okuyucudaki gibi seçili dilin label → hero.title → slug sırasını kullanır;
çeviriler arasında yeni bir fallback eklenmez.

DynamicNavigationLinks hazır /locale/slug href'ini doğrudan next/link'e verir;
next-intl ile tekrar önek eklemez. Tıklama menüyü kapatır. Gizli published sayfa
menüde görünmez ama doğrudan adresinden açılır. Taslak görünürlük/etiket/adres
ve sıra değişiklikleri menüyü etkilemez. Yayından kaldırma, silme veya görünmez
sürümü yayınlama ilgili bağlantıyı kaldırır.

Layout'ta connection() ile menü istek sırasında okunur; bunun sonucu locale
altındaki sayfalar build-time statik menüye bağlı kalmaz, sunucuda render edilir.
Published kopya değiştiğinde mevcut yönetim akışı dört locale layout'unu da
revalidate eder. API sözleşmesi değişmedi. Zaten açık sekmelere canlı push yoktur;
güncel sunucu menüsü yeni istek/sayfa yenilemesinde alınır.

Bu adımın dosyaları: locale layout, Header.jsx, HeaderWhite.jsx,
DynamicNavigationLinks.jsx, azura-dynamic-pages-api.js, navigation birim testi,
dinamik API HTTP testi ve package test komutu. Depolama modeli/okuyucu ve
server-only giriş yeniden kullanıldı; yeni API oluşturulmadı.

## Sertifikalar — kalıcı içerik, ilk aşama

Önce `/[locale]/certificates` sayfası statik görsel importları ve sabit İngilizce
metinler kullanıyordu. Şimdi sunucu `readCertificatesLocale(locale)` ile Azura
JSON'unu ve gerçek görselleri doğrular; aynı bileşenlere props aktarır. Site
Lago'dan veri çekmez. İlk aşamada yalnız veri dönüşümü yapıldı; yönetim/yükleme API'leri aşağıdaki ikinci aşamada eklendi.

Başlangıç `content/site-pages/certificates.json`, kalıcı dosya
`${AZURA_CONTENT_ROOT}/site-pages/certificates.json`; medya
`${AZURA_UPLOADS_ROOT}/pages/certificates/` → `/uploads/pages/certificates/`.

Kesin JSON yapısı:
```js
{
  schemaVersion: 1,
  pageKey: "certificates",
  translations: {
    // tr, en, de, ru: her biri aşağıdaki tam nesneyi içerir
    tr: {
      hero: {eyebrow: "", title: "Certificate"},
      feature: {eyebrow: "Azura Deluxe Hotel certificate", title: "Sustainable Tourism Verification", text: ""},
      gallery: {title: "Certificates", modalAlt: "Enlarged gallery"}
    }
  },
  media: {
    hero: {image: "/uploads/pages/certificates/hero.jpg", width: 1879, height: 1254},
    feature: {
      image: "/uploads/pages/certificates/certificate1en.png", width: 666, height: 939,
      translations: {tr:{alt:"certificate"},en:{alt:"certificate"},de:{alt:"certificate"},ru:{alt:"certificate"}}
    },
    gallery: {images: [
      // Her öğe tam olarak:
      {id: "certificate-tr", src: "/uploads/pages/certificates/certificate1tr.png", order: 0,
       width: 666, height: 939,
       translations: {tr:{alt:"certificate"},en:{alt:"certificate"},de:{alt:"certificate"},ru:{alt:"certificate"}}}
    ]}
  }
}
```
Kök ve alt alanlar kesin doğrulanır. Yalnız `hero.eyebrow` ve `feature.text`
boş olabilir. Metinler en fazla 4000, alt metinler 300 karakterdir. Normal
medyada dört dil alt zorunlu; CSS banner'da kullanılmayan alt alanı yoktur.
Galeri sayısı değişmez kural değildir; boş dizi kabul edilir. Kimlikler benzersiz,
1–80 küçük harf/rakam/tire; order dizi sırasına göre 0'dan kesintisiz başlar.
`src` galeri için Lago'nun mevcut alan adıdır; tek görseller `image` kullanır.
Ölçüler gerçek dosyayla eşleşmelidir. Sadece JPEG/PNG/WebP, 8 MiB ve 16 milyon
piksel; güvenli scope ve symlink kontrolleri uygulanır. Eksik/bozuk dosyada
sessiz fallback yoktur.

| Bileşen | Metin | Medya |
|---|---|---|
| MainBanner2 | hero.eyebrow/title | media.hero (CSS) |
| CertificateSection1 | feature.eyebrow/title/text | media.feature |
| Certificate | gallery.title/modalAlt | media.gallery.images; normal alt kayıttan |

Kaynaklar `app/[locale]/` altındadır. Tam kaynak manifesti
`content/site-pages/certificates-sources.json` dosyasında bulunur:

| Kaynak | uploads/pages/certificates dosyası | Galeri id/order | Ölçü |
|---|---|---|---|
| about/images/Gal_sag.jpg | hero.jpg | — | 1879×1254 |
| certificates/images/certificate1tr.png | certificate1tr.png | certificate-tr / 0 | 666×939 |
| certificates/images/certificate1en.png | certificate1en.png | certificate-en / 1 | 666×939 |
| certificates/images/certificate2.png | certificate2.png | certificate-2 / 2 | 673×939 |
| certificates/images/ISO9001.png | ISO9001.png | iso-9001 / 3 | 986×1428 |
| certificates/images/ISO10002.png | ISO10002.png | iso-10002 / 4 | 1002×1430 |
| certificates/images/ISO14001.png | ISO14001.png | iso-14001 / 5 | 1002×1428 |

**8 medya kullanımı, 7 benzersiz dosya**: öne çıkan görsel galeri ikinci öğesiyle
aynı dosyadır. Hepsi kaynakla bayt eşidir; yeniden boyutlandırma yapılmadı.
Orijinaller durur. Belge/PDF veya indirme bağlantısı yoktur; görsel tıklaması
mevcut modalı açar. Bu sayfada ContactSection2 bulunmaz, eklenmedi.

Mevcut tutarsızlıklar: dört dilde de İngilizce sabit metinler vardı; çeviri
uydurulmadan korundu. Footer'daki certificates çevirileri bu sayfanın metin
kaynağı değildir ve silinmedi. İlk aşamada korunan mobil gösterge `handleJump` hatası ikinci aşamada mevcut
Embla scrollTo çağrısına bağlanarak düzeltildi. Galerinin
`width={image}`/`height={image}` nesne prop'ları JSON'un gerçek sayısal ölçüleriyle
değiştirildi; sınıflar, modal genişliği ve Embla seçenekleri değiştirilmedi.

Lago uyumu: hero/feature/gallery adları, eyebrow/title/text ve gallery.images
id/src/order aynı anlamdadır. Azura'nın altı sertifikası korunur; Lago'nun
çevre belgeleri ve diğer ek sertifikaları eklenmez. Gelecek proxy formu medya
alanlarını `media` zarfına, metinleri dört dilli `bundle` içine eşlemeli;
gerçek width/height ve normal alt alanlarını korumalıdır. Azura'ya özgü
`gallery.modalAlt` ek bir metin alanıdır. GIF veya PDF sisteme dahil değildir.

Dosyalar: azura-certificates-storage.mjs doğrulama/okuma/lokalizasyon;
azura-certificates-content.js server-only giriş; certificates/page.js sunucu
bağlantısı; iki yerel bileşen props tüketimi; kaynak JSON/manifest/7 görsel;
seed-persistent-certificates.mjs veri ezmeyen kurulum; mevcut salt okunur medya
route'unda certificates scope'u; birim ve production HTTP testleri. Ortak
MainBanner2 ve ContactSection2 değiştirilmedi; iki Certificate bileşeninin
başka aktif tüketicisi bulunmadı.

Yerel kurulum:
```sh
cd client
npm run seed:certificates -- --local
```
Env verilmezse content ve public/uploads kullanılır; açık AZURA değişkenleri
varsa bunlar önceliklidir. Production:
```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads npm run seed:certificates
```
Seed `.env` dosyalarını otomatik yüklemez; değişkenleri shell/servis ortamına
verin. JSON ve görseller exclusive oluşturulur, var olanlar ezilmez; mevcut
veri geçersizse sessiz onarım yerine hata döner. Sunucu production'da iki
kalıcı kökü ister. Testler geçici köklerde çalışır.

İkinci aşamada uygulanan sözleşmeler (ayrıntıları aşağıda):
- GET/PUT `/api/azura/certificates/page-content` → `{bundle,media,revision}`;
  bundle mevcut translations, media mevcut media; servis tokenı/If-Match,
  ortak kuyruk ve atomik kayıt kullanılmalı.
- GET/POST `/api/azura/certificates/images`; yalnız certificates kapsamı,
  ortak güvenli medya sözleşmesi kullanılmalı.

Test komutları: `npm run test:certificates`, `npm run test:certificates-production`,
`npm run lint`, `git diff --check`. Production betiği geçici proje kopyası,
ayrı build ve içerik dizinleri kullanır. Gerçek tarayıcı/modal/mobil gösterge
ve piksel testi yapılmadı.

Sertifikalar doğrulama sonucu: birim 2/2, production HTTP 1/1; izole Next.js
15.5.26 build ve lint başarılı. Dinamik sayfa 2/2, blog 2/2, anasayfa 3/3 ve
galeri API HTTP 1/1 regresyonları geçti. Toplu betik yalnız önceden mevcut
oda HTTP testinin kurmadığı Fantasy verisine erişmesi nedeniyle başarısız
durum koduyla biter. Kullanıcı içeriği bu hatayı gidermek için değiştirilmedi.

### Sertifikalar ikinci aşama — uygulanmış API sözleşmesi

Bütün uçlar `Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` ister ve
`Cache-Control: no-store` döndürür. Lago panel bağlantısı yapılmadı.

`GET /api/azura/certificates/page-content` ve başarılı PUT tam olarak:
```js
{
  bundle: {tr: Texts, en: Texts, de: Texts, ru: Texts},
  media: {
    hero: {image, width, height},
    feature: {image, width, height, translations: {tr:{alt},en:{alt},de:{alt},ru:{alt}}},
    gallery: {images: [
      {id, src, order, width, height, translations: {tr:{alt},en:{alt},de:{alt},ru:{alt}}}
    ]}
  },
  revision: "64 karakter küçük harf SHA-256"
}
```
`Texts` tam olarak:
```js
{
  hero: {eyebrow, title},
  feature: {eyebrow, title, text},
  gallery: {title, modalAlt}
}
```
Bütün metin/alt değerleri string'dir. Yalnız `hero.eyebrow` ve `feature.text`
boş string kabul eder; diğer zorunlu metinler boş olamaz. Başlangıç İngilizce
metinleri/boşlukları korunur. Metin 4000, alt 300 karakter; içerik JSON isteği
128 KiB. İç içe eksik/fazla alanlar ve başka sayfaya ait medya yolları reddedilir.
Hero CSS görselidir; translations/alt alanı kabul etmez.

PUT mevcut altı öğeyi şu id/order ile zorunlu tutar (ekleme/silme/sıralama bu
API'nin kapsamı değildir): `certificate-tr/0`, `certificate-en/1`,
`certificate-2/2`, `iso-9001/3`, `iso-10002/4`, `iso-14001/5`.
Okuyucu önceki koleksiyon modelini korur; yönetim PUT'u bu görevde altı
başlangıç kimliğini/sırasını sabit tutar. Galeri kaydında yol `src`, tek
sertifika ve banner'da `image` olarak kalır.

Eksiksiz istek akışı (GET'ten gelen alanlar kayıpsız geri gönderilir):
```js
const endpoint = `${azuraOrigin}/api/azura/certificates/page-content`;
const authorization = `Bearer ${serviceToken}`;
const current = await fetch(endpoint, {
  headers: {Authorization: authorization}, cache: "no-store"
}).then(r => r.json());
const {bundle, media, revision} = current;
bundle.tr.feature.title = "Yeni başlık";
const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    Authorization: authorization,
    "Content-Type": "application/json",
    "If-Match": `"${revision}"`
  },
  body: JSON.stringify({bundle, media})
});
const updated = await response.json(); // {bundle, media, revision}
```
PUT başka kök gövde alanı kabul etmez. Başarılı cevap 200; eski revision 409 ve
dosya değişmez. Revision yalnız doğrulanmış bundle/media kanonik JSON'undan
üretilir; dosyaya yazılmaz. Mevcut dosya ortak kuyruk içinde yeniden okunur,
revision kontrol edilir, yalnız translations/media değiştirilir ve atomik
kaydedilir. schemaVersion/pageKey ve diğer kök metaverileri korunur. Kuyruk
**yalnız aynı Node.js sürecini** korur; ayrı worker veya dış dosya yazıcıları
arasında kilit değildir. Başarılı kayıt `/tr/certificates`, `/en/certificates`,
`/de/certificates`, `/ru/certificates` yollarını revalidate eder.

`GET /api/azura/certificates/images` → 200:
```json
{"images":[{"image":"/uploads/pages/certificates/certificates-UUID.png","mimeType":"image/png","size":1234,"width":666,"height":939,"modifiedAt":"2026-09-30T00:00:00.000Z"}]}
```
`POST /api/azura/certificates/images` tek multipart `file` kabul eder → 201:
```json
{"image":"/uploads/pages/certificates/certificates-UUID.png","mimeType":"image/png","size":1234,"width":666,"height":939}
```
JPEG/PNG/WebP, 8 MiB, 16 milyon piksel; multipart toplamı 8 MiB + 128 KiB.
Gerçek tür/ölçü, symlink, güvenli dizin ve exclusive kayıt mevcut ortak medya
katmanındadır. Boyut gerçek okunan baytlarda da doğrulanır; FileHandle.stat()
boş liste düzeltmesi korunur. Adı sunucu üretir. Yükleme JSON'u değiştirmez;
yayın için dönen image/width/height, hedef kayda (galeride src) yerleştirilip
PUT yapılmalıdır. Fiziksel silme endpoint'i eklenmedi.

Hatalar `{error:"..."}`: 401 yetkisiz, 400 geçersiz içerik/If-Match/kimlik/sıra,
415 yanlış Content-Type veya desteklenmeyen/sahte görsel, 428 eksik If-Match,
409 eski revision, 413 boyut. Token yapılandırılmamışsa mevcut ortak yardımcı
503 döndürür. Geçersiz istek dosyayı değiştirmez.

Lago formu mevcut hero/feature/gallery alanlarını aynen eşleyebilir; dört dil
metinleri bundle, görseller media altında tutulur. Galeri id/src/order
korunmalı, alt ve gerçek ölçüler de gönderilmeli; CSS hero'ya alt eklenmemeli.
`gallery.modalAlt` Azura'nın ek metin alanıdır. Diğer otelin sertifikaları veya
PDF/GIF alanları eklenmemelidir.

Eklenen route'lar: certificates/page-content/route.js ve images/route.js.
Depolama modülüne revision/read/write; ortak medya modülüne yalnız scope
wrapper'ları eklendi. Certificate.jsx gösterge callback'i düzeltildi; stiller,
modal ve masaüstü davranışı değiştirilmedi. Gösterge testi altı indeksi ve
Embla hazır değilken güvenli davranışı çalıştırır. Gerçek tarayıcı/modal veya
piksel testi yapılmadı; test edilen etkileşim bileşen düzeyindedir.

İkinci aşama doğrulama: sertifika birim/gösterge testleri **3/3**, sertifika
ziyaretçi/API production HTTP **2/2**, ortak medya güvenlik regresyonları **7/7**
geçti. Next.js 15.5.26 izole production build, lint ve diff kontrolü başarılı.
Dinamik sayfa ve blog HTTP testleri **2/2**'şer, anasayfa HTTP **3/3** başarılı.
Önceden mevcut oda HTTP fixture'ında Fantasy dosyasının kurulmaması sorunu
ayrı tutuldu; bu nedenle toplu test betiği tamamen yeşil değildir. Başlangıç
İngilizce metinleri ve kullanıcı içerikleri test için değiştirilmedi.

## Blog dil bazlı slug modeli — ilk aşama tasarım kaydı (güncel durum aşağıda)

İlk aşamada saf model/plan yardımcıları hazırlandı. İkinci aşamada V3 API,
okuyucu ve dil değiştirici sunucu sürüm ayarına bağlandı; üçüncü aşamada aşağıda
belgelenen migration CLI eklendi. V2 varsayılandır. Gerçek kayıtlar bu görevlerde
dönüştürülmedi. Güncel kesin API sözleşmesi ikinci aşama bölümündedir.

### Kayıt sözleşmesi

`storageVersion: 3` kökü tam olarak şu alanlardan oluşur:
`storageVersion, slug, createdAt, updatedAt, publicationUpdatedAt, draft, published, aliases`.
Kök `slug` değişmeyen teknik anahtardır; dosya daima
`${AZURA_CONTENT_ROOT}/blog/posts/<teknik-slug>.json` olarak kalır.
Snapshot içindeki mevcut `slug` da aynı teknik anahtar kalır; ziyaretçi adresi değildir.

Draft ve null olmayan published nesneleri mevcut v2 alanlarını aynen korur:
`slug, status, coverImage, publishedAt, updatedAt, translations, contentBlocks`;
yalnız `slugs: {tr, en, de, ru}` eklenir. Çeviriler her dilde
`{title, excerpt, content, seoTitle, seoDescription}`; bloklar
`{id, headingLevel, image, translations:{tr:{heading,content},en:{heading,content},de:{heading,content},ru:{heading,content}}}`
olarak kalır. Tarih, görsel yolu, H2/H3, blok kimliği ve metin doğrulaması mevcut
v2 doğrulayıcısından yeniden kullanılır; burada fiziksel dosya okuması yapılmaz.
Gelecekteki yazıcı mevcut gerçek görsel denetimini ayrıca çalıştırmalıdır.

Yeni kök alanı `aliases: {tr: [], en: [], de: [], ru: []}` her dilde eski adres
stringlerini saklar. Alias hedefi ayrı bir string değil, aynı kaydın o dildeki
**güncel published.slugs** değeridir; böylece yönlendirme zinciri oluşmaz.
Her dilin alias listesi benzersizdir; güncel yayımlanmış adres o listede bulunmaz.
Alias alanını istemci düzenleyemez; sonraki aşamadaki yayın işlemi yönetir.

Örnek adres alanları (diğer v2 alanları değişmeden kalır):

```json
{
  "storageVersion": 3,
  "slug": "summer-news",
  "aliases": {"tr": ["summer-news"], "en": [], "de": [], "ru": []},
  "draft": {"slugs": {"tr": "yaz-taslagi", "en": "summer-news", "de": "sommer", "ru": "leto"}},
  "published": {"slugs": {"tr": "yaz-haberleri", "en": "summer-news", "de": "sommer", "ru": "leto"}}
}
```

Bu örnek yalnız yeni alanları gösterir; tek başına geçerli tam kayıt değildir.
Dört slug zorunludur: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, en fazla 120 karakter.
Unicode, büyük harf, boşluk ve yüzde kodlamalı slug kabul edilmez. Trim,
normalleştirme veya otomatik çeviri yapılmaz. Farklı diller aynı slug'ı kullanabilir.

### Saf yardımcılar ve adres kuralları

`lib/azura-blog-v3.mjs` hiçbir dosya yazmaz; V3 aktif akışı ve migration aracı bu saf yardımcıları kullanır:

- `convertBlogV2ToV3`: doğrulanmış v2'yi kopyalar, dört dil adresini teknik slug
  ile başlatır, aliases listelerini boş oluşturur. published:null korunur.
  Metinler/boşluklar/tarihler/bloklar değişmez; v3 girdisi de doğrulanıp bağımsız
  kopyalanır. Tekrar çalıştırılması veri kaybı oluşturmaz.
- `validateBlogV3`: kesin alanları ve mevcut v2 içerik kurallarını denetler.
- `planBlogV3Migration`: kayıt listesi için bellekte dönüşüm ve tüm adreslerin
  çakışma kontrolü; dosya sistemi migration komutu değildir.
- `assertBlogV3AddressAvailability`: aynı dilde draft, published ve alias
  adreslerini birlikte rezerve eder. Aynı teknik kaydın kopyaları çakışmaz;
  başka kaydın adresi veya tekrarlı teknik anahtar 409 olur. Yayımdan kaldırılan
  kaydın alias rezervasyonları tutulur, fakat ziyaretçiye açılmaz. Silinen kaydın
  rezervasyonları kalkar; eski adresin gelecekte yeniden kullanılabileceği bu
  modelin açık politikasıdır (kalıcı silinmiş-adres mezarlığı uygulanmadı).
- `resolvePublishedBlogV3`: yalnız published adresi veya aynı dil alias'ını
  çözer; `{recordKey,published,href,redirect}` veya null döndürür. Taslak/root
  yönetim nesnesi dönmez. Çakışmış kayıt kümesinden rastgele seçim yapmaz.
- `publishedBlogV3Href`: hedef dilde aynı yazının yayımlanmış URL'si veya null.
  Dil önekini bir kez ekler. İçerik çevirisi fallback'i adres seçimini etkilemez.
- `planBlogV3Publication`: tam kayıt kümesi ve çağıranın verdiği ISO timestamp
  ile saf yayın planı oluşturur. Değişen eski published slug alias'a eklenir;
  eski adrese geri dönülürse yeni canonical alias listesinden çıkarılır.
  Taslak kaydetmek alias oluşturmaz. İşlev kalıcı yazma veya revalidation yapmaz.

Sonraki okuyucu alias için güncel adrese **308** yönlendirecek; yayımlanmamış
veya silinmiş yazı alias üzerinden de 404 olacaktır. Liste/detail/metadata ve
LocaleSwitcherSelect yalnız published slugs kullanacaktır. Mevcut metin ve blok
çeviri fallback yardımcıları değişmeyecek. Bloga ait locale context yalnız
published adreslerini taşımalı; mevcut statik/dinamik sayfa dil akışı korunmalı.

### Sonraki aşamanın API sözleşmesi ve sürüm kapısı

Adreslerde `[slug]` teknik anahtar olarak kalacak. Medya endpoint'i değişmeyecek.
Yeni sözleşmenin tüm yönetim çağrıları Bearer yanında
`X-Azura-Blog-Contract-Version: 3` isteyecek; eksik veya farklı sürüm **409**
`{"error":"Blog contract version 3 required","code":"BLOG_CONTRACT_VERSION_MISMATCH"}`
ile, dosyaya dokunmadan reddedilecek. Bu kapı ikinci aşamada **uygulandı**, yalnız sunucu V3 modundayken etkindir. Sadece
If-Match eski istemcinin yeni alanları silmesini engellemek için yeterli değildir.
V3 yazıcı v2 gövdesini otomatik tamamlamayacak veya eksik slugs'u teknik anahtara
sessizce çevirmeyecek.

- GET liste: `{posts:[{record:<tam v3>,revision:"sha256"}]}`.
- GET detay ve başarılı PUT: `{record:<tam v3>,revision:"sha256"}`.
- POST: `{slug:<teknik anahtar>,draft:<DraftInputV3>}` → 201 aynı detay yanıtı.
- PUT save: `{action:"save",draft:<DraftInputV3>}`.
- PUT publish/unpublish: `{action:"publish"}` / `{action:"unpublish"}`.
- DELETE: gövdesiz; `{deleted:true,slug:<teknik anahtar>}`. Görseller silinmez.
- DraftInputV3 tam alanları: `coverImage,publishedAt,translations,contentBlocks,slugs`.
  İç içe translations/contentBlocks yukarıdaki mevcut sözleşmedir.
  Root/snapshot teknik anahtar, status, aliases ve sunucu zaman damgaları
  keyfî istemci alanı değildir. PUT/DELETE tırnaklı If-Match istemeye devam eder.
- Revision tam v3 kaydının kanonik hash'ini kapsayacak (aliases dahil);
  geçiş sonrası eski revision'lar geçersiz olacak, panel yeniden GET yapacak.
- Gelecekte tüm blog yazmaları aynı posts kuyruğunda çalışmalı; kayıtlar kilit
  altında yeniden okunmalı, dil bazlı tüm rezervasyonlar ve gerçek medya
  doğrulanmalı, revision kontrolü sonrası atomik kayıt yapılmalı. Tek Node.js
  süreci sınırı devam eder; çoklu süreçte dağıtık kilit ayrıca gereklidir.
- Save canlı adresi değiştirmez. Publish eski/yeni dört dil yollarını, alias'ları
  ve liste sayfalarını revalidate eder. Unpublish/delete aynı yolları temizler.

### Kesin geçiş ve geri dönüş sırası

1. Önce Azura v3 okuyucu/yazıcı, sürüm kapısı, public resolver ve blog dil
   context'i ayrı sürümde hazırlanır; staging üzerinde doğrulanır. Lago'nun
   mevcut tek slug normalleştirmesi yerine teknik anahtarı salt okunur tutan,
   dört dil slugs alanlarını eksiksiz taşıyan adaptör hazırlanır. Lago'nun yerel
   blog depolaması veya oturum altyapısı Azura'ya kopyalanmaz.
2. Lago adaptörü özellik bayrağı kapalı dağıtılır; v2 çalışmaya devam eder.
   Bakımda tüm blog yazmaları ve seed durdurulur, bütün çalışan süreçler
   durdurulur/kapılanır. Gerçek posts dizini, ortam yapılandırması ve yazılım
   sürümleri yedeklenir; dosya adları, hash'leri ve kayıt sayıları manifestlenir.
   Medya salt okunur kalır; yedek geri yükleme provası yapılır.
3. Migration aracı varsayılan **dry-run** ile: her dosyanın teknik
   anahtarla eşleşmesini ve v2/v3 şemasını denetleyecek; saf planı oluşturacak,
   dil/alias çakışmalarını, dosya boyutu ve gerçek medyayı kontrol edecek;
   içerik/tarih/blok eşliğini raporlayacak. Hatalı kayıt atlanmayacak. Bu görevde
   migration CLI üçüncü aşamada eklendi; seed migration amacıyla kullanılmamalı.
4. Onaylı bakım geçişinde dosya adlarını koruyarak staging dizinine atomik
   çıktılar hazırlanacak, tüm küme doğrulandıktan sonra dizin değiştirilecek.
   Dosya başına atomiklik tek başına tüm küme için transaction değildir; yarıda
   kalan geçişte servis açılmayacak. Manifest/backup ile tüm küme kurtarılacak.
5. V3 Azura sürümü ve sürüm kapısı etkinleştirilir; Lago adaptörü v3 bayrağı
   açılır. Panel tüm kayıtları yeniden GET eder. Eski v2 istemci reddi, dört dil
   URL, published-only metadata, alias 308 ve taslak izolasyonu smoke test edilir.
   Başlangıçta dört slug teknik anahtara eşit olduğundan mevcut URL'ler korunur.
6. Sorunda yazmalar tekrar durdurulur. V3 sonrası düzenleme yoksa tam v2
   yedeği ve eski yazılım/adaptör birlikte geri yüklenir. Düzenleme varsa önce
   v3 kümesi ayrıca yedeklenir; v2'ye alan silerek dönüş **yapılmaz**. Yeni
   adresler/alias'lar v2'de temsil edilemediğinden kayıpsız otomatik rollback
   yoktur; manuel uzlaştırma ve eski/yeni URL yönlendirme planı onaylanmadan
   yedekle ezme yapılmaz.

### Doğrulama

`npm run test:blog` mevcut v2 testlerini ve yeni
`lib/azura-blog-v3.test.mjs` testlerini birlikte çalıştırır. Yeni testler saf
bellek nesneleri kullanır; gerçek kayıt veya uploads değişmez. Production
regresyonu `npm run test:blog-production` ile ayrı geçici build ve içerik
köklerinde çalışır. Bu aşamada v3 HTTP endpoint'i veya yönlendirme/dil
bileşeni etkinleştirilmediğinden v3 tarayıcı davranışı doğrulanmış sayılmaz.

Bu hazırlıkta yeniden çalıştırılan sonuçlar: blog birim testleri **9/9**
(mevcut v2 3, yeni v3 6), blog production HTTP **2/2**, galeri API HTTP
regresyonu **1/1** başarılı. Next.js 15.5.26 izole production build, lint ve
`git diff --check` geçti. Çalıştırılan kapsamda başarısız test yok. Lint komutu
Next lint kullanım dışı bırakılma ve birden fazla lockfile uyarısı verdi;
ESLint hatası/uyarısı yoktu. Tüm proje testleri ve gerçek tarayıcı testi
çalıştırılmadı. Gerçek veri migration'ı veya canlı kurulum yapılmadı.

## Blog V3 ikinci aşama — sunucu ayarıyla etkinleştirilebilir

Önceki “hazırlık” bölümünün etkinleştirilmemiş kod açıklamaları tarihsel ilk
 aşamayı anlatır. Artık okuyucu, yönetim API'si, ziyaretçi sayfaları ve dil
 değiştirici V3'ü destekler. **Bu ortamda ayar değiştirilmedi, V3 açılmadı,
 gerçek migration yapılmadı.** Gerçek içerik/görsel veya Lago dosyası değişmedi.

### Sürüm seçimi ve uyumsuz kayıtlar

Sunucu çalışma zamanı değişkeni `AZURA_BLOG_CONTRACT_VERSION`:

- Tanımsız veya `2`: mevcut V2 API ve ziyaretçi davranışı.
- `3`: V3 dosyaları ve aşağıdaki sürüm kapısı.
- Boş string dahil diğer değerler: açık yapılandırma hatası;
  API `503 BLOG_CONTRACT_CONFIGURATION_ERROR` döndürür.

Bu bir `NEXT_PUBLIC_*` ayarı değildir; istek başlığı sunucu modunu seçemez.
Ayara göre validator seçilir; dosyalar otomatik dönüştürülmez. V3'te herhangi
bir V2/uyumsuz storageVersion bulunduğunda bütün kayıt kümesini kullanan
okuma/yazma `503 BLOG_MIGRATION_REQUIRED` verir; dosyayı değiştirmez. V2'de V3
kayıt okunması da aynı şekilde reddedilir. Bozuk şema ayrı bir veri hatasıdır.
Önceki bölümdeki yedekli/dry-run bakım planı uygulanmadan gerçek ortamı V3'e
çevirmeyin. Migration CLI üçüncü aşamada eklendi; gerçek canlı geçiş yapılmadı.

### Uygulanmış V3 yönetim sözleşmesi

`GET/POST /api/azura/blog/posts` ve
`GET/PUT/DELETE /api/azura/blog/posts/<teknik-slug>` için V3 modunda:

```http
Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>
X-Azura-Blog-Contract-Version: 3
```

Eksik/farklı sürüm başlığı **409**
`{"error":"Blog contract version 3 required","code":"BLOG_CONTRACT_VERSION_MISMATCH"}`
döndürür. Yetkisiz istek önce 401 alır. Lago adaptörü, GET dahil bütün kayıt
isteklerinde bu başlığı göndermelidir. V2 modunda eski istemci aynen çalışır.
Görsel API'si bu başlığı istemez; sözleşmesi/dizini/güvenlik sınırları değişmedi.

Örnek eksiksiz POST gövdesi (yalnız örnek, gerçek yazı olarak eklenmez):

```json
{
  "slug": "technical-key",
  "draft": {
    "coverImage": "",
    "publishedAt": "2026-09-30T10:00:00.000Z",
    "translations": {
      "tr": {"title":"Yazı","excerpt":"","content":"","seoTitle":"","seoDescription":""},
      "en": {"title":"Article","excerpt":"","content":"","seoTitle":"","seoDescription":""},
      "de": {"title":"Artikel","excerpt":"","content":"","seoTitle":"","seoDescription":""},
      "ru": {"title":"Статья","excerpt":"","content":"","seoTitle":"","seoDescription":""}
    },
    "contentBlocks": [],
    "slugs": {"tr":"yazi","en":"article","de":"artikel","ru":"statya"}
  }
}
```

POST yalnız `{slug,draft}` kabul eder, **201** döndürür. DraftInput tam olarak
`coverImage,publishedAt,translations,contentBlocks,slugs` alanlarından oluşur.
PUT save gövdesi `{ "action":"save", "draft": <yukarıdaki tam draft> }` olur.
Diğer PUT gövdeleri tam olarak `{"action":"publish"}` veya
`{"action":"unpublish"}`. JSON yazmalarında `Content-Type: application/json`;
PUT ve gövdesiz DELETE'te `If-Match: "<GET revision>"` zorunludur.

Liste yanıtı `{posts:[{record,revision}]}`; GET detay, başarılı POST ve PUT
`{record,revision}` döndürür. `record` önceki bölümdeki kesin V3 köküdür:
`storageVersion:3,slug,createdAt,updatedAt,publicationUpdatedAt,draft,published,aliases`.
Snapshot'lar mevcut yedi alan artı `slugs` içerir; published başlangıçta null'dır.
DELETE yanıtı `{deleted:true,slug:"technical-key"}`; fiziksel medya silinmez.
Revision tüm kaydın (aliases dahil) kanonik SHA-256 hash'idir; dosyaya yazılmaz.
İstemci draft içine aliases/published/storageVersion/updatedAt veya başka
sunucu alanları ekleyemez. `publishedAt` mevcut editoryal tarih alanıdır.

Hatalar: 400 gövde/slug/başlık/şema; 401 yetki; 404 kayıt yok;
409 eski revision/adres çakışması/sürüm uyuşmazlığı; 413 boyut;
415 Content-Type; 428 If-Match yok; 503 yapılandırma/migration gerekli.
Mevcut 128 KiB JSON istek, 2 MiB kayıt, 120 karakter ASCII slug,
çeviri/blok metin sınırları ve blog medya kuralları korunur.

### Kayıt, ziyaretçi ve dil akışı

Tüm yazmalar aynı gerçek posts dizininin kuyruğunda kalır. V3 yazma sırasında
kilit içinde kayıtlar yeniden okunur; revision, tüm dillerde draft/published/
alias rezervasyonları, yeni içerik ve gerçek seçili görseller doğrulanır.
Yazma atomiktir. Kuyruk yalnız aynı Node.js sürecini korur; migration/seed veya
başka process eşzamanlı çalıştırılmamalıdır.

Save yalnız taslağı değiştirir. Publish eski canlı slug'ları dil alias'larına
alır; kendi alias'ına dönüşte canonical alias listesinden çıkarılır. Alias
her zaman doğrudan güncel published adrese **308** döner; zincir oluşturmaz.
Unpublish/delete sonrası canonical ve alias ziyaretçiye 404 verir. Alias
rezervasyonunun silme/yeniden kullanım politikası ilk aşamadaki gibi kalır.

Liste seçili dilin `published.slugs[locale]` adresini üretir. Detay ve metadata
aynı published-only çözümleyiciyi kullanır; teknik anahtar ziyaretçi yolu olarak
kendiliğinden açılmaz. Metadata canonical/hreflang yalnız published slugs'tan
oluşturulur. Metin ve içerik bloklarının mevcut çeviri fallback'i değişmez.
Revalidation tüm locale news listelerini ve `/[locale]/news/[slug]` page
örüntüsünü kapsar; böylece eski/yeni adresler ve alias'lar birlikte yenilenir.

Locale layout'taki `BlogLocaleProvider` hem Header/HeaderWhite hem children'ı
sarar. Detay `BlogLocaleBridge` ile yalnız published slugs'u ve mevcut pathname'i
iletir. Taslak, aliases veya yönetim kaydı istemci context'ine gönderilmez.
Dil seçici yalnız pathname eşleşiyorsa blog adresini kullanır; statik ve dinamik
sayfaların mevcut akışına aksi durumda devam eder. Locale öneki bir kez eklenir.

### Dosya görevleri ve kontrol komutları

- `lib/azura-blog-schema.mjs`: mevcut V2 doğrulamasının IO'dan ayrılmış ortak
  kaynağı; storage eski export'ları geriye uyumlu sunar.
- `lib/azura-blog-version.mjs`: yalnız sunucu ortamından sürüm seçimi.
- `lib/azura-blog-v3.mjs`: saf V3/alias/çakışma yardımcıları yeniden kullanılır.
- `lib/azura-blog-storage.mjs`, `azura-blog-management.mjs`, `azura-blog-api.js`,
  `azura-blog-content.js`: mod seçimi, güvenli kayıt ve public çözümleme.
- `app/[locale]/news/page.js`, `news/[slug]/page.js`: yayımlanmış dil adresleri,
  alias 308, metadata ve bridge; tasarım değişmez.
- `BlogLocaleContext.jsx`, `lib/azura-blog-locale.mjs`, locale layout ve
  `LocaleSwitcherSelect.jsx`: header'a ulaşan published-only dil bağlamı.
- `lib/azura-blog-v3-http.test.mjs`, `azura-blog-locale.test.mjs`: izole V3 HTTP,
  sürüm/dil testleri. `scripts/test-blog-production.mjs` aynı izole build'de
  V2/V3 blog, dinamik sayfa ve galeri API regresyonlarını çalıştırır.

`npm run test:blog`, `npm run lint`, `npm run test:blog-production` ve
`git diff --check` kullanılır. Test sunucularının V3 ayarı yalnız geçici süreçlere
verilir; gerçek ortam dosyaları veya kullanıcı kayıtları değiştirilmez.

İkinci aşamanın yeniden çalıştırılan sonuçları: blog birim **11/11**, dinamik
sayfa birim **12/12**; izole production blog HTTP **3/3** (varsayılan V2 ziyaretçi
ve yönetim + V3 lifecycle), dinamik sayfa HTTP **2/2**, galeri API HTTP **1/1**.
Next.js 15.5.26 production build, lint ve diff kontrolü başarılı. İlk V3 HTTP
koşusunda liste linklerinde teknik slug kullanımı yakalanıp düzeltildi;
son koşuda başarısız test yok. Bir build denemesi sandbox font erişimi nedeniyle
başarısız oldu; ağ izni verilen izole koşu geçti. Next lint kullanımdan kaldırma,
çoklu lockfile ve next-intl webpack cache uyarıları içerik hatası değildir.
Gerçek tarayıcı/dil seçici tıklama testi yapılmadı: context kapsamı ve URL üretimi
birim testleriyle, sayfa/metadata/redirect davranışı HTTP üzerinden doğrulandı.
Tüm proje test paketi çalıştırılmadı; gerçek veri migration'ı yapılmadı.

## Blog V3 üçüncü aşama — bakım migration aracı

**Hazır:** V3 model/API/ziyaretçi/dil desteği ve şimdi migration CLI.
**Etkinleştirilmedi:** bu ortamda V3 ayarı; gerçek kayıt migration'ı.
Lago adaptörünün hazır olduğu kullanıcı tarafından bildirildi; bu görev Lago
reposunu değiştirmedi veya canlı adaptör bağlantısını doğrulamadı.

### Komutlar — varsayılan salt okunur

Komutları `client` dizininden çalıştırın. `.env` otomatik yüklenmez. Her iki
kök açıkça verilmelidir; local fallback veya `--local` yoktur. Dizinler önceden
mevcut olmalı; migration seed çalıştırmaz. Aşağıdaki yolları hedef ortamın
**gerçek mutlak yollarıyla** değiştirin; bu örnekler çalıştırılmış değildir.

```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads npm run migrate:blog-v3
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads npm run migrate:blog-v3 -- --dry-run
```

Yerel prova için aynı komutlarda kendi geçici mutlak köklerinizi kullanın.
Çıktı çözümlenen content/uploads köklerini, kayıt sayısını, `convert` ve
`unchanged` dosya listelerini bildirir. Hata halinde sıfır olmayan exit code ve
`errors` döner; güvenle çözümlenebilmiş kökler de raporlanır. İlk hatada durur,
hatalı kayıt atlanmaz. Token veya ortamın diğer değerleri yazdırılmaz.

Dry-run hiçbir dizin, kilit, yedek veya dosya oluşturmaz. Tüm dosyaların güvenli
adı, türü, gerçek teknik anahtarı, V2/V3 şeması, tüm draft ve published medya
kaynakları ve dil bazlı adres rezervasyonları denetlenir. Bilinmeyen dosyalar
(temp dosyaları dahil) sessizce atlanmaz. V2→V3 projeksiyonu mevcut içerikle derin
eşitlik kontrolünden geçer; metin/boşluk/tarih/blok/görsel değişmez. V3 dosyaları
aynı baytlarla korunur. Kullanılan gerçek görseller ortak JPEG/PNG/WebP,
8 MiB/16 milyon piksel ve symlink güvenliği kurallarıyla doğrulanır.

Yazma **yalnız iki açık seçenekle**:

```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads npm run migrate:blog-v3 -- --apply --maintenance-confirmed
```

`--maintenance-confirmed`, uygulamanın tüm instance'larının, panel yazıcılarının,
seed ve diğer içerik yazıcılarının **operatör tarafından durdurulduğu beyanıdır**;
araç bunu otomatik denetleyemez veya uygulamayı durduramaz. Bir shell değişkeniyle
V3 açmak, yedekli bakım geçişinin yerine geçmez. `--apply --dry-run` reddedilir.
Geçerli V3/boş kümede apply dönüşüm yapmaz, yeni yedek üretmez, dosya değiştirmez.

### Kalıcı kurtarma dosyaları ve işlem sırası

Bütün migration artefaktları `${AZURA_CONTENT_ROOT}/blog/` altında:

```text
posts/                         aktif kayıt kümesi
.blog-v3-migration.lock         exclusive migration/restore kilidi
.blog-v3-<uuid>/                benzersiz, 0700 işlem dizini
  manifest.json                source/target: name, size, sha256; kökler ve medya hash'leri
  backup/                      kaynağın bayt eşli kopyası (0600 dosyalar)
  staging/                     doğrulanmış V3 kümesi; kurulunca posts'e taşınır
  retired/                     taşıma öncesindeki özgün posts dizini
  00-started.json … 60-complete.json    tamamlanan aşama işaretleri
```

Dosyalar exclusive create + fsync ile kaydedilir; yeni UUID ile mevcut yedek
üzerine yazılmaz. Önce backup manifesti kaynak manifestiyle karşılaştırılır.
Staging aynı dosya sisteminde hazırlanır; posts ayrı mount ise işlem reddedilir.
Staging'in bütün kayıtları, adresleri ve medyası tekrar doğrulanır. Sonra kaynak
kümesi ve kullanılan medya hash'leri tekrar okunup ilk taramayla karşılaştırılır.
Değişiklik varsa swap yapılmaz. Medya yalnız okunur, kopyalanmaz/silinmez.

Swap iki ayrı rename'dir:

1. `posts → <run>/retired`, ilgili dizinleri fsync.
2. `<run>/staging → posts`, ilgili dizinleri fsync.

Bunlar tek transaction değildir; iki adım arasında `posts` olmayabilir.
Bakım penceresi ve bütün yazıcıların durması zorunludur. Son tarama ile rename
arasındaki harici yazmayı kilit engellemez. Sonuç kümesi doğrulanınca complete
işareti yazılır ve kilit kaldırılır. Başarısızlıkta artefaktlar ve kilit kalır;
araç otomatik rollback, cleanup veya uygulama restart yapmaz. Kilit yalnız diğer
migration/restore süreçlerini engeller, mevcut uygulama kuyruğuyla ortak değildir.

### Kesinti kurtarması ve yedek doğrulaması

Önce bütün yazıcıları kapalı tutun, kilitteki PID'yi ve işlem dizinlerini inceleyin.
PID tek başına güvenilir canlılık kanıtı değildir. İşaret dosyaları rename ile
aynı transaction'da olmadığından, **gerçek dizin varlığı ve hash manifesti** esas
alınmalıdır. İkinci migration başlatmayın; bilinmeyen dosyaları temizlemeyin.

Salt okunur backup doğrulaması, posts eksik olsa da çalışır:

```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads npm run migrate:blog-v3 -- --verify-backup /srv/azura/content/blog/.blog-v3-UUID
```

- Backup/staging aşamasında kesinti: posts hâlâ eski kümedir. Kaynak ve backup
  hash'lerini doğrulayın. Artefaktları saklayın; yarım staging'i canlıya taşımayın.
- İlk rename sonrası: posts yok, retired ve staging vardır. Backup doğrulamasından
  sonra retired'ın source manifestiyle aynı olduğunu ayrıca doğrulayın. Eski
  sürüme dönülecekse yalnız **posts hedefi yokken** retired'ı posts'e taşıyın.
  Tamamlamaya karar verilirse staging tümüyle tekrar doğrulanmalı; operatör
  doğrulaması olmadan otomatik devam yoktur.
- İkinci rename sonrası: posts target kümedir; retired ve backup kalır.
  Target manifesti ve API smoke testi başarılıysa operatör tamamlandığını
  kabul edebilir; başarısızsa aşağıdaki açık rollback prosedürünü kullanır.
- Manifest oluşmadan kesinti: yedek doğrulanmış sayılmaz. Özgün posts'e dokunmayın;
  yeni girişimden önce çalışan süreç olmadığını ve mevcut dosyaları doğrulayın.

Stale kilit ancak çalışan migration olmadığı, kurtarma kararı alındığı ve
artefaktlar korunduğu doğrulandıktan sonra operatörce kaldırılır. Otomatik
stale-lock silme/timeout yoktur. Dosya sistemi/host arızasında aynı diskteki yedek
tek başına yeterli değildir; bakım öncesi harici yedek de alınmalıdır.

### Geri yükleme — önce kontrol, sonra açık apply

Başarıyla tamamlanmış migration'ın yedeği için:

```sh
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads npm run migrate:blog-v3 -- --restore /srv/azura/content/blog/.blog-v3-UUID
AZURA_CONTENT_ROOT=/srv/azura/content AZURA_UPLOADS_ROOT=/srv/azura/uploads npm run migrate:blog-v3 -- --restore /srv/azura/content/blog/.blog-v3-UUID --apply --maintenance-confirmed
```

İlk komut salt okunurdur. Restore hem backup/source hash eşliğini hem **aktif
kümenin migration target manifestiyle birebir eşliğini** şart koşar. Kullanıcı
V3 sonrası düzenleme yaptıysa işlem reddedilir; otomatik olarak V3 alanları
silinmez veya eski yedekle ezilmez. Önce güncel V3 kümesini ayrı, doğrulanmış
bir yedekte koruyun; kayıplar/alias adresleri için açık kullanıcı onayı ve manuel
uzlaştırma planı olmadan rollback yapmayın. Bu korumayı atlayan force seçeneği yok.

İzin verilen restore yeni `.blog-v3-<uuid>/staging` oluşturur; `restore-from.json`
özgün backup dizinine işaret eder. Aktif V3 dizini yeni `retired/` içine taşınır,
yedekten üretilen staging posts olur; V3 dosyaları fiziksel olarak korunur.
Restore da iki rename ve aynı kesinti kurallarına tabidir; hata halinde kilit ve
artefaktlar saklanır. CLI uygulamayı veya sürüm ayarını değiştirmez.

### Bakım ve etkinleştirme sırası

1. Harici yedek alın, hedef kökleri doğrulayın, dry-run çalıştırın.
2. Bütün writer/seed süreçlerini durdurun; bakım içinde dry-run'ı tekrarlayın.
3. Açık apply çalıştırın; complete işareti ve manifestleri kontrol edin.
4. Ayrı operasyonla sunucuyu `AZURA_BLOG_CONTRACT_VERSION=3` ile başlatın;
   Lago adaptörü `X-Azura-Blog-Contract-Version: 3` göndermeli. Eski revision'lar
   yerine yeni GET yapılmalı. Dört dil, taslak izolasyonu ve API smoke testi yapın.
5. Sorunda writer'ları durdurun. Düzenleme yoksa kontrollü restore ardından
   V2 ayarı/eski istemciyle başlatın; düzenleme varsa yukarıdaki onaylı uzlaştırma.

### Dosyalar ve testler

- `lib/azura-blog-migration.mjs`: bağımsız güvenli tarama, saf dönüşümün yeniden
  kullanımı, kilit/backup/manifest/staging/swap, kontrollü restore.
- `scripts/migrate-blog-v3.mjs`: varsayılan dry-run CLI, açık apply ve bakım bayrağı;
  sadece izinli seçenekler, gizli ortam değerlerini yazdırmayan rapor.
- `lib/azura-blog-migration.test.mjs`: geçici köklerde 16 test (alt testler dahil).
- `lib/azura-blog-v3-http.test.mjs`: geçici V2 fixture'ı gerçek migration aracıyla
  dönüştürüp V3 API ve dört dil ziyaretçi erişimini kontrol eder.
- `package.json`: `migrate:blog-v3`, `test:blog-migration`; seed:blog değişmedi.

Komutlar: `npm run test:blog-migration`, `npm run test:blog`, `npm run lint`,
`npm run test:blog-production`, `git diff --check`. Gerçek kullanıcı kayıtları
ve uploads bu testlerin hedefi değildir. Yapay checkpoint hataları yalnız test
bağımlılık enjeksiyonudur; CLI veya ortam değişkeniyle etkinleştirilemez.

Üçüncü aşama sonuçları: migration **16/16**, blog birim **11/11**; izole
production blog HTTP **3/3**, dinamik sayfa HTTP **2/2**, galeri API HTTP **1/1**.
Next.js 15.5.26 izole build, lint ve diff kontrolü başarılı; çalıştırılan kapsamda
başarısız test yok. Önceden görülen Next lint/çoklu lockfile/webpack cache
uyarıları sürüyor. Gerçek tarayıcı testi, fiziksel güç kesintisi/disk arızası ve
çoklu host kilit testi yapılmadı; kesintiler beş kontrollü checkpoint'te hata
üreterek doğrulandı. Gerçek apply, .env değişikliği, V3 etkinleştirmesi veya canlı
Lago doğrulaması yapılmadı. Commit/deploy yapılmadı.

## Ortak Azura medya kütüphanesi

Bu altyapı mevcut uploads görsellerini yeniden yüklemeden kullanmayı sağlar.
İçerik doğrulayıcılarının sayfa bazlı yol izinleri **genişletilmedi**. Başka
kapsamdaki görsel seçilince önce hedef kapsama kopyalanır; yayın daha sonra
mevcut içerik API'siyle yapılır. JSON, blog veya galeri kaydı otomatik değişmez.
Alt açıklama kopyalanmaz; seçilen içerik alanında ayrıca düzenlenir.

### Kesin kapsamlar

`scope` / `targetScope` değerleri şu sabit listedendir:

- `/uploads/pages/<scope>/`: `homepage`, `rooms`, `restaurants`, `about`,
  `spawellness`, `spor`, `beachpools`, `kidsclub`, `bars`, `entertainment`,
  `certificates`, `deluxeroom`, `familyroom`, `fantasyroom`, `room-options`.
- `/uploads/<scope>/`: `gallery`, `blog`, `dynamic-pages`.

`room-options` listelenir ve kaynak olabilir; **hedef olarak kabul edilmez**.
Oda detay API anahtarı `family` iken medya kapsamı `familyroom`'dur; adaptör bu
sabit eşlemeyi kullanmalıdır. İzinli klasörlerin yalnız doğrudan görsel dosyaları
okunur; alt klasörlere recursive tarama yapılmaz. Statik importlar, diğer public
klasörleri, videolar, PDF/SVG/GIF, JSON, gizli/temp dosyalar, backup dizinleri ve
izin listesinde olmayan sayfa/oda klasörleri kapsam dışıdır. Mevcut görseller
kendiliğinden taşınmaz veya birleştirilmez.

### GET /api/azura/media-library

`Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>` zorunludur. Blog V3 sürüm
başlığı gerekmez. Yanıt `Cache-Control: no-store` kullanır.

İzinli query alanları: `scope` (opsiyonel kesin kapsam), `q` (en fazla 100
karakter; dosya adı/klasör üzerinde büyük-küçük harf duyarsız alt string),
`limit` (1–100, varsayılan 50), `offset` (0–1.000.000, varsayılan 0).
Bilinmeyen veya tekrarlı query parametreleri reddedilir. Kök/dizin/folder/path
parametresi kabul edilmez.

```http
GET /api/azura/media-library?scope=blog&q=test&limit=50&offset=0
Authorization: Bearer <token>
```

```json
{
  "images": [{
    "image": "/uploads/blog/test.png",
    "name": "test.png",
    "scope": "blog",
    "folder": "blog",
    "mimeType": "image/png",
    "size": 1234,
    "width": 800,
    "height": 600,
    "modifiedAt": "2026-10-01T10:00:00.000Z"
  }],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "nextOffset": null
}
```

`folder`, uploads köküne göre mantıksal klasördür (ör. `pages/homepage`);
fiziksel sunucu yolu değildir. Sıra `image` URL'sine göre artandır. `total`
filtrelenmiş geçerli görsellerin sayısıdır. Son sayfada nextOffset null olur.
Sayfalama snapshot garantisi vermez; eşzamanlı ekleme/silmede listeyi yenileyin.

Bu ilk sürüm yanıt boyutunu sınırlar, fakat seçilen kapsamların dosyalarını
her istekte yeniden çözümler; arama/sayfalama disk tarama maliyetini sınırlamaz.
Büyük kütüphanelerde scope filtresi tercih edilmeli; ileride güvenli indeks/cache
ayrıca tasarlanabilir. Eksik kapsam boş liste verir; güvensiz/symlink klasör
hata verir. Bozuk/sahte/symlink dosyalar mevcut listeleme kuralıyla dışlanır.

### POST /api/azura/media-library/reuse

Bearer ve `Content-Type: application/json` zorunlu. Gövde yalnız:

```json
{"image":"/uploads/blog/test.png","targetScope":"homepage"}
```

Kaynak izinli yerel URL olmalıdır; uzak URL indirilmez. POST query parametresi
kabul etmez. Akış okunurken de denetlenen JSON gövde sınırı **4096 bayt**.
Başarılı yanıt tam olarak:

```json
{
  "image": "/uploads/pages/homepage/homepage-<sha256>.png",
  "mimeType": "image/png",
  "size": 1234,
  "width": 800,
  "height": 600
}
```

- **200**: aynı kapsam; veya hedefte aynı baytlara sahip güvenli görsel bulundu.
- **201**: hedefte yeni dosya oluşturuldu.

Kaynak yerinde kalır. Hedefte bütün güvenli görseller arasında bayt eşliği
aranır; farklı adla mevcut dosya da kullanılabilir. Yeni ad kapsam + SHA-256
ile sunucuda üretilir. Ortak mevcut temp/fsync/exclusive hard-link kaydı üzerine
yazmayı engeller. Aynı süreçte hedef kapsam kuyruğu kullanılır; ayrı süreçlerde
aynı deterministik adın exclusive kaydı yarışmayı çözer, kaybeden güvenli
hedefi yeniden okuyup bayt eşliğini doğrular. Başka upload endpoint'inin aynı
anda farklı adla aynı baytları yüklemesini küresel tekilleştirmez; mevcut
hiçbir dosyayı silmez. Hash adı beklenmeyen farklı dosyayla çakışırsa ezilmez.

JPEG/PNG/WebP, 8 MiB, 16 milyon piksel, gerçek imza ve çözülebilirlik,
symlink/traversal güvenliği korunur. Eski sıfır FileHandle.stat() boyutu düzeltmesi
korunur; gerçek okunan baytların boyutu denetlenir. Kaynak alt metni veya herhangi
bir içerik kaydı bu işlemde okunup hedef alanlara aktarılmaz.

Hatalar: **400** geçersiz sorgu/gövde/kapsam/yol, **401** yetkisiz, **404** kaynak
bulunamadı, **409** güvenli dosya adı çakışması, **413** boyut, **415** JSON
Content-Type veya gerçek görsel türü/çözümlenemeyen görsel. Servis tokenı yoksa
**503**; beklenmeyen sunucu hatası **500**. Bazı mevcut medya kontrolleri aşırı
boyutlu kaynak dosyasını 400 ile reddeder; güvenlik sınırı aynı kalır.

### Lago bağlantısı — sonraki iş, burada uygulanmadı

Salt okunur incelenen Lago dosyaları `lib/admin/media-library.js` ve
`app/[locale]/panel/sayfalar/components/PageImagePicker.jsx` oldu. Mevcut Lago
kütüphanesi recursive pages taraması ve `{library:{assets,folders,...}}`
kullanıyor; Azura bunu doğrudan kopyalamaz. PageImagePicker'ın PageMediaContext /
externalAssets akışı `image` alanını kabul ediyor ancak klasörü şu an “Azura”
olarak sabitliyor ve seçimde `onChange(src)` çağırıyor.

Entegrasyon adımları:

1. Lago sunucu proxy'si Azura GET'i çağırmalı; token tarayıcıya gönderilmemeli.
2. Picker arama/sayfalamayı query parametrelerine taşımalı; `folder/name/scope`
   alanlarını korumalı. Önizleme URL'si Azura origin + image olmalı.
3. Seçimde doğrudan yabancı scope URL'sini kaydetmek yerine proxy üzerinden
   `{image,targetScope}` reuse çağrılmalı. TargetScope form yapılandırmasının
   sunucu tarafından doğrulanan değerinden seçilmeli.
4. Başarılı reuse yanıtından hedef `image,width,height` ilgili mevcut veri
   biçimine aktarılmalı. Galeride image → src; blog/dinamik sayfada string yol;
   normal sayfa kaydında image/ölçüler kullanılır. Kullanıcının alt metin alanı
   korunmalı veya kendisi tarafından doldurulmalı.
5. Ayrı mevcut içerik kaydı/If-Match akışı yayın yapar. Reuse tek başına yayın
   değildir; kaydetme iptal edilirse kopya kalabilir. Fiziksel temizlik API'si yok.

Dosyalar: `azura-media-library.mjs` liste/reuse; `azura-media-library-api.js`
yetki/HTTP; iki route dosyası; `azura-homepage-media.mjs` izin listeli ortak
wrapper'lar (mevcut endpoint/validator sözleşmeleri korunur); birim/HTTP testleri,
package komutu ve izole production test betiği. `npm run test:media-library`
yalnız geçici dizinlerde çalışır. HTTP testi izole `test:blog-production` akışına
eklenmiştir. Lago koduna, kullanıcı kayıtlarına ve gerçek uploads'a yazılmaz.

Bu aşama doğrulaması: kütüphane birim senaryosu **1/1** (filtre/sınır/yol,
symlink/sahte dosya, aynı/kapsamlar arası reuse ve paralellik kontrolleri), ortak
medya regresyonları **7/7**, kütüphane production HTTP **1/1**; blog HTTP **3/3**,
dinamik sayfa HTTP **2/2**, galeri API HTTP **1/1**. İzole Next.js production build,
lint ve `git diff --check` başarılı. Çalıştırılan kapsamda başarısız test yok.
Gerçek tarayıcı/picker uçtan uca testi yapılmadı; Lago bağlantısı uygulanmadı.
Gerçek kullanıcı içeriği/görselleri değiştirilmedi; commit/deploy yapılmadı.

## Ortak dosya görsel doğrulama önbelleği

`lib/azura-image-validation-cache.mjs` yalnız başarıyla doğrulanmış metadata'yı
process belleğinde tutar. Buffer'lar kalıcı cache'e konmaz; doğrulama süresince
okunur ve iş bitince bırakılır. `inspectHomepageImage` ve yeni upload buffer
kontrolleri değişmedi. Ortak `listPageImages` bu yardımcıyı kullanır; tüm mevcut
sayfa/oda/blog/galeri/dinamik medya listeleme endpoint'leri ve ortak kütüphane
aynı katmandan yararlanır. Yanıt alanları ve sıraları değişmedi.

Sınırlar: **512 metadata kaydı**, doğrulama tamamlandığından itibaren **60 saniye**
TTL; erişimde LRU sırası güncellenir, TTL uzamaz. 512 sınırı kütüphane büyürken
belleği sınırlamak, 60 saniye sınırı süreçler arası değişikliklerde uzun ömürlü
sonuç bırakmamak için seçildi. Aynı sürüm için en fazla **128 bekleyen anahtar**
tutulur; kapasite dolduğunda yeni dosya normal doğrulanır, genel kilit uygulanmaz.
Süre dolmuş kayıtlar sonraki çağrıda temizlenir; toplam sınır her zaman korunur.

Cache anahtarı: içerik/uploads kökleri ve gerçek klasör namespace'i + tam dosya
yolu + istenen MIME + `dev, ino, size, mtimeNs, ctimeNs`. Kimlikler bigint fstat
ile alınır; pozitif olmayan/eksik alan, sıfır boyut veya yalnız milisaniye
hassasiyetli iki timestamp durumunda cache kullanılmaz. Gerçek okunan bayt
sayısı stat boyutuyla eşleşmeden cache kaydı oluşturulmaz. Bu, önceki sıfır
FileHandle.stat().size sorununda geçerli dosyaların dışlanmasını engeller;
boş/sahte/aşırı boyutlu buffer hâlâ gerçek doğrulamadan geçemez.

Her istekte mevcut kapsam, güvenli gerçek kök/klasör ve `O_NOFOLLOW` açma
kontrolleri çalışır. Silinmiş dosya cache'den döndürülmez. Cache hit ve bekleyen
sonuç kullanımı öncesinde descriptor ve dosya yolunun lstat kimliği yeniden
karşılaştırılır. Tam doğrulama sonrası da aynı denetim yapılır. İşlem sırasında
sürüm değişirse sonuç reddedilir, yeni sürüme eski sonuç bağlanmaz. Symlink ile
aynı yolun değiştirilmesi veya dosyanın rename ile yenilenmesi de bu denetime
 dahildir. MIME/imza, gerçek Sharp metadata/stats, 8 MiB ve 16 milyon piksel
kuralları atlanmaz; yalnız değişmediği doğrulanan başarılı sonuç tekrar kullanılır.

Aynı güvenilir sürüme gelen paralel istekler tek doğrulama promise'ini bekler.
Hatalar saklanmaz; pending kaydı finally ile temizlenir. Farklı dosyalar birbirini
kilitlemez. Process restart sonrası cache boştur; instance'lar cache paylaşmaz.
Kimlik/timestamp'leri gerçeğe aykırı raporlayan dosya sistemlerine karşı bu bir
kriptografik dosya bütünlüğü garantisi değildir. Güvenilir değişiklik bilgisi
sağlanamayan ortamlarda cache bypass olur; beklenen hızlanma gerçekleşmeyebilir.
Son stat ile yanıt arasındaki harici dosya değişikliğini işletim sistemi seviyesinde
kilitlemez; sonuç yalnız gözlenen dosya sürümü için doğrulanmıştır.

### Kapsam ve kalan işler

- `readLibraryImage` / `readCollectionImage` gerçek bayt isteyen tüketiciler
  olarak mevcut tam okuma/doğrulamayı sürdürür. Reuse akışı değişmez.
- **Galeri ziyaretçi storage'ı henüz bağlı değil.** `azura-gallery-storage.mjs`
  içindeki `readGalleryImage` kendi okuması ve Sharp kontrolünü yapıyor. Galeri
  listeleme API'si faydalanır; ziyaretçi galeri sayfasının aynı hızlanmayı aldığı
  iddia edilmez. Storage entegrasyonu ayrı sonraki adımdır.
- İlk/soğuk tarama tüm görselleri okumaya ve çözümlemeye devam eder. Büyük
  kütüphanelerde 512 kayıt üzerindeki taramalar LRU churn oluşturabilir.
- Scope paralelleştirme, indeks/sayfalama değişikliği, thumbnail ve Lago timeout
  düzenlemesi yapılmadı. Canlı kapasite ölçümü ayrı yapılmalıdır.

### Doğrulama ve yerel ölçüm

`npm run test:media-cache`: **14/14** (6 cache testi, 7 mevcut medya testi,
1 kütüphane testi). Değişmeyen sürüm, aynı boyutlu değişiklik, inode yenileme,
silinme, sıcak cache'de symlink/dizin koruması, sıfır stat boyutu, paralellik,
hata sonrası retry, TTL/LRU/kök ayrımı ve doğrulama sırasında değişme test edildi.

Geçici yerel 1200×800 PNG: soğuk **16,85 ms**, sıcak **0,43 ms**; ağır doğrulama
sayısı soğuk **1**, sıcak ek **0**. Bunlar tek yerel örnek ölçümüdür; canlı
performans sonucu, benchmark garantisi veya tüm kütüphane açılış süresi değildir.
Gerçek kullanıcı kayıtları/görselleri ve çalışma ağacındaki içerik değişiklikleri
korundu. Commit, deploy veya seed yapılmadı.

İzole Next.js production build ve HTTP regresyonları: blog **3/3**, medya
kütüphanesi **1/1**, dinamik sayfa **2/2**, galeri API **1/1** başarılı. Lint ve
`git diff --check` geçti. Mevcut Next lint/çoklu lockfile/cache uyarıları dışında
bu kapsamda başarısız test yok. Canlı sunucu performansı ve gerçek tarayıcı
ölçümü yapılmadı.

## Medya taramasında sınırlı eşzamanlılık ve devam eden iş paylaşımı

`lib/azura-media-scan.mjs` ortak listelemeler için process genelinde **3 dosya
 işi** bütçesi sağlar. Kapsamlar mevcut sırayla taranır; kapsam paralelliği
eklenmedi. Her tarama en fazla üç worker oluşturur; dosya başına sınırsız
Promise.all veya önceden okunmuş buffer listesi yoktur. readdir dosya adlarını,
sonuç listesi ise yalnız metadata'yı tutar. Bütçe bütün kapsamlar ve eşzamanlı
istekler arasında ortaktır; scope × dosya çarpımı oluşmaz. Üç sınırı düşük
kaynaklı sunucuda açık dosya/buffer ve Sharp işlerini sınırlarken I/O beklemesini
örtmek için seçildi. Sharp/libvips kendi iç thread'lerini kullanabilir; bu sayı
native thread veya toplam process belleği garantisi değildir. Upload/reuse
bayt doğrulamaları listeleme bütçesinin dışında, mevcut akışında kalır.

Paylaşılan devam eden tarama anahtarı içerik kökü, gerçek uploads kökü, kapsam,
gerçek klasör ve klasör dev/ino/mtimeNs/ctimeNs bilgileridir. Aynı sürüm için
istekler tek taramayı bekler; her çağırana bağımsız metadata kopyası döner.
Bütün worker'lar bitmeden tarama tamamlanmış sayılmaz. Hata olursa pending kayıt
finally ile temizlenir; bir sonraki istek yeniden deneyebilir. Farklı kökler
karışmaz, ancak düşük kaynak koruması için dosya bütçesini paylaşırlar.

**Tam liste cache'i yoktur.** Sonuç tamamlanınca pending map'ten çıkarılır.
Sonraki istekte dizin tekrar okunur; mevcut doğrulama cache'i dosya kimliğini
kontrol eder. Upload/reuse ardından ayrı tam-liste invalidation gerekmiyor.
Klasör kimliği/zamanı değişirse devam eden eski taramaya katılmak yerine yeni
anahtarla taranır. Harici aynı dosya içeriği değişikliği klasör zamanını
 değiştirmeyebilir: taramaya katılan istekler devam eden taramanın gözlemlediği
sonucu paylaşır; tarama sonrası yeni istek dosyayı tekrar kontrol eder. Tarama
bir dosya sistemi transaction/snapshot'ı değildir. Önceden olduğu gibi tarama
sırasında değişen/silinen görsel dışlanabilir; sonraki istekte yeniden değerlendirilir.

Her çağıran paylaşım öncesinde ve sonucu almadan sonra mevcut güvenli dizin
kontrolünü çalıştırır. Dosyalar O_NOFOLLOW ile açılır; imza/çözümleme/byte/piksel
ve metadata cache kontrolleri korunur. Kapsam izinleri, images/total/limit/offset/
nextOffset, URL sırası, arama ve filtre anlamları değişmedi. Galeri storage,
Lago, timeout'lar, thumbnail veya sayfalama modeli değiştirilmedi.

### Yerel ölçüm (canlı sonucu değildir)

Geçici üç kapsamda toplam **72 PNG**, her biri **800×600**, aynı kontrollü
sentetik görüntünün ayrı dosyaları. Yeni kökte cold cache ve ikinci çağrıda warm
cache; eşzamanlı çift için ayrıca taze kök kullanıldı. Ağır çağrı sayısı Sharp
stats metodundan, aktif dosya bütçesi ortak koordinatörden ölçüldü.

| İşlem | Süre | Ağır doğrulama | En fazla eşzamanlı ağır doğrulama |
|---|---:|---:|---:|
| Soğuk liste | 1324,52 ms | 72 | 3 |
| Sıcak liste | 12,54 ms | 0 | 0 |
| İki eşzamanlı soğuk liste, toplam | 1035,82 ms | 72 | 3 |
| Kapsam + arama + ilk sayfa | 3,30 ms | 0 | 0 |
| Sonraki sayfa | 4,24 ms | 0 | 0 |

Dosya işlerinin gözlenen process geneli üst sınırı **3** oldu. Eşzamanlı iki
istek üç kapsam için toplam **3** tarama çalıştırdı. Bu tek yerel ölçüm,
önceki seri sürüme karşı kontrollü hızlanma benchmark'ı veya canlı açılış süresi
 değildir. Gerçek fotoğraflar, disk, CPU, libvips ve trafik süreleri değiştirebilir.

`npm run test:media-scan` **16/16**: yeni koordinatör/paylaşım/ölçüm testleri,
önceki cache, medya güvenliği ve kütüphane upload/reuse testleri. Kaynak ekleme,
değiştirme, silme, retry, kök ayrımı, sonuç kopyası ve global bütçe doğrulanır.
Yeni dosyalar: `lib/azura-media-scan.mjs`, `lib/azura-media-scan.test.mjs`.
Değişenler: ortak `azura-homepage-media.mjs` listelemesi, package test komutu ve
README. Gerçek kullanıcı içerikleri, seed ve uploads dosyaları değiştirilmedi.

Kalan maliyet: ilk taramada bütün aday görseller hâlâ doğrulanır; arama ve
sayfalama disk/Sharp işini azaltmaz, yalnız yanıtı sınırlar. Büyük kütüphanelerde
512 kayıt cache kapasitesi aşılabilir. Sonraki optimizasyon için canlı ölçüm ve
ayrı indeks/thumbnail tasarımı gerekebilir; burada yapılmadı. Çoklu Node.js
süreçleri taramaları veya bütçeyi paylaşmaz. Galeri ziyaretçi storage entegrasyonu
ayrı iş olarak kalır.

Bu aşamada izole production build, lint ve diff kontrolü başarılı. HTTP
regresyonları: blog **3/3**, medya kütüphanesi **1/1**, dinamik sayfa **2/2**,
galeri API **1/1**. Çalıştırılan testlerde başarısızlık yok. Gerçek tarayıcı veya
canlı sunucu performans ölçümü yapılmadı. Commit/deploy/seed yapılmadı.

## Galeri storage: ortak cache ve dosya bütçesi entegrasyonu

Önceki bölümlerde sonraki adım olarak belirtilen galeri storage entegrasyonu
artık uygulandı. `readGalleryContent → validateGalleryFiles` aynı metadata
cache'ini ve aynı process geneli **3 dosya** bütçesini kullanır. Ayrı cache,
ayrı limit, galeri JSON cache'i veya ziyaretçi HTML cache'i eklenmedi.

JSON her okumada yeniden okunup doğrulanır. Kaynak URL'ler Set ile tekilleştirilir;
kategoriler arasındaki ortak dosya bir kez işlenir. Ortak koordinatörün map
worker'ları slot alır; içerideki metadata okuyucusu ikinci slot almaz. Böylece
galeri ile medya kütüphanesi birlikte çalışırken limit çoğalmaz ve iç içe
semafor beklemesi oluşmaz. Cache namespace'i ortak listelemeyle aynıdır; aynı
kök/dosya sürümünün eşzamanlı doğrulaması mevcut pending mekanizmasını paylaşır.

Her kategori kaydının JSON width/height değerleri, cache'den gelmiş olsa bile
aynı gerçek metadata ile karşılaştırılır. Hatalar galeri için **atlanmaz**;
GalleryContentError olarak yayılır. Kayıt ve kategori sırası değişmez.
İzinli yol, gerçek uploads dizini, symlink/O_NOFOLLOW, gerçek dosya türü, imza,
çözümleme, byte/piksel sınırları korunur. Güvenilmez kimlik ve sıfır stat.size
mevcut cache fallback'iyle tam doğrulamaya gider. Dosya yenileme ve silme her
istekte gerçek dosya açma/kimlik kontrollerinden geçer.

`readGalleryImage` hâlâ `{bytes,info}` döndürür; buffer isteyen tüketici tam
okuma/doğrulamayı sürdürür ve ortak bütçeden bir slot kullanır. Yalnız metadata
isteyen validateGalleryFiles bu public buffer fonksiyonunu çağırmaz. Yönetim
add akışı ve API sözleşmeleri korunur.

Değişen dosyalar: `lib/azura-gallery-storage.mjs`, yeni
`lib/azura-gallery-cache.test.mjs`, package test komutu ve README.
`npm run test:gallery-cache`: **18/18**, geçici fixture ile yeni entegrasyon,
galeri yönetim/component, mevcut cache ve medya güvenliği/kütüphane regresyonları.

Yerel örnek: **24 ayrı 800×600 PNG**, iki kategoride **48 kayıt**:

| İşlem | Süre | Ağır doğrulama | En yüksek eşzamanlı ağır doğrulama |
|---|---:|---:|---:|
| Soğuk galeri | 441,44 ms | 24 | 3 |
| Sıcak galeri | 9,34 ms | 0 | 0 |
| Aynı anda soğuk galeri + medya kütüphanesi | 351,11 ms | Toplam 24 | 3 |

Bunlar geçici yerel sentetik fixture ölçümleridir; canlı açılış süresi veya
karşılaştırmalı hızlanma garantisi değildir. Soğuk tarama/TTL sonu hâlâ tam
çözümleme gerektirir. Cache 512 kayıt/60 saniye sınırları ve process başına
bütçe geçerlidir. Büyük galerilerde cache churn olabilir. İstekler dosya sistemi
transaction'ı değildir; doğrulama sırasında değişen dosyada tekrar deneme
gerekebilir. Gerçek buffer isteyen yollar ağır doğrulamayı sürdürür.
Lago, timeout, tasarım, içerik, API ve galeri sıraları değiştirilmedi.

Galeri entegrasyonunun son doğrulaması: birim/regresyon **18/18**; izole
production galeri yönetim ve ziyaretçi HTTP **2/2**, Bars/Kids Club medya ve
sayfa API HTTP regresyonları **2/2**. Next.js 15.5.26 build, lint ve diff kontrolü
başarılı. Çalıştırılan kapsamda başarısız test yok; mevcut next-intl webpack
cache/Next lint/çoklu lockfile uyarıları sürüyor. Gerçek tarayıcı veya canlı
performans ölçümü yapılmadı. Kullanıcı verisine yazılmadı; commit/deploy/seed
işlemi yapılmadı.

### Dashboard için salt okunur özet API’si

`GET /api/azura/dashboard/summary` mevcut `AZURA_PANEL_SERVICE_TOKEN` Bearer
servis yetkisini ister; tüm yanıtlar `Cache-Control: no-store` taşır. Yönetim
listelerini veya içerik sözleşmelerini değiştirmez. Lago bağlantısı bu görevde
uygulanmadı.

İzinli sorgular:

- `sections=gallery,blog,pages`: varsayılan üçü; tek bölüm veya bunların herhangi
  bir alt kümesi seçilebilir. Bilinmeyen/tekrarlı/boş bölüm, bilinmeyen veya
  tekrarlı query parametresi 400 döner.
- `limit=5`: bildirim listesi için varsayılan; tam sayı 1–20. Sayaçlar ve
  `notifications.total` bu sınırdan etkilenmez. Bu bir içerik sayfalama API’si değildir.
- Sunucuda blog V3 seçiliyse blog içeren istekte ayrıca
  `X-Azura-Blog-Contract-Version: 3` gerekir; eksik/yanlış başlık 409 ve
  `BLOG_CONTRACT_VERSION_MISMATCH` döndürür. `sections=gallery` veya `pages`
  blog sözleşmesine bağımlı değildir. V2 varsayılan olarak korunur.

```http
GET /api/azura/dashboard/summary?sections=blog,pages&limit=5
Authorization: Bearer <AZURA_PANEL_SERVICE_TOKEN>
X-Azura-Blog-Contract-Version: 3
```

Varsayılan tüm bölümler için örnek 200 yanıtı:

```json
{
  "gallery": {
    "status": "ok",
    "data": { "categoryCount": 9, "imageCount": 95 }
  },
  "blog": {
    "status": "ok",
    "data": {
      "total": 3,
      "currentPublishedCount": 1,
      "changedCount": 1,
      "draftCount": 1,
      "latestPost": { "slug": "technical-key", "title": "Son yazı" },
      "notifications": {
        "total": 2,
        "items": [
          {
            "slug": "technical-key",
            "title": "Son yazı",
            "status": "published",
            "hasUnpublishedChanges": true,
            "updatedAt": "2026-09-01T10:00:00.000Z"
          },
          {
            "slug": "draft-key",
            "title": "Taslak",
            "status": "draft",
            "hasUnpublishedChanges": false,
            "updatedAt": "2026-08-01T10:00:00.000Z"
          }
        ]
      }
    }
  },
  "pages": {
    "status": "ok",
    "data": {
      "total": 0,
      "currentPublishedCount": 0,
      "changedCount": 0,
      "draftCount": 0,
      "notifications": { "total": 0, "items": [] }
    }
  }
}
```

Sayfa bildirim öğesi tam olarak
`{id,title,status,hasUnpublishedChanges,updatedAt}` biçimindedir; blogda `id`
yerine teknik `slug` bulunur. Tam metin, çeviri nesneleri, bloklar, sections,
history, alias, revision veya görsel listeleri dönmez. Örnekteki 95 yalnız
örnek sayıdır; doğrulamada sabitlenmez. Seçilmeyen bölüm yanıtta bulunmaz.

Sayaçlar:

- `imageCount`: tüm kategorilerdeki kayıt toplamı; ortak `src` tekrarları da
  sayılır. Benzersiz dosya sayısı değildir. Boş kategoriler categoryCount’a dahildir.
- `total = currentPublishedCount + changedCount + draftCount`.
- `currentPublishedCount`: yayımlanmış kopyası var, içerik değişikliği yok.
- `changedCount`: yayımlanmış kopyası var, taslak farklı; hâlâ yayındadır.
- `draftCount`: yayımlanmış kopyası yok. Yayın oranının payı
  `currentPublishedCount + changedCount` olur. Kayıtlar iki dilimde sayılmaz.
- Karşılaştırma kanonik içerik üzerinden yapılır. Blogda status/updatedAt/
  hasUnpublishedChanges; sayfalarda status/createdAt/updatedAt dışarıda kalır.
  JSON nesne anahtarlarının sırasının değişmesi içerik değişikliği sayılmaz.
- Lago’nun mevcut farkı korunur: blog bildirimleri taslak + değişiklik bekleyen
  yayınları, sayfa bildirimleri yalnız taslak-only kayıtları içerir.
- Başlıklar yönetim taslağından tr/en/de/ru sırasındaki ilk dolu başlıktır;
  bildirimdeki trim/fallback davranışı korunur. Boş başlık yedekleri
  “Başlıksız blog yazısı” / “Başlıksız sayfa”dır. İçerik dosyası normalleştirilmez.
- Son blog kaydı kök updatedAt azalan, eşitlikte teknik slug artan sıralanır.
  Blog bildirim tarihi draft.updatedAt, sayfa bildirim tarihi kök updatedAt’tır;
  eşit tarihte teknik kimlik artan sıralanır. Boş blogda latestPost null’dır.

Hata sözleşmesi:

- 401: yetkisiz; 400: query hatası; 503: servis tokenı/kök yapılandırması
  veya geçersiz blog sürüm ayarı. Sonuncuda `BLOG_CONTRACT_CONFIGURATION_ERROR`.
- Kaynağa özgü bozuk/eksik/okunamayan JSON veya güvensiz dosya 200 içindeki
  ilgili bölümde `{ "status":"error", "error":{"code":"SUMMARY_SOURCE_UNAVAILABLE",
  "message":"Bu bölümün özeti okunamadı."} }` olur. `data` ve sıfır sayaçlar
  verilmez. Diğer hazır bölümler korunur; tüm kaynaklar bozuksa da aynı bölüm
  sözleşmesi geçerlidir. Dosya yolu veya iç hata mesajı açıklanmaz.
- Seçili blog sürümü ile kayıtlar uyuşmazsa blog bölümünün hata kodu
  `BLOG_MIGRATION_REQUIRED` olur; otomatik dönüşüm yapılmaz.
- Kurulmuş boş blog/posts ve pages dizinleri geçerlidir. Kurulmamış dizin hata;
  galeri için doğru şemalı, tüm kategorileri boş JSON geçerlidir, eksik dosya hatadır.

Güvenlik ve maliyet: mevcut blog/dinamik sayfa JSON doğrulayıcıları yeniden
kullanılır; galeri için no-follow, gerçek dizin kontrolü ve en fazla 16 MiB
akış okumasından sonra mevcut şema doğrulaması uygulanır. Blog 2 MiB, sayfa
geçmiş dahil 4 MiB kayıt sınırları mevcut okuyuculardadır. Görsel yollarının
JSON şeması denetlenir fakat gerçek görseller **bu özette** okunmaz; Sharp,
uploads taraması ve görsel metadata cache’i çalıştırılmaz. Özet medya sağlık
kontrolü değildir. Ayrıntılı okuyucuların dosya doğrulaması aynen devam eder.

Seçili kaynaklar paralel okunur; tümü seçilen tek istek en yavaş seçili kaynağı
bekler. Lago dashboard’un bağımsız yükleme davranışı için proxy’de üç ayrı
`?sections=gallery`, `?sections=blog`, `?sections=pages` isteği kullanın.
Bildirimler blog/pages özetlerinin notifications alanlarını kullanmalı;
`total` toplam rozeti, `items` sınırlı önizlemeyi besler. Daha fazla kayıt için
mevcut yönetim listesine gidilir. Servis tokenı tarayıcıya verilmez; V3 başlığı
Lago sunucu adaptöründen gönderilir. Bölüm error olduğunda “—/yüklenemedi”
gösterilmeli, 0 olarak yorumlanmamalıdır. Lago dosyaları değiştirilmedi.

Özetler cache’lenmez; her istek güncel JSON’u okur. Ayrı kaynaklar/dosyalar
arasında tek transaction snapshot garantisi yoktur. JSON okuma, şema doğrulama
ve taslak/yayın karşılaştırması kayıt sayısıyla büyür; büyük history JSON’ları
okunur fakat yanıta eklenmez. Mevcut metadata cache ve ortak 3 dosyalık medya
sınırı değiştirilmedi.

Dosyalar: `lib/azura-dashboard-summary.mjs` özet/HTTP mantığı;
`app/api/azura/dashboard/summary/route.js` Node GET girişi;
`lib/azura-dashboard-summary.test.mjs` izole doğrulama ve yerel ölçüm;
`lib/azura-dashboard-summary-http.test.mjs` production HTTP kontrolü.
`npm run test:dashboard-summary` birim testlerini çalıştırır.
`npm run test:blog-production` geçici build içinde özet HTTP kontrolünü ve
mevcut blog, dinamik sayfa, galeri ve medya kütüphanesi HTTP regresyonlarını
çalıştırır; çalışan development build’ine ve gerçek içeriğe yazmaz.

Yerel geçici ölçüm (40 blog, 20 dinamik sayfa, 40 galeri kaydı; 800×600 test
PNG’leri): tam liste soğuk 637.05 ms / 151970 bayt / 40 ağır doğrulama;
tam liste sıcak 29.71 ms / 151970 bayt / 0 ağır doğrulama; özet 17.62 ms /
1810 bayt / 0 ağır doğrulama; tekrar özet 18.87 ms. Bu tek yerel denemedir,
canlı performans garantisi değildir. Özetin temel kazancı küçük yanıt ve medya
bağımlılığının olmamasıdır; sıcak tam liste zaten mevcut cache’ten yararlanır.

Bu aşamada 7 özet birim/ölçüm, 11 blog, 12 dinamik sayfa, 18 galeri/cache/medya
regresyonu ve izole production build sonrasında 8 HTTP testi geçti. Lint ve
`git diff --check` başarılı. İlk HTTP denemesinde geçici fixture’ın null tarihi
şemaya uymadı; yalnız test tarihi düzeltildi ve yeniden geçti. Gerçek tarayıcı
veya canlı sunucu performans ölçümü yapılmadı. İçerik/API yazma sözleşmeleri,
Lago dosyaları ve gerçek uploads değişmedi.

### Dinamik görsel okuyucusu: salt okunur canlı ölçüm planı

`scripts/diagnose-dynamic-image.mjs` bağımsız Node sürecinde mevcut
`readDynamicPageImage` okuyucusunu çağırır. Uygulama kodunu değiştirmez; endpoint,
seed, migration veya restart gerektirmez. Başarılı çalışmada önce **1 tekil**,
sonra **3 eşzamanlı** okuma yapar ve çıkar. Yük testi, tekrar döngüsü veya retry
yoktur. Dosyalara yazmaz; görsel baytlarını, mutlak kökü ve ortam değişkenlerini
çıktıya koymaz. Sadece sürüm/CPU bilgileri, boyut/ölçüler ve süreler döner.

Sunucuda elle çalıştırma (bu komut burada canlıda çalıştırılmadı):

1. Betiği mevcut sunucu checkout’unun `client/scripts/` dizinine ayrı bir tanı
   dosyası olarak aktarın; uygulama deploy’u veya restart yapmayın. Sunucudaki
   okuyucu sürümünün yerelde ölçülen sürümle aynı olduğunu doğrulayın.
2. Servisin dosya okuma yetkisine sahip kullanıcısıyla, aynı Node sürümü ve
   kurulu bağımlılıklarla `client` dizinine geçin. Paket kurulumu yapmayın.
3. Gerçek kalıcı uploads kökünü açıkça verin; aşağıdaki `/srv/...` örneğini
   sunucunuzun gerçek yolu ile değiştirin:

```sh
node scripts/diagnose-dynamic-image.mjs \
  --uploads-root /srv/azura/uploads \
  --image /uploads/dynamic-pages/dynamic-pages-fafc1cab-579c-4eb8-9baa-fdde18d8e260.webp
```

`AZURA_UPLOADS_ROOT` zaten süreç ortamına aktarılmışsa `--uploads-root`
atlanabilir. Betik `.env` dosyalarını yüklemez ve başka dizine fallback yapmaz.
Root mutlak olmalıdır. Servis tokenı gerekmez. Başarılı çıkış 0, argüman/okuma/
doğrulama hatası 1’dir; hatada yerel dosya yolları açıklanmaz.

JSON çıktısında:

- `environment`: Node, Sharp, libvips, işletim sistemi, CPU modeli/mantıksal
  CPU sayısı, değiştirilmemiş `sharpConcurrency`.
- `single` ve `concurrent.samples`: her okumanın `ms.pathAndFileChecks`,
  `readBytes`, `metadata`, `stats`, `other`, `total` süreleri (milisaniye).
- `pathAndFileChecks`: realpath/lstat/stat/open ve descriptor stat süreleri.
  Dosya adı denetimi, kapatma ve küçük JavaScript işleri `other` içindedir.
- `calls`: her başarılı okumada metadata=1, stats=1.
- `concurrent.wallMs`: üçlü grubun duvar saati süresi; `peak` en fazla 3.
- `applicationQueue`: mevcut dinamik görsel okuyucusu ortak uygulama kuyruğunu
  kullanmadığı için "not used by readDynamicPageImage". Üçlü sınır yalnız
  tanı grubuna aittir, sunucunun eşzamanlılık politikasını değiştirmez.

Ölçüm sarmalayıcıları yalnız tanı sürecinde kurulup kaldırılır; asıl dosya ve
Sharp fonksiyonlarının sonuçları/hataları değiştirilmez. Reader güvenliği ve
8 MiB / 16 milyon piksel sınırı aynen çalışır. Başarısız üçlü grupta kalan
okumalar tamamlanmadan süreç toparlanmaz.

Karşılaştırma: önce ölçü ve bayt boyutunu (yerel örnek 2400×1792, 170942 bayt),
Node/Sharp sürümlerini eşleştirin. Tekil `total` değerini yerel yaklaşık 52 ms
ile, üçlü sonuçları önceki yaklaşık 118 ms/okuma ile ayrı karşılaştırın.
Tekil okuma disk cache’inin soğuk olduğunu garanti etmez; üçlü okuma onun
ardından gelir. İşletim sistemi cache’ini temizlemeyin. Bu tanı yeni bir süreçte
çalışır; mevcut Next.js worker kuyruğunu ölçmez. CPU kotası, anlık sunucu yükü
ve native worker beklemesi farklı sonuç üretebilir. Metadata/stats süreleri
Sharp/libuv içindeki beklemeyi de içerir; saf CPU süreleri değildir.

Canlı HTTP’deki 1,52 saniye TTFB; ağ, proxy ve çalışan uygulama yükünü de
kapsar. Bu betik HTTP/TLS/proxy/indirme ölçmez; TTFB’nin tamamını Sharp’a
atfetmeyin. Dört okuma sınırlı olsa da CPU tüketir; uygun bir zamanda tek
çalıştırma yapıp çıktıyı inceleyin. Sürekli zamanlayıcıya bağlamayın.

İzole doğrulama: `node --test lib/azura-dynamic-image-diagnostic.test.mjs`.
Test geçici 2400×1792 WebP üretir; gerçek kullanıcı dosyalarına yazmadan
süre/çağrı biçimini, içerik eşliğini, symlink/sahte dosya reddini ve gizli
çıktı sızıntısı olmamasını kontrol eder. Tanı dosyası uygulama içinde import
edilmemelidir. Bu aşamada canlı çalıştırma veya optimizasyon yapılmadı.
