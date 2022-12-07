import { fs } from 'zx';
import path from 'path';

const repoFolder = path.join(path.dirname(__filename), '..');
const folderToServe = path.join(repoFolder, 'public-dist');

// cross-env TIDDLYWIKI_PLUGIN_PATH='node_modules/tiddlywiki/plugins/published' TIDDLYWIKI_THEME_PATH='${wikiFolderName}/themes'
process.env.TIDDLYWIKI_PLUGIN_PATH = `${repoFolder}/plugins`;
process.env.TIDDLYWIKI_THEME_PATH = `${repoFolder}/themes`;

// npm run build:prepare
await $`rm -rf ${folderToServe}`;
// npm run build:public
await $`cp -r ${repoFolder}/public/ ${folderToServe}`;
try {
  await $`cp ${repoFolder}/vercel.json ${folderToServe}/vercel.json`;
} catch (error) {
  console.log(error);
}
// try copy some static assets, don't cause error if some of them been removed by the user
try {
  // npm run build:public
  await $`cp ${repoFolder}/tiddlers/favicon.ico ${folderToServe}/favicon.ico`;
  await $`cp ${repoFolder}/tiddlers/TiddlyWikiIconWhite.png ${folderToServe}/TiddlyWikiIconWhite.png`;
  await $`cp ${repoFolder}/tiddlers/TiddlyWikiIconBlack.png ${folderToServe}/TiddlyWikiIconBlack.png`;
} catch (error) {
  console.log(error);
}
// npm run build:nodejs2html
// exclude edit related plugins, make it readonly, and reduce size
await $`tiddlywiki ${repoFolder} --build readonlyexternalimages`;
await $`tiddlywiki ${repoFolder} --build externaljs`;
// npm run build:sitemap
await $`tiddlywiki . --rendertiddler sitemap sitemap.xml text/plain && mv ${repoFolder}/output/sitemap.xml ${folderToServe}/sitemap.xml`;
// npm run build:minifyHTML
const htmlMinifyPath = `${repoFolder}/output/index-minify.html`;
const htmlOutputPath = `${folderToServe}/index.html`;
await $`html-minifier-terser -c ./html-minifier-terser.config.json -o ${htmlMinifyPath} ${repoFolder}/output/index.html`;
// build dll.js and config tw to load it
// original filename contains invalid char, will cause static server unable to load it
const htmlContent = fs.readFileSync(htmlMinifyPath, 'utf-8');
const htmlContentWithCorrectJsPath = htmlContent.replaceAll('%24%3A%2Fcore%2Ftemplates%2Ftiddlywiki5.js', 'tiddlywiki5.js');
fs.writeFileSync(htmlOutputPath, htmlContentWithCorrectJsPath);
await $`mv ${repoFolder}/output/tiddlywiki5.js ${folderToServe}/tiddlywiki5.js`;
// npm run build:precache
await $`workbox injectManifest workbox-config.js`;

// build downloadable html
await $`tiddlywiki ${repoFolder} --build externalimages`;
await $`html-minifier-terser -c ./html-minifier-terser.config.json -o ${htmlMinifyPath} ${repoFolder}/output/index.html`;
await $`mv ${htmlMinifyPath} ${folderToServe}/index-full.html`;
