import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
test("all nine mobile indicators select the corresponding card on the existing Embla instance; uninitialized API is safe", async () => {
  const { transform } = require("next/dist/build/swc");
  const source = await readFile(new URL("../app/[locale]/entertainment/components/EntertainmentTypesSection.jsx", import.meta.url), "utf8");
  const output = await transform(source, { filename: "EntertainmentTypesSection.jsx", jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } }, module: { type: "commonjs" } });
  for (const ready of [true, false]) {
    const calls = [];
    const React = { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), useCallback: fn => fn, useEffect: () => {}, useState: () => [0, () => {}] };
    const context = { exports: {}, require: id => id === "react" ? React : id === "embla-carousel-react" ? () => [() => {}, ready ? { scrollTo: i => calls.push(i) } : undefined] : {} };
    vm.runInNewContext(output.code, context);
    const cards = ["sport-fitness", "kids-teen-club", "water-sports", "beach-activities", "table-tennis", "water-gymnastics", "step-aerobics", "stage-shows", "darts-boccia"].map(id => ({ id, img: { src: "test.jpg", width: 720, height: 1080 } }));
    const tree = context.exports.default({ cards, texts: {} });
    const controls = [];
    function walk(node) { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== "object") return; if (node.props?.onClick) controls.push(node); walk(node.children); }
    const slides = [];
    function findViewport(node) { if (Array.isArray(node)) return node.forEach(findViewport); if (!node || typeof node !== "object") return; if (node.props?.ref) slides.push(...node.children[0].children[0]); findViewport(node.children); }
    findViewport(tree); assert.deepEqual(slides.map(n => n.props.key), cards.map(c => c.id));
    walk(tree); assert.equal(controls.length, 9);
    for (const i of [8, 0, 6, 1, 7, 2, 5, 3, 4]) controls[i].props.onClick();
    assert.deepEqual(calls, ready ? [8, 0, 6, 1, 7, 2, 5, 3, 4] : []);
  }
});
