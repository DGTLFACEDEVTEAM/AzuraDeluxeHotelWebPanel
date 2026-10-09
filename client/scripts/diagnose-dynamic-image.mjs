// Standalone, read-only diagnostic process. Never import this script into the server.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {AsyncLocalStorage} from 'node:async_hooks';
import {syncBuiltinESMExports} from 'node:module';
import sharp from 'sharp';
import {readDynamicPageImage} from '../lib/azura-homepage-media.mjs';

function options(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--uploads-root', '--image'].includes(key) || !args[i + 1] || Object.hasOwn(parsed, key)) throw new Error('arguments');
    parsed[key] = args[i + 1];
  }
  const root = parsed['--uploads-root'] ?? process.env.AZURA_UPLOADS_ROOT;
  const image = parsed['--image'];
  if (!root || !path.isAbsolute(root) || !/^\/uploads\/dynamic-pages\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(jpg|jpeg|png|webp)$/i.test(image ?? '') || image.includes('..')) throw new Error('arguments');
  return {root, image};
}

async function measure({root, image}) {
  const context = new AsyncLocalStorage();
  const restore = [];
  function instrument(object, name, bucket) {
    const original = object[name];
    restore.push(() => { object[name] = original; });
    object[name] = async function (...args) {
      const sample = context.getStore(), start = performance.now();
      try { return await original.apply(this, args); }
      finally {
        if (sample) {
          sample.ms[bucket] += performance.now() - start;
          if (bucket === 'metadata' || bucket === 'stats') sample.calls[bucket]++;
        }
      }
    };
  }
  let active = 0, peak = 0;
  const paths = {uploadsRoot: root}; // This byte reader does not read content JSON.
  async function once(index) {
    const sample = {index, ms: {pathAndFileChecks: 0, readBytes: 0, metadata: 0, stats: 0}, calls: {metadata: 0, stats: 0}};
    return context.run(sample, async () => {
      const start = performance.now();
      active++; peak = Math.max(peak, active);
      try {
        const {info} = await readDynamicPageImage(image, paths);
        sample.image = {mimeType: info.mimeType, size: info.size, width: info.width, height: info.height};
      } finally {
        active--;
        sample.ms.total = performance.now() - start;
      }
      sample.ms.other = sample.ms.total - sample.ms.pathAndFileChecks - sample.ms.readBytes - sample.ms.metadata - sample.ms.stats;
      for (const key of Object.keys(sample.ms)) sample.ms[key] = Number(sample.ms[key].toFixed(3));
      return sample;
    });
  }
  try {
    for (const name of ['realpath', 'lstat', 'stat']) instrument(fs, name, 'pathAndFileChecks');
    const originalOpen = fs.open;
    restore.push(() => { fs.open = originalOpen; });
    fs.open = async function (...args) {
      const sample = context.getStore(), start = performance.now();
      let handle;
      try { handle = await originalOpen(...args); }
      finally { if (sample) sample.ms.pathAndFileChecks += performance.now() - start; }
      // Per-handle wrappers retain the original result and error semantics.
      for (const [name, bucket] of [['stat', 'pathAndFileChecks'], ['readFile', 'readBytes']]) {
        const original = handle[name].bind(handle);
        handle[name] = async (...values) => {
          const start = performance.now();
          try { return await original(...values); }
          finally { if (sample) sample.ms[bucket] += performance.now() - start; }
        };
      }
      return handle;
    };
    syncBuiltinESMExports();
    instrument(sharp.prototype, 'metadata', 'metadata');
    instrument(sharp.prototype, 'stats', 'stats');
    const single = await once(1);
    peak = 0;
    const start = performance.now();
    // Exactly three concurrent reads; no loop, retries, or persistent cache.
    const results = await Promise.allSettled([once(1), once(2), once(3)]);
    if (results.some(result => result.status === 'rejected')) throw new Error('read');
    return {applicationQueue: 'not used by readDynamicPageImage', single,
      concurrent: {count: 3, peak, wallMs: Number((performance.now() - start).toFixed(3)), samples: results.map(result => result.value)}};
  } finally {
    for (const reset of restore.reverse()) reset();
    syncBuiltinESMExports();
  }
}

try {
  const parsed = options(process.argv.slice(2));
  if (!parsed) {
    console.log('Usage: node scripts/diagnose-dynamic-image.mjs --uploads-root /absolute/uploads --image /uploads/dynamic-pages/name.webp\nRoot may instead come from AZURA_UPLOADS_ROOT. No .env loading. Exactly 1 + 3 reads; JSON output, no writes.');
  } else {
    const timing = await measure(parsed);
    console.log(JSON.stringify({environment: {node: process.version, sharp: sharp.versions.sharp, libvips: sharp.versions.vips,
      platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model ?? 'unknown', logicalCpus: os.cpus().length,
      sharpConcurrency: sharp.concurrency()}, ...timing}, null, 2));
  }
} catch {
  // Do not leak native errors, absolute paths, image buffers, or environment secrets.
  console.error('Diagnostic failed: check absolute uploads root, image argument, read permissions and image validity. No files were written.');
  process.exitCode = 1;
}
