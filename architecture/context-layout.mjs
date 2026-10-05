import fs from 'node:fs/promises';
// Keep the 3D estate in the opening viewport, beside the product proposition.
for(const slug of ['thesis','world-model']){
 const path=`public/pages/${slug}.html`;let h=await fs.readFile(path,'utf8');const start=h.indexOf('<header class="context-heading">'),end=h.indexOf('<section class="context-story"',start);if(start<0||end<start)throw Error('Context opening missing: '+slug);const opening=h.slice(start,end);h=h.slice(0,start)+h.slice(end);h=h.replace('<div class="context-chapters">','<div class="context-chapters">'+opening);h=h.replace('</head>','<link rel="stylesheet" href="/product/context-opening.css?v=1"></head>');await fs.writeFile(path,h);
}
