import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import {
  HomepageMediaError,
  MAX_IMAGE_BYTES,
  inspectHomepageImage,
  listHomepageImages,
  listRoomsImages,
  saveHomepageImage,
  saveRoomsImage,
} from "./azura-homepage-media.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const jpeg = await readFile(path.join(appRoot, "public", "uploads", "pages", "homepage", "experience-background.jpg"));

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-media-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return resolveAzuraPaths({
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
}

test("yalnızca gerçek JPEG, PNG ve WebP yüklenir; liste sahte dosyaları dışlar", async (t) => {
  const paths = await fixture(t);
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
  const webp = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).webp().toBuffer();
  const inputs = [[jpeg, "image/jpeg", ".jpg"], [png, "image/png", ".png"], [webp, "image/webp", ".webp"]];
  for (const [bytes, mimeType, extension] of inputs) {
    const saved = await saveHomepageImage(bytes, mimeType, paths);
    assert.match(saved.image, /^\/uploads\/pages\/homepage\/homepage-[a-f0-9-]+\.(?:jpg|png|webp)$/);
    assert.ok(saved.image.endsWith(extension));
    assert.deepEqual(await readFile(path.join(paths.uploadsRoot, saved.image.slice("/uploads/".length))), bytes);
  }
  const folder = path.join(paths.uploadsRoot, "pages", "homepage");
  await writeFile(path.join(folder, "manual-fake.jpg"), Buffer.from("%PDF-1.7 fake"));
  await writeFile(path.join(folder, "manual-svg.png"), Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"));
  const images = await listHomepageImages(paths);
  assert.equal(images.length, 3);
  assert.ok(images.every((image) => image.image.startsWith("/uploads/pages/homepage/homepage-")));
});

test("büyük, sahte, bozuk ve MIME türü uyuşmayan dosyalar yazılmaz", async (t) => {
  const paths = await fixture(t);
  const invalid = [
    [Buffer.alloc(MAX_IMAGE_BYTES + 1), "image/jpeg", 413],
    [Buffer.from("%PDF-1.7"), "image/jpeg", 415],
    [Buffer.from("<svg></svg>"), "image/png", 415],
    [Buffer.from([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg", 415],
    [jpeg, "image/png", 415],
  ];
  for (const [bytes, mimeType, status] of invalid) {
    await assert.rejects(saveHomepageImage(bytes, mimeType, paths), (error) =>
      error instanceof HomepageMediaError && error.status === status);
  }
  assert.equal((await listHomepageImages(paths)).length, 0);
});

test("sunucu adı yol taşmasına izin vermez ve mevcut dosyayı ezmez", async (t) => {
  const paths = await fixture(t);
  await assert.rejects(saveHomepageImage(jpeg, "image/jpeg", paths, () => "../escape"), HomepageMediaError);
  const first = await saveHomepageImage(jpeg, "image/jpeg", paths, () => "fixed-id");
  const target = path.join(paths.uploadsRoot, first.image.slice("/uploads/".length));
  const before = await readFile(target);
  await assert.rejects(saveHomepageImage(jpeg, "image/jpeg", paths, () => "fixed-id"), (error) =>
    error instanceof HomepageMediaError && error.status === 409);
  assert.deepEqual(await readFile(target), before);
  assert.equal((await readdir(path.dirname(target))).filter((name) => name === "homepage-fixed-id.jpg").length, 1);
});

test("uploads içindeki symlink ile dizin dışına yazılamaz", async (t) => {
  const paths = await fixture(t);
  const outside = path.join(path.dirname(paths.uploadsRoot), "outside");
  await mkdir(paths.uploadsRoot, { recursive: true });
  await mkdir(outside);
  await symlink(outside, path.join(paths.uploadsRoot, "pages"));
  await assert.rejects(saveHomepageImage(jpeg, "image/jpeg", paths), HomepageMediaError);
  assert.deepEqual(await readdir(outside), []);
});

test("doğrulama geçerli görselin ölçüsünü ve gerçek türünü bildirir", async () => {
  const info = await inspectHomepageImage(jpeg, "image/jpeg");
  assert.equal(info.width, 600);
  assert.equal(info.height, 900);
  assert.equal(info.extension, "jpg");
});

test("oda görselleri aynı sınırlarla yüklenir; liste symlink ve sahte dosyaları dışlar", async (t) => {
  const paths = await fixture(t);
  const saved = await saveRoomsImage(jpeg, "image/jpeg", paths);
  assert.match(saved.image, /^\/uploads\/pages\/rooms\/rooms-[a-f0-9-]+\.jpg$/);
  assert.equal(saved.width, 600);
  assert.equal(saved.height, 900);
  const folder = path.join(paths.uploadsRoot, "pages", "rooms");
  await writeFile(path.join(folder, "fake.png"), Buffer.from("<svg/>"));
  await symlink(path.join(folder, path.basename(saved.image)), path.join(folder, "linked.jpg"));
  assert.deepEqual((await listRoomsImages(paths)).map((image) => image.image), [saved.image]);
  await assert.rejects(saveRoomsImage(Buffer.from("%PDF-1.7"), "image/jpeg", paths), HomepageMediaError);
  await assert.rejects(saveRoomsImage(jpeg, "image/jpeg", paths, () => "../escape"), HomepageMediaError);
  await saveRoomsImage(jpeg, "image/jpeg", paths, () => "fixed");
  await assert.rejects(saveRoomsImage(jpeg, "image/jpeg", paths, () => "fixed"), { status: 409 });
});

test("sıfır fstat boyutunda gerçek bayt doğrulaması sürer; boş/büyük/sahte/symlink dosya listelenmez", async t => {
  const paths = await fixture(t);
  const saved = await saveHomepageImage(jpeg, "image/jpeg", paths);
  const folder = path.join(paths.uploadsRoot, "pages/homepage");
  await writeFile(path.join(folder, "empty.jpg"), Buffer.alloc(0));
  await writeFile(path.join(folder, "large.jpg"), Buffer.alloc(MAX_IMAGE_BYTES + 1));
  await writeFile(path.join(folder, "fake.jpg"), Buffer.from("%PDF-fake"));
  await symlink(path.join(folder, path.basename(saved.image)), path.join(folder, "linked.jpg"));
  const {default: fs} = await import("node:fs");
  const {syncBuiltinESMExports} = await import("node:module");
  const originalOpen = fs.promises.open;
  let inspected = 0;
  t.mock.method(fs.promises, "open", async (...args) => {
    const handle = await originalOpen(...args);
    const originalStat = handle.stat.bind(handle);
    handle.stat = async (...statArgs) => {
      const info = await originalStat(...statArgs);
      info.size = 0;
      inspected++;
      return info;
    };
    return handle;
  });
  syncBuiltinESMExports();
  try {
    const images = await listHomepageImages(paths);
    assert.equal(inspected, 4);
    assert.deepEqual(images.map(i => i.image), [saved.image]);
    assert.equal(images[0].size, jpeg.length);
    assert.deepEqual([images[0].width, images[0].height], [600, 900]);
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});
