import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
test("all six mobile indicators select the corresponding card on the existing Embla instance; uninitialized API is safe", async () => {
  const { transform } = require("next/dist/build/swc");
  const source = await readFile(new URL("../app/[locale]/certificates/components/Certificate.jsx", import.meta.url), "utf8");
  const output = await transform(source, { filename: "Certificate.jsx", jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } }, module: { type: "commonjs" } });
  for (const ready of [true, false]) {
    const calls = [];
    const React = { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), useCallback: fn => fn, useEffect: () => {}, useState: () => [0, () => {}] };
    const context = { exports: {}, require: id => id === "react" ? React : id === "embla-carousel-react" ? () => [() => {}, ready ? { scrollTo: i => calls.push(i) } : undefined] : {} };
    vm.runInNewContext(output.code, context);
    const images = ["certificate-tr", "certificate-en", "certificate-2", "iso-9001", "iso-10002", "iso-14001"].map(id => ({ id, img: { src: "test.jpg", width: 720, height: 1080 } }));
    const tree = context.exports.default({ images });
    const controls = [];
    function walk(node) { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== "object") return; if (node.props?.onClick && node.props.className?.includes("transition-all w-[25%]")) controls.push(node); walk(node.children); }
    walk(tree); assert.equal(controls.length, 6);
    for (const i of [5, 3, 0, 2, 1, 4]) controls[i].props.onClick();
    assert.deepEqual(calls, ready ? [5, 3, 0, 2, 1, 4] : []);
  }
});
