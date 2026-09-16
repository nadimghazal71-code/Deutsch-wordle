/**
 * Run a Gradle task in the generated android/ project, on any OS.
 *
 * `./gradlew` only works on macOS and Linux; on Windows npm runs scripts through
 * cmd.exe, which needs `gradlew.bat`. Rather than shipping two npm scripts that each
 * fail on the other platform, this picks the right wrapper.
 *
 *   node scripts/gradle.mjs assembleRelease
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(projectRoot, 'android');
const isWindows = process.platform === 'win32';
const wrapper = isWindows ? 'gradlew.bat' : './gradlew';

if (!existsSync(androidDir)) {
  console.error(
    'No android/ directory. It is generated, not committed — run:\n\n' +
      '  npx expo prebuild --platform android --clean\n',
  );
  process.exit(1);
}

const tasks = process.argv.slice(2);
if (tasks.length === 0) {
  console.error('Usage: node scripts/gradle.mjs <task> [...]   e.g. assembleRelease');
  process.exit(1);
}

console.log(`> ${wrapper} ${tasks.join(' ')}   (in ${androidDir})`);
const result = spawnSync(wrapper, tasks, {
  cwd: androidDir,
  stdio: 'inherit',
  // cmd.exe needs a shell to resolve a .bat file.
  shell: isWindows,
});

if (result.error) {
  console.error(`Could not run ${wrapper}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
