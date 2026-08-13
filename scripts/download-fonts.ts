/**
 * Vorlädt alle Builtin-Fonts (FONT_MAP) lokal unter
 * data/uploads/global/fonts/<font>/ – damit sie ohne Google-Kontakt
 * direkt ausgeliefert werden können, bevor der erste Besucher kommt.
 *
 * Aufruf:  npm run fonts:download
 *          (kompiliert dieses Script + Theme-Libs mit tsc und führt es aus)
 */
import { FONT_MAP } from "../src/lib/theme";
import { getBuiltinFontCss } from "../src/lib/fonts";

async function main() {
  const keys = Object.keys(FONT_MAP);
  console.log(`Lade ${keys.length} Fonts lokal herunter…`);
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
  console.log(`Fertig: ${ok}/${keys.length} Fonts lokal gespeichert.`);
  if (ok < keys.length) process.exitCode = 1;
}

main();