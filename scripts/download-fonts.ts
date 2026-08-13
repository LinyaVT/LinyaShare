/**
 * Preloads all builtin fonts (FONT_MAP) locally under
 * data/uploads/global/fonts/<font>/ – so they can be served directly
 * without Google contact before the first visitor arrives.
 *
 * Run:      npm run fonts:download
 *          (compiles this script + theme-libs with tsc and executes it)
 */
import { FONT_MAP } from "../src/lib/theme";
import { getBuiltinFontCss } from "../src/lib/fonts";

async function main() {
  const keys = Object.keys(FONT_MAP);
  console.log(`Downloading ${keys.length} fonts locally…`);
  let ok = 0;
  for (const key of keys) {
    try {
      await getBuiltinFontCss(key);
      console.log(`  ✓ ${key}`);
      ok++;
    } catch (error: any) {
      console.error(`  ✗ ${key}: ${error?.message || error}`);
    }
  }
  console.log(`Done: ${ok}/${keys.length} fonts stored locally.`);
  if (ok < keys.length) process.exitCode = 1;
}

main();