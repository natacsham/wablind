import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pages } from "../src/catalog/data";
import { exportPage } from "../src/catalog/export";

mkdirSync("public/demos", { recursive: true });
const pageStyles = readFileSync("src/catalog/document.css", "utf8");
for (const page of pages)
  writeFileSync(
    `public/demos/${page.id}.html`,
    exportPage(page, {}, pageStyles),
    "utf8",
  );
console.log(
  `${pages.length} páginas HTML próprias geradas a partir do catálogo.`,
);
