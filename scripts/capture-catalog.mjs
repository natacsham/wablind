import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base =
  process.env.CATALOG_PREVIEW_URL || "http://127.0.0.1:4180/wablind/";
await mkdir("work/catalog-qa", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto(base);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.screenshot({
    path: "work/catalog-qa/busca.png",
    fullPage: true,
  });
  await page.goto(base + "#/gestao");
  await page.screenshot({
    path: "work/catalog-qa/gestao.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(base + "#/editar/caminho-da-agua");
  await page.screenshot({ path: "work/catalog-qa/edicao-livre.png" });
  await page.locator('[data-element="diagram"] .inspect-target').click();
  await page.screenshot({ path: "work/catalog-qa/edicao.png" });
  await page.goto(base + "#/pagina/agua-em-numeros");
  await page.screenshot({
    path: "work/catalog-qa/leitura.png",
    fullPage: true,
  });
  console.log(
    "Capturas realizadas no navegador com o catálogo demonstrativo limpo.",
  );
} finally {
  await browser.close();
}
