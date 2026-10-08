import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home and teacher selection fit a desktop viewport without catalog cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const route of ["", "#/gestao"]) {
    await page.goto(`./${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    await expect(page.locator(".page-cards, .management-list")).toHaveCount(0);
  }
  const selection = page.getByLabel("Página para editar");
  await expect(selection.locator("option")).toHaveCount(4);
  await selection.selectOption("biblioteca-do-bairro");
  await expect(
    page.getByRole("link", { name: "Ver leitura de Biblioteca do bairro" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true);
});

test("native teacher selection works by keyboard without opening a page on change", async ({
  page,
}) => {
  await page.goto("./#/gestao");
  const selection = page.getByLabel("Página para editar");
  await page
    .getByRole("button", { name: "Editar página", exact: true })
    .click();
  await expect(selection).toBeFocused();
  await expect(page).toHaveURL(/#\/gestao$/);
  await selection.press("Home");
  await selection.press("ArrowDown");
  await selection.press("ArrowDown");
  await expect(selection).toHaveValue("agua-em-numeros");
  await expect(page).toHaveURL(/#\/gestao$/);
  await selection.press("Tab");
  await expect(
    page.getByRole("button", { name: "Editar página", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/editar\/agua-em-numeros$/);
  await expect(page.locator("main")).toBeFocused();
});

test("compact controls retain readable text, target size and reflow at 200 percent text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const route of ["", "#/gestao"]) {
    await page.goto(`./${route}`);
    const controls = page.locator("main input, main select, main button");
    for (const control of await controls.all()) {
      expect(
        await control.evaluate((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        ),
      ).toBeGreaterThanOrEqual(16);
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("page title is inspectable, editable and used in the saved reading, search and browser title", async ({
  page,
}) => {
  await page.goto("./#/editar/caminho-da-agua");
  await page.locator('[data-element="page-title"] .inspect-target').click();
  await page
    .getByLabel("Título da página", { exact: true })
    .fill("Rios e cidades");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.goto("./");
  await page.getByRole("combobox").fill("Rios e cidades");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Rios e cidades",
  );
  await expect(page).toHaveTitle(/Rios e cidades/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Rios e cidades",
  );
  await page.goto("./#/gestao");
  await expect(
    page
      .getByLabel("Página para editar")
      .locator('option[value="caminho-da-agua"]'),
  ).toHaveText("Rios e cidades");
});
test("fictional websites have editable masthead, banner, sidebar and footer, without third-party resources", async ({
  page,
}) => {
  for (const id of [
    "caminho-da-agua",
    "agua-em-numeros",
    "biblioteca-do-bairro",
  ]) {
    await page.goto(`./#/editar/${id}`);
    for (const element of [
      "site-brand",
      "page-title",
      "top-banner",
      "lead-image",
      "sidebar-ad",
      "site-footer",
    ]) {
      await expect(
        page.locator(`[data-element="${element}"] .inspect-target`),
      ).toHaveCount(1);
    }
    await expect(page.getByRole("img")).toHaveCount(5);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 720 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
});

test("keyboard autocomplete opens the prepared page and moves focus", async ({
  page,
}) => {
  await page.goto("./");
  const search = page.getByRole("combobox", {
    name: "Nome ou endereço da página",
  });
  await search.fill("biblioteca");
  await search.press("ArrowDown");
  await expect(search).toHaveAttribute(
    "aria-activedescendant",
    "suggestion-biblioteca-do-bairro",
  );
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Biblioteca do bairro",
  );
  await expect(page.locator("main")).toBeFocused();
  await expect(
    page.getByText("Banner fictício de divulgação.", { exact: false }),
  ).toHaveCount(0);
});
test("editing changes semantics and descriptions, publishes locally and survives reload", async ({
  page,
}) => {
  await page.goto("./#/gestao");
  await page.getByLabel("Página para editar").selectOption("caminho-da-agua");
  await page
    .getByRole("button", { name: "Editar página", exact: true })
    .click();
  await page
    .getByLabel("Selecionar elemento", { exact: true })
    .selectOption("steps-title");
  await page.getByText("Texto e descrição", { exact: true }).click();
  await page.getByLabel("Texto", { exact: true }).fill("Percurso observado");
  await page.getByLabel("Classificar como").selectOption("heading");
  await page.getByLabel("Outra etiqueta").fill("Leitura principal");
  await page
    .getByLabel("Selecionar elemento", { exact: true })
    .selectOption("diagram");
  await page
    .getByLabel("Descrição da imagem", { exact: true })
    .fill("Rio, vapor e chuva conectados por setas.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.getByRole("link", { name: "Buscar páginas", exact: true }).click();
  await page.getByRole("combobox").fill("caminho");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Percurso observado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Rio, vapor e chuva conectados por setas." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Percurso observado" }),
  ).toBeVisible();
});
test("draft stays separate and removing an element is reversible", async ({
  page,
}) => {
  await page.goto("./#/editar/agua-em-numeros");
  await page
    .getByLabel("Selecionar elemento", { exact: true })
    .selectOption("chart");
  await page
    .getByRole("button", { name: "Excluir elemento", exact: true })
    .click();
  await page.getByRole("link", { name: "Ver leitura", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /^Gráfico de barras:/ }),
  ).toHaveCount(0);
  await page.goto("./#/pagina/agua-em-numeros");
  await expect(
    page.getByRole("img", { name: /^Gráfico de barras:/ }),
  ).toHaveCount(1);
  await page.goto("./#/editar/agua-em-numeros");
  await page.getByRole("button", { name: /Excluídos/ }).click();
  await page
    .getByRole("button", { name: "Restaurar Consumo mensal da escola" })
    .click();
  await expect(
    page.getByRole("img", { name: /^Gráfico de barras:/ }),
  ).toHaveCount(1);
});
test("a missing image description blocks publication with focus on the error", async ({
  page,
}) => {
  await page.goto("./#/editar/caminho-da-agua");
  await page
    .getByLabel("Selecionar elemento", { exact: true })
    .selectOption("diagram");
  await page.getByLabel("Descrição da imagem", { exact: true }).fill("");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Descreva a informação da imagem",
  );
  await expect(page.getByRole("alert")).toBeFocused();
});
test("corrupt storage is preserved and the fallback remains usable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("wablind.catalog.v1", "{broken"),
  );
  await page.goto("./#/editar/caminho-da-agua");
  await expect(page.getByRole("alert")).toContainText(
    "sem substituir seus dados",
  );
  await page.locator('[data-element="intro"] .inspect-target').click();
  await page.getByText("Texto e descrição", { exact: true }).click();
  await page.getByLabel("Texto", { exact: true }).fill("Texto temporário");
  expect(
    await page.evaluate(() => localStorage.getItem("wablind.catalog.v1")),
  ).toBe("{broken");
});
test("storage failures are reported without losing the current edit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };
  });
  await page.goto("./#/editar/caminho-da-agua");
  await page.locator('[data-element="intro"] .inspect-target').click();
  await page.getByText("Texto e descrição", { exact: true }).click();
  await page.getByLabel("Texto", { exact: true }).fill("Texto em memória");
  await expect(page.getByRole("alert")).toContainText("não permitiu salvar");
  await expect(page.getByLabel("Texto", { exact: true })).toHaveValue(
    "Texto em memória",
  );
});
test("empty and unavailable searches do not simulate a capture", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("combobox")).toBeFocused();
  await page.getByRole("combobox").fill("https://not-in-catalog.example/");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator(".search-status")).toContainText("Nenhuma página");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Encontre uma página",
  );
});
test("the teacher and reader have no HTML or JSON download controls", async ({
  page,
}) => {
  await page.goto("./#/editar/caminho-da-agua");
  await expect(
    page.getByRole("button", { name: /Baixar|Exportar|Download/ }),
  ).toHaveCount(0);
  await page.goto("./#/pagina/agua-em-numeros");
  await expect(
    page.getByRole("button", { name: /Baixar|Exportar|Download/ }),
  ).toHaveCount(0);
});
for (const route of [
  "",
  "gestao",
  "editar/caminho-da-agua",
  "pagina/agua-em-numeros",
  "sobre",
]) {
  test(`axe and narrow-screen checks: /${route}`, async ({ page }) => {
    await page.goto(`./#/${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 720 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
test("keyboard selection opens options and Escape restores focus to the selected element", async ({
  page,
}) => {
  await page.goto("./#/editar/caminho-da-agua");
  const target = page.locator('[data-element="diagram"] .inspect-target');
  await target.focus();
  await target.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Elemento selecionado", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".inspector-panel")).toHaveCount(0);
  await expect(target).toBeFocused();
});
test("no authentication or network API is used", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      external.push(request.url());
  });
  await page.goto("./");
  await page
    .getByRole("link", { name: "Área do professor", exact: true })
    .click();
  await page
    .getByLabel("Página para editar")
    .selectOption("biblioteca-do-bairro");
  await page
    .getByRole("button", { name: "Editar página", exact: true })
    .click();
  await page.locator('[data-element="intro"] .inspect-target').click();
  await page.getByText("Texto e descrição", { exact: true }).click();
  await page.getByLabel("Outra etiqueta").fill("Consulta");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
  expect(external).toEqual([]);
});
test("pointer inspection highlights content and opens a contextual panel, not cards", async ({
  page,
}) => {
  await page.goto("./#/editar/caminho-da-agua");
  await expect(page.locator(".inspector-panel")).toHaveCount(0);
  await expect(page.locator(".editable-element")).toHaveCount(0);
  const target = page.locator('[data-element="diagram"] .inspect-target');
  await target.hover();
  await expect(target.locator(".inspect-label")).toHaveCSS("opacity", "1");
  await target.click();
  await expect(page.getByLabel("Classificar como")).toHaveValue("image");
  await expect(
    page.getByLabel("Descrição da imagem", { exact: true }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("annotations and the page focus survive saving and offer a direct reading destination", async ({
  page,
}) => {
  await page.goto("./#/editar/agua-em-numeros");
  await page.locator('[data-element="table"] .inspect-target').click();
  await page
    .getByLabel("Conteúdo principal da página", { exact: true })
    .check();
  await page.getByLabel("Informação importante", { exact: true }).check();
  await page.getByLabel("Instrução", { exact: true }).check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.goto("./#/pagina/agua-em-numeros");
  await page
    .getByRole("link", { name: "Ir direto ao conteúdo principal" })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Conteúdo principal da página",
      exact: true,
    }),
  ).toBeFocused();
  await expect(page).toHaveURL(/#\/pagina\/agua-em-numeros$/);
  await expect(
    page.getByText("Informação importante · Instrução", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Ir direto ao conteúdo principal" }),
  ).toBeVisible();
});

test("menu selection, advertisement marking, delete and undo operate on the page", async ({
  page,
}) => {
  await page.goto("./#/editar/caminho-da-agua");
  await page.locator('[data-element="navigation"] .inspect-target').click();
  await expect(page.getByLabel("Classificar como")).toHaveValue("menu");
  await page.getByRole("button", { name: /Excluídos/ }).click();
  await page
    .getByRole("button", { name: /Restaurar Espaço demonstrativo/ })
    .click();
  await page.getByLabel("Classificar como").selectOption("advertisement");
  await expect(
    page
      .locator('[data-element="promo"]')
      .getByRole("complementary", { name: "Propaganda" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Excluir elemento", exact: true })
    .click();
  await expect(page.locator('[data-element="promo"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(page.locator('[data-element="promo"]')).toBeVisible();
});

test("failed storage never reports a successful save or changes the published reading", async ({
  page,
}) => {
  await page.goto("./#/editar/caminho-da-agua");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };
  });
  await page.locator('[data-element="intro"] .inspect-target').click();
  await page.getByText("Texto e descrição", { exact: true }).click();
  await page.getByLabel("Texto", { exact: true }).fill("Conteúdo não salvo");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("não permitiu salvar");
  await expect(page.locator(".app-status")).not.toContainText("Página salva");
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeEnabled();
  await page.goto("./#/pagina/caminho-da-agua");
  await expect(
    page.getByText("Conteúdo não salvo", { exact: true }),
  ).toHaveCount(0);
});
