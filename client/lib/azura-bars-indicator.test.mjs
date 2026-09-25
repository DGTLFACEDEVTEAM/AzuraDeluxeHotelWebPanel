import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
test("all four mobile indicators select the corresponding card on the existing Embla instance; uninitialized API is safe", async () => {
  const { transform } = require("next/dist/build/swc");
  const source = await readFile(new URL("../app/[locale]/bars/components/OtherOptions4.jsx", import.meta.url), "utf8");
  const output = await transform(source, { filename: "OtherOptions4.jsx", jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } }, module: { type: "commonjs" } });
  for (const ready of [true, false]) {
    const calls = [];
    const React = { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), useCallback: fn => fn, useEffect: () => {}, useState: () => [0, () => {}] };
    const context = { exports: {}, require: id => id === "react" ? React : id === "embla-carousel-react" ? () => [() => {}, ready ? { scrollTo: i => calls.push(i) } : undefined] : {} };
    vm.runInNewContext(output.code, context);
    const images = ["lobbyPiano", "chacha", "pier", "lyricSnack"].map(id => ({ id, img: { src: "test.jpg", width: 720, height: 1080 } }));
    const tree = context.exports.default({ images });
    const controls = [];
    function walk(node) { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== "object") return; if (node.props?.onClick) controls.push(node); walk(node.children); }
    walk(tree); assert.equal(controls.length, 4);
    for (const i of [3, 0, 2, 1]) controls[i].props.onClick();
    assert.deepEqual(calls, ready ? [3, 0, 2, 1] : []);
  }
});
