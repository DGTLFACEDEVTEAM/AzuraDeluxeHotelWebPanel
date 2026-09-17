import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readRoomsCards } from "./azura-rooms-storage.mjs";
import { readRoomsPageLocale } from "./azura-rooms-page-content.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const rooms = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/rooms.json"), "utf8"));
const homepage = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/homepage.json"), "utf8"));
const contact = JSON.parse(await readFile(path.join(appRoot, "content/shared/contact-details.json"), "utf8"));
const enParallaxTitle = JSON.parse(await readFile(path.join(appRoot, "messages/en.json"), "utf8")).Rooms.Parallax.title;
const token = "azura-rooms-test-service-token-123456789";
const auth = { Authorization: `Bearer ${token}` };

async function startServer(port, paths) {
  const child = spawn(process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
      cwd: appRoot,
      env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot,
        AZURA_PANEL_SERVICE_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe"],
    });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try {
      const response = await fetch(`${base}/uploads/pages/rooms/deluxe-primary.png`);
      if (response.status === 200) return { child, base, output: () => output };
    } catch { /* server not ready */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error(`Next zamanında hazır olmadı: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill();
    setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000).unref();
  });
}

test("production /en/rooms: sekiz kalıcı görsel, iki API, eşzamanlı kayıt ve yeniden başlatma", { timeout: 60000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-rooms-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await mkdir(path.join(paths.contentRoot, "shared"), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/homepage"), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/rooms"), { recursive: true });
  const roomsFile = path.join(paths.contentRoot, "site-pages/rooms.json");
  await writeFile(roomsFile, JSON.stringify({ ...rooms, futureMetadata: { kept: true } }));
  await writeFile(path.join(paths.contentRoot, "site-pages/homepage.json"), JSON.stringify(homepage));
  await writeFile(path.join(paths.contentRoot, "shared/contact-details.json"), JSON.stringify(contact));
  for (const directory of ["homepage", "rooms"]) {
    const source = path.join(appRoot, "public/uploads/pages", directory);
    for (const name of await readdir(source)) {
      await copyFile(path.join(source, name), path.join(paths.uploadsRoot, "pages", directory, name));
    }
  }
  const port = 46000 + Math.floor(Math.random() * 10000);
  const started = await startServer(port, paths);
  let { child } = started;
  const { base, output } = started;
  t.after(() => stopServer(child));
  for (const card of rooms.cards) {
    for (const image of [card.primary, card.secondary]) {
      const response = await fetch(`${base}${image.src}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      await response.arrayBuffer();
    }
  }
  let response;
  try {
    response = await fetch(`${base}/en/rooms`);
  } catch (error) {
    throw new Error(`Rooms yanıtı alınamadı (exit=${child.exitCode}): ${output()}`, { cause: error });
  }
  assert.equal(response.status, 200);
  const html = await response.text();
  const ids = ["deluxeroom", "familyroom", "fantasyroom"].map((id) => html.indexOf(`id="${id}"`));
  assert.ok(ids[0] >= 0 && ids[0] < ids[1] && ids[1] < ids[2]);
  for (const card of rooms.cards) {
    assert.ok(html.includes(card.translations.en.title.trim()));
    assert.ok(html.includes(card.translations.en.buttonText.trim()));
  }
  assert.ok(html.includes("lg:flex-row-reverse"));
  const changed = JSON.parse(await readFile(roomsFile, "utf8"));
  changed.cards[0].translations.en.title = "Azura updated room marker";
  await writeFile(roomsFile, JSON.stringify(changed));
  const updated = await fetch(`${base}/en/rooms`);
  assert.equal(updated.status, 200);
  assert.ok((await updated.text()).includes("Azura updated room marker"));

  const cardsUrl = `${base}/api/azura/rooms/cards`;
  const imagesUrl = `${base}/api/azura/rooms/images`;
  const pageUrl = `${base}/api/azura/rooms/page-content`;
  assert.equal((await fetch(cardsUrl)).status, 401);
  assert.equal((await fetch(cardsUrl, { method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards: rooms.cards }) })).status, 401);
  assert.equal((await fetch(imagesUrl)).status, 401);
  assert.equal((await fetch(imagesUrl, { method: "POST" })).status, 401);
  assert.equal((await fetch(pageUrl)).status, 401);
  const get = await fetch(cardsUrl, { headers: auth });
  assert.equal(get.status, 200);
  const snapshot = await get.json();
  assert.match(snapshot.revision, /^[a-f0-9]{64}$/);
  assert.deepEqual(snapshot.cards.map((card) => card.key), ["deluxe", "family", "fantasy"]);

  const put = (cards, revision = snapshot.revision, headers = {}) => fetch(cardsUrl, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json", "If-Match": `"${revision}"`, ...headers },
    body: JSON.stringify({ cards }),
  });
  assert.equal((await fetch(cardsUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ cards: snapshot.cards }) })).status, 428);
  assert.equal((await put(snapshot.cards, snapshot.revision, { "If-Match": "bad" })).status, 400);
  assert.equal((await fetch(cardsUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json",
    "If-Match": `"${snapshot.revision}"` }, body: "{" })).status, 400);
  assert.equal((await fetch(cardsUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json",
    "If-Match": `"${snapshot.revision}"` },
  body: JSON.stringify({ cards: snapshot.cards, pageKey: "injected" }) })).status, 400);
  const badCards = structuredClone(snapshot.cards);
  badCards[0].primary.width++;
  assert.equal((await put(badCards)).status, 400);
  const missingLocale = structuredClone(snapshot.cards);
  delete missingLocale[1].translations.ru;
  assert.equal((await put(missingLocale)).status, 400);
  const missingImage = structuredClone(snapshot.cards);
  missingImage[0].primary.src = "/uploads/pages/rooms/absent.png";
  assert.equal((await put(missingImage)).status, 400);
  const fakeImage = structuredClone(snapshot.cards);
  fakeImage[0].primary.src = "/uploads/pages/rooms/fake.png";
  await writeFile(path.join(paths.uploadsRoot, "pages/rooms/fake.png"), "not an image");
  assert.equal((await put(fakeImage)).status, 400);
  assert.equal((await fetch(cardsUrl, { headers: auth }).then((response) => response.json())).revision, snapshot.revision);

  const imageList = await fetch(imagesUrl, { headers: auth });
  assert.equal(imageList.status, 200);
  const listed = (await imageList.json()).images;
  assert.equal(listed.length, 8);
  assert.ok(listed.every((image) => image.image.startsWith("/uploads/pages/rooms/") &&
    image.width > 0 && image.height > 0));
  const multipart = (bytes, type) => {
    const form = new FormData();
    form.set("file", new Blob([bytes], { type }), "client-name.png");
    return form;
  };
  const originalImage = await readFile(path.join(paths.uploadsRoot, "pages/rooms/deluxe-primary.png"));
  assert.equal((await fetch(imagesUrl, { method: "POST", headers: auth,
    body: multipart(Buffer.from("%PDF-1.7"), "image/png") })).status, 415);
  const upload = await fetch(imagesUrl, { method: "POST", headers: auth,
    body: multipart(originalImage, "image/png") });
  assert.equal(upload.status, 201);
  const uploaded = await upload.json();
  assert.match(uploaded.image, /^\/uploads\/pages\/rooms\/rooms-[a-f0-9-]+\.png$/);
  assert.equal(uploaded.width, snapshot.cards[0].primary.width);
  assert.equal(uploaded.height, snapshot.cards[0].primary.height);

  const cardsA = structuredClone(snapshot.cards);
  const cardsB = structuredClone(snapshot.cards);
  cardsA[0].primary.src = uploaded.image;
  for (const locale of ["tr", "en", "de", "ru"]) {
    cardsA[0].translations[locale].title = `API updated deluxe marker ${locale}`;
  }
  cardsB[0].translations.en.title = "Losing concurrent marker";
  const concurrent = await Promise.all([put(cardsA), put(cardsB)]);
  assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 409]);
  assert.equal((await put(cardsA)).status, 409);
  const stored = JSON.parse(await readFile(roomsFile, "utf8"));
  assert.equal(stored.schemaVersion, 1);
  assert.equal(stored.pageKey, "rooms");
  assert.equal(stored.revision, undefined);
  let latest = await fetch(cardsUrl, { headers: auth }).then((response) => response.json());
  assert.deepEqual(latest.cards, stored.cards);
  const live = await fetch(`${base}/en/rooms`);
  assert.equal(live.status, 200);
  assert.ok((await live.text()).includes(stored.cards[0].translations.en.title));
  for (const locale of ["tr", "en", "de", "ru"]) {
    assert.equal((await readRoomsCards(locale, paths))[0].title, stored.cards[0].translations[locale].title);
  }

  const pageGet = await fetch(pageUrl, { headers: auth });
  assert.equal(pageGet.status, 200);
  const pageSnapshot = await pageGet.json();
  assert.match(pageSnapshot.revision, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(pageSnapshot.bundle), ["tr", "en", "de", "ru"]);
  assert.deepEqual(Object.keys(pageSnapshot.media.cards), ["deluxe", "family", "fantasy"]);
  assert.equal(pageSnapshot.bundle.tr.RoomSection1.subtitle, stored.cards[0].translations.tr.text);
  assert.equal(pageSnapshot.bundle.tr.RoomSection1.m, stored.cards[0].translations.tr.area);
  assert.equal(pageSnapshot.media.hero.image, rooms.hero.image);
  const putPage = (bundle, media, revision = pageSnapshot.revision, headers = {}) => fetch(pageUrl, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json",
      "If-Match": `"${revision}"`, ...headers }, body: JSON.stringify({ bundle, media }),
  });
  assert.equal((await fetch(pageUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ bundle: pageSnapshot.bundle, media: pageSnapshot.media }) })).status, 428);
  assert.equal((await putPage(pageSnapshot.bundle, pageSnapshot.media, pageSnapshot.revision,
    { "If-Match": "bad" })).status, 400);
  assert.equal((await fetch(pageUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json",
    "If-Match": `"${pageSnapshot.revision}"` }, body: "{" })).status, 400);
  const badBundle = structuredClone(pageSnapshot.bundle);
  delete badBundle.de.RoomSection3;
  assert.equal((await putPage(badBundle, pageSnapshot.media)).status, 400);
  const badPageMedia = structuredClone(pageSnapshot.media);
  badPageMedia.hero.image = "/uploads/pages/rooms/missing.webp";
  assert.equal((await putPage(pageSnapshot.bundle, badPageMedia)).status, 400);
  assert.equal((await fetch(pageUrl, { headers: auth }).then((response) => response.json())).revision,
    pageSnapshot.revision);

  const pageA = structuredClone(pageSnapshot.bundle);
  const pageB = structuredClone(pageSnapshot.bundle);
  const mediaA = structuredClone(pageSnapshot.media);
  for (const locale of ["tr", "en", "de", "ru"]) {
    pageA[locale].title = `API updated intro marker ${locale}`;
    pageA[locale].RoomsParallax.title = `API updated parallax marker ${locale}`;
  }
  pageB.tr.title = "Losing page marker";
  mediaA.parallax.image = uploaded.image;
  const pageConcurrent = await Promise.all([
    putPage(pageA, mediaA), putPage(pageB, pageSnapshot.media),
  ]);
  assert.deepEqual(pageConcurrent.map((response) => response.status).sort(), [200, 409]);
  assert.equal((await putPage(pageA, mediaA)).status, 409);
  let currentPage = await fetch(pageUrl, { headers: auth }).then((response) => response.json());
  const beforeCrossCards = await fetch(cardsUrl, { headers: auth }).then((response) => response.json());
  const introOnly = structuredClone(currentPage.bundle);
  const cardOnly = structuredClone(beforeCrossCards.cards);
  for (const locale of ["tr", "en", "de", "ru"]) {
    introOnly[locale].header = `Parallel intro ${locale}`;
  }
  cardOnly[1].translations.en.title = "Parallel family card";
  const [pageCross, cardsCross] = await Promise.all([
    putPage(introOnly, currentPage.media, currentPage.revision),
    put(cardOnly, beforeCrossCards.revision),
  ]);
  assert.equal(cardsCross.status, 200);
  assert.ok([200, 409].includes(pageCross.status));
  if (pageCross.status === 409) {
    const fresh = await fetch(pageUrl, { headers: auth }).then((response) => response.json());
    const retry = structuredClone(fresh.bundle);
    for (const locale of ["tr", "en", "de", "ru"]) retry[locale].header = `Parallel intro ${locale}`;
    assert.equal((await putPage(retry, fresh.media, fresh.revision)).status, 200);
  }
  currentPage = await fetch(pageUrl, { headers: auth }).then((response) => response.json());
  const currentStored = JSON.parse(await readFile(roomsFile, "utf8"));
  assert.deepEqual(currentStored.futureMetadata, { kept: true });
  assert.equal(currentStored.revision, undefined);
  assert.equal(currentStored.parallax.image, currentPage.media.parallax.image);
  assert.equal(currentStored.intro.tr.header, "Parallel intro tr");
  assert.equal(currentStored.cards[1].translations.en.title, "Parallel family card");
  const updatedPage = await fetch(`${base}/en/rooms`);
  assert.equal(updatedPage.status, 200);
  const updatedHtml = await updatedPage.text();
  assert.ok(updatedHtml.includes(currentPage.bundle.en.title));
  assert.ok(updatedHtml.includes(currentPage.bundle.en.RoomsParallax.title));
  assert.ok(updatedHtml.includes("Parallel intro en"));
  assert.ok(updatedHtml.includes("Parallel family card"));
  const detail = await fetch(`${base}/en/rooms/fantasyroom`);
  assert.equal(detail.status, 200);
  const detailHtml = await detail.text();
  assert.ok(detailHtml.includes(enParallaxTitle));
  assert.ok(!detailHtml.includes("API updated parallax marker en"));
  for (const locale of ["tr", "en", "de", "ru"]) {
    const localized = await readRoomsPageLocale(locale, paths);
    assert.equal(localized.intro.title, currentPage.bundle[locale].title);
    assert.equal(localized.parallax.translations.title, currentPage.bundle[locale].RoomsParallax.title);
  }
  latest = await fetch(cardsUrl, { headers: auth }).then((response) => response.json());

  await stopServer(child);
  ({ child } = await startServer(port, paths));
  const afterRestart = await fetch(cardsUrl, { headers: auth }).then((response) => response.json());
  assert.deepEqual(afterRestart, latest);
  assert.deepEqual(await fetch(pageUrl, { headers: auth }).then((response) => response.json()), currentPage);
});
