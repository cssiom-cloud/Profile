import assert from 'node:assert/strict';
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

async function bundleComponent(filePath) {
  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    packages: 'external',
    define: {
      'import.meta.env': '{}',
      'import.meta': '{}',
    },
  });
  const code = result.outputFiles[0].text;
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', 'require', code);
  fn(mod, mod.exports, require);
  return mod.exports;
}

console.log('=== Running Test Suite: New Features Verification ===');

// 1. ColoredBio Code Detection
const coloredBioExports = await bundleComponent(path.join(rootDir, 'src/components/profile/ColoredBio.jsx'));
const { isCodeLikeBio, parseRichColorText } = coloredBioExports;

const codeSample = `Maiddress = {
  "age": 0,
  "gender": "Idc",
  "mbti": ["INTJ", "INTP"],
  "skills": ["Law", "WebDev", "Lua"],
  "likes": ["Book","Quiet","Code"],
  "timezone": "Asia/Bangkok"
}`;

assert.equal(isCodeLikeBio(codeSample), true, 'isCodeLikeBio accurately detects code/object bio');
assert.equal(isCodeLikeBio('Hello world, I am a developer!'), false, 'isCodeLikeBio returns false for plain prose bio');
console.log('  ✔ 1. ColoredBio isCodeLikeBio correctly classifies object/code vs plain text');

// 2. BBCode Color Parser
const taggedText = 'Hello [cyan]Electric Cyan[/cyan] and [pink]Neon Pink[/pink] with [gradient]Rainbow[/gradient]!';
const parsedElements = parseRichColorText(taggedText);
assert(Array.isArray(parsedElements), 'parseRichColorText returns an array of lines/elements');
assert(parsedElements.length > 0, 'parseRichColorText produced rendered elements');
console.log('  ✔ 2. ColoredBio parseRichColorText parses color tags');

// 3. Audio Time formatting from MusicPlayer
const musicPlayerExports = await bundleComponent(path.join(rootDir, 'src/components/audio/MusicPlayer.jsx'));
const { formatTime } = musicPlayerExports;

assert.equal(formatTime(0), '0:00');
assert.equal(formatTime(215), '3:35');
console.log('  ✔ 3. MusicPlayer formatTime boundary tests verified');

console.log('\n[✓] All new feature tests passed successfully (3/3)!\n');
