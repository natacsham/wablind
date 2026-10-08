import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

declare global {
  interface Window {
    voiceTest: {
      created: number;
      starts: number;
      stops: number;
      aborts: number;
      language(): string;
      result(text: string, final?: boolean): void;
      error(code: string): void;
      end(): void;
      lateResult(text: string): void;
    };
  }
}

// These tests simulate recognition events. They do not measure speech accuracy
// or represent a real microphone / browser-provider verification.
async function installVoice(page: Page, mode: "working" | "throw" = "working") {
  await page.addInitScript((mode) => {
    type ResultEvent = {
      results: { isFinal: boolean; 0: { transcript: string } }[];
    };
    let last: FakeRecognition;
    let capturedResult: ((event: ResultEvent) => void) | null = null;
    class FakeRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onresult: ((event: ResultEvent) => void) | null = null;
      constructor() {
        last = this;
        window.voiceTest.created++;
      }
      start() {
        window.voiceTest.starts++;
        capturedResult = this.onresult;
        if (mode === "throw") throw new Error("Device unavailable");
        this.onstart?.();
      }
      stop() {
        window.voiceTest.stops++;
      }
      abort() {
        window.voiceTest.aborts++;
      }
    }
    window.voiceTest = {
      created: 0,
      starts: 0,
      stops: 0,
      aborts: 0,
      language: () => last.lang,
      result: (text, final = true) =>
        last.onresult?.({
          results: [{ isFinal: final, 0: { transcript: text } }],
        }),
      error: (code) => last.onerror?.({ error: code }),
      end: () => last.onend?.(),
      lateResult: (text) =>
        capturedResult?.({
          results: [{ isFinal: true, 0: { transcript: text } }],
        }),
    };
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: FakeRecognition,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: undefined,
    });
  }, mode);
}

test("voice starts only by request, fills the field and waits for confirmation", async ({
  page,
}) => {
  await installVoice(page);
  await page.goto("./");
  expect(await page.evaluate(() => window.voiceTest.created)).toBe(0);
  await expect(page.locator("#voice-note")).toContainText("pode enviar áudio");
  await page.getByRole("button", { name: "Falar", exact: true }).click();
  expect(await page.evaluate(() => window.voiceTest.language())).toBe("pt-BR");
  await expect(
    page.getByRole("button", { name: "Parar", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".voice-status")).toContainText("Microfone ativo");
  await page.evaluate(() => window.voiceTest.result("Biblioteca", false));
  await expect(page.locator(".voice-preview")).toContainText("Biblioteca");
  await expect(page.getByRole("combobox")).toHaveValue("");
  await page.evaluate(() => window.voiceTest.result("Biblioteca do bairro."));
  await expect(page.getByRole("combobox")).toHaveValue("Biblioteca do bairro");
  await expect(page.getByRole("combobox")).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Encontre uma página",
  );
  expect(await page.evaluate(() => window.voiceTest.aborts)).toBe(1);
  expect(
    await page.evaluate(() => localStorage.getItem("wablind.catalog.v1")),
  ).toBeNull();
  await page.getByRole("combobox").press("ArrowDown");
  await page.getByRole("combobox").press("Enter");
  await expect(page).toHaveURL(/#\/pagina\/biblioteca-do-bairro$/);
});

test("stopping waits for the final recognition and does not append duplicate events", async ({
  page,
}) => {
  await installVoice(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Falar", exact: true }).click();
  await page.getByRole("button", { name: "Parar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Encerrando", exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => window.voiceTest.stops)).toBe(1);
  await page.evaluate(() => window.voiceTest.result("Água em números"));
  await page.evaluate(() => window.voiceTest.lateResult("Água em números"));
  await expect(page.getByRole("combobox")).toHaveValue("Água em números");
});

for (const [error, message] of [
  ["not-allowed", "Microfone não autorizado"],
  ["network", "serviço de voz não respondeu"],
  ["no-speech", "Nenhuma fala"],
  ["audio-capture", "acessar o microfone"],
]) {
  test(`voice error ${error} preserves the typed query and keeps keyboard search available`, async ({
    page,
  }) => {
    await installVoice(page);
    await page.goto("./");
    await page.getByRole("combobox").fill("biblioteca");
    await page.getByRole("button", { name: "Falar", exact: true }).click();
    await page.evaluate((code) => window.voiceTest.error(code), error);
    await expect(page.locator(".voice-status")).toContainText(message);
    await expect(
      page.getByRole("button", { name: "Falar", exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole("combobox")).toHaveValue("biblioteca");
    expect(await page.evaluate(() => window.voiceTest.starts)).toBe(1);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/#\/pagina\/biblioteca-do-bairro$/);
  });
}

test("Escape, manual typing and leaving search release the microphone and ignore late results", async ({
  page,
}) => {
  await installVoice(page);
  await page.goto("./");
  await page.getByRole("combobox").fill("água");
  await page.getByRole("button", { name: "Falar", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".voice-status")).toContainText(
    "Microfone encerrado",
  );
  await page.evaluate(() => window.voiceTest.lateResult("Outro nome"));
  await expect(page.getByRole("combobox")).toHaveValue("água");
  await page.getByRole("button", { name: "Falar", exact: true }).click();
  await page.getByRole("combobox").fill("biblioteca");
  await page.evaluate(() => window.voiceTest.lateResult("Outro nome"));
  await expect(page.getByRole("combobox")).toHaveValue("biblioteca");
  await page.getByRole("button", { name: "Falar", exact: true }).click();
  await page
    .getByRole("link", { name: "Área do professor", exact: true })
    .click();
  // Hash navigation and the recognition cleanup run after the click event.
  await expect.poll(() => page.evaluate(() => window.voiceTest.aborts)).toBe(3);
});

test("a recognition attempt has a time limit and handles a missing end event", async ({
  page,
}) => {
  await page.clock.install();
  await installVoice(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Falar", exact: true }).click();
  await page.clock.fastForward(30000);
  await expect(page.locator(".voice-status")).toContainText("Encerrando");
  await page.clock.fastForward(1600);
  await expect(
    page.getByRole("button", { name: "Falar", exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => window.voiceTest.aborts)).toBe(1);
  expect(await page.evaluate(() => window.voiceTest.starts)).toBe(1);
});

test("unsupported voice is explained and does not block text search", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Falar", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#voice-note")).toContainText(
    "indisponível neste navegador",
  );
  await page.getByRole("combobox").fill("biblioteca");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/#\/pagina\/biblioteca-do-bairro$/);
});

test("a startup exception restores the idle state", async ({ page }) => {
  await installVoice(page, "throw");
  await page.goto("./");
  await page.getByRole("button", { name: "Falar", exact: true }).click();
  await expect(page.locator(".voice-status")).toContainText(
    "Não foi possível iniciar",
  );
  await expect(
    page.getByRole("button", { name: "Falar", exact: true }),
  ).toBeEnabled();
});

test("voice controls have accessible labels and reflow while listening", async ({
  page,
}) => {
  await installVoice(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Falar", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(
    page.getByRole("button", { name: "Parar", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(report.violations).toEqual([]);
});

test("the About page preserves the historical name and explains ELIA", async ({
  page,
}) => {
  await page.goto("./#/sobre");
  await expect(page).toHaveTitle(/ELIA/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Da WABlind à ELIA",
  );
  await expect(
    page.getByText("Edição e Leitura com Interação Acessível", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Artigo sobre a WABlind e sua avaliação de comunicabilidade",
    }),
  ).toHaveAttribute("href", "https://doi.org/10.5753/cbie.sbie.2018.1153");
});

test("hiding the tab cancels recognition without restarting it", async ({
  page,
}) => {
  await installVoice(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Falar", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Falar", exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => window.voiceTest.aborts)).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.voiceTest.lateResult("Outro nome");
  });
  await expect(page.getByRole("combobox")).toHaveValue("");
  expect(await page.evaluate(() => window.voiceTest.starts)).toBe(1);
});

test("without JavaScript the built page still offers three working reading links", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  try {
    const page = await context.newPage();
    await page.goto("./");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ELIA");
    const links = page.locator("noscript a");
    await expect(links).toHaveCount(3);
    for (const href of await links.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).href),
    )) {
      const response = await context.request.get(href);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain("<h1");
    }
    await links.first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  } finally {
    await context.close();
  }
});
