const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const FONT_URL_PATTERN = /["'(](\/assets\/[^"'()]+?\.ttf)["')]/g;
const HASHED_FONT_PATTERN = /\.([a-f0-9]{32})\.ttf$/i;

function walkFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }

    return [entryPath];
  });
}

function getSourcePath(fontUrl) {
  const relativeTarget = fontUrl.replace(/^\//, '');
  const relativeSource = relativeTarget.replace(/^assets\//, '');
  const parsed = path.parse(relativeSource);
  const sourceFileName = parsed.base.replace(HASHED_FONT_PATTERN, '.ttf');

  return {
    sourcePath: path.join(projectRoot, parsed.dir, sourceFileName),
    targetPath: path.join(distRoot, relativeTarget),
  };
}

const htmlFiles = walkFiles(distRoot).filter((filePath) => filePath.endsWith('.html'));
const fontUrls = new Set();

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  let match;

  while ((match = FONT_URL_PATTERN.exec(html)) !== null) {
    fontUrls.add(match[1]);
  }
}

let copiedCount = 0;

for (const fontUrl of fontUrls) {
  const { sourcePath, targetPath } = getSourcePath(fontUrl);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source font for ${fontUrl}: ${sourcePath}`);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  copiedCount += 1;
}

console.log(`Copied ${copiedCount} web font asset(s).`);
