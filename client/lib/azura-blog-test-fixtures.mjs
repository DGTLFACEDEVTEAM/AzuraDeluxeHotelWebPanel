export function blogFixture(slug='example') {
 const timestamp='2026-09-01T10:00:00.000Z';
 const translations=Object.fromEntries(['tr','en','de','ru'].map(l=>[l,{title:`Public ${l}`,excerpt:`Excerpt ${l}`,content:`Paragraph one ${l}\n\nParagraph two ${l}`,seoTitle:`SEO ${l}`,seoDescription:`Description ${l}`} ]));
 const blocks=['h2','h3'].map((headingLevel,i)=>({id:`block-${i}`,headingLevel,image:i===0?'/uploads/blog/test.png':'',translations:Object.fromEntries(['tr','en','de','ru'].map(l=>[l,{heading:`Heading ${i} ${l}`,content:`Block ${i} ${l}`}]))}));
 const published={slug,status:'published',coverImage:'',publishedAt:timestamp,updatedAt:timestamp,translations,contentBlocks:blocks};
 const draft=structuredClone(published);draft.status='draft';draft.translations.tr.title='SECRET DRAFT';
 return {storageVersion:2,slug,createdAt:timestamp,updatedAt:timestamp,publicationUpdatedAt:timestamp,draft,published};
}
