import fs from 'fs';
import path from 'path';

function checkFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const hooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'];
  const errors = [];
  hooks.forEach((hook) => {
    const used = new RegExp('\\b' + hook + '\\b').test(code);
    if (used) {
      const imported =
        new RegExp("import\\s+.*\\b" + hook + "\\b.*from\\s+['\"]react['\"]").test(code) ||
        code.includes('React.' + hook);
      if (!imported) {
        errors.push(`${hook} used but not imported in ${filePath}`);
      }
    }
  });
  return errors;
}

function scanDir(dir) {
  let errs = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      errs = errs.concat(scanDir(full));
    } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
      errs = errs.concat(checkFile(full));
    }
  });
  return errs;
}

const allErrors = scanDir('./src');
console.log('Errors found:', allErrors);
if (allErrors.length > 0) {
  process.exit(1);
} else {
  console.log('All hooks correctly imported!');
  process.exit(0);
}
