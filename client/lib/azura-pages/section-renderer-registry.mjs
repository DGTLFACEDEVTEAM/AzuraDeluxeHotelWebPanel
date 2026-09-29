import {
  BLOCK_DEFINITIONS,
  getBlockDefinition,
  getBlockVariant,
} from "./block-definitions.mjs";

export function validateSectionRendererRegistry(
  renderers,
  blockDefinitions = BLOCK_DEFINITIONS
) {
  const errors = [];

  Object.keys(renderers || {}).forEach((type) => {
    if (!blockDefinitions[type]) {
      errors.push(`Renderer kayıt sisteminde bilinmeyen block tipi var: ${type}.`);
    }
  });

  Object.values(blockDefinitions).forEach((definition) => {
    const variantRenderers = renderers?.[definition.type];

    if (!variantRenderers || typeof variantRenderers !== "object") {
      errors.push(`${definition.type} block tipi için renderer kaydı zorunludur.`);
      return;
    }

    Object.keys(variantRenderers).forEach((variant) => {
      if (!definition.variants.some((item) => item.id === variant)) {
        errors.push(`${definition.type} için bilinmeyen renderer varyantı: ${variant}.`);
      }
    });

    definition.variants.forEach((variant) => {
      if (typeof variantRenderers[variant.id] !== "function") {
        errors.push(
          `${definition.type}.${variant.id} varyantı için React renderer zorunludur.`
        );
      }
    });
  });

  return errors;
}

export function createSectionRendererRegistry(renderers) {
  const errors = validateSectionRendererRegistry(renderers);

  if (errors.length > 0) {
    throw new Error(`Section renderer kayıt sistemi geçersiz:\n${errors.join("\n")}`);
  }

  return Object.freeze(
    Object.fromEntries(
      Object.entries(renderers).map(([type, variants]) => [type, Object.freeze(variants)])
    )
  );
}

export function resolveSectionRenderer(registry, section) {
  const definition = getBlockDefinition(section?.type);
  const variant = getBlockVariant(section);
  const Component = variant ? registry?.[section.type]?.[variant] : null;

  if (!definition || !Component) {
    return null;
  }

  return {
    Component,
    definition,
    variant,
  };
}
