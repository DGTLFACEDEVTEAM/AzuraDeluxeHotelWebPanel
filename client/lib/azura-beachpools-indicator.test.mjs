import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
test("all five mobile indicators select the corresponding card on the existing Embla instance; uninitialized API is safe", async () => {
  const { transform } = require("next/dist/build/swc");
  const source = await readFile(new URL("../app/[locale]/beachpools/Components/Beach5.jsx", import.meta.url), "utf8");
  const output = await transform(source, { filename: "Beach5.jsx", jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } }, module: { type: "commonjs" } });
  for (const ready of [true, false]) {
    const calls = [];
    const React = { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), useCallback: fn => fn, useEffect: () => {}, useState: () => [0, () => {}] };
    const context = { exports: {}, require: id => id === "react" ? React : id === "embla-carousel-react" ? () => [() => {}, ready ? { scrollTo: i => calls.push(i) } : undefined] : {} };
    vm.runInNewContext(output.code, context);
    const poolItems = ["main", "indoor", "kids", "aqua", "indoorKids"].map(id => ({ id, src: { src: "test.jpg" }, hoverSrc: { src: "hover.jpg" } }));
    const tree = context.exports.default({ poolItems, showLink: false });
    const controls = [];
    function walk(node) { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== "object") return; if (node.props?.onClick) controls.push(node); walk(node.children); }
    walk(tree); assert.equal(controls.length, 5);
    for (const i of [4, 0, 3, 1, 2]) controls[i].props.onClick();
    assert.deepEqual(calls, ready ? [4, 0, 3, 1, 2] : []);
  }
});
