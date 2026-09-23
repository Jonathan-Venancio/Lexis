export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <title>Esta página não carregou — Lexis</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #f6f1e7; color: #1c1917; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #57534e; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 999px; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #1c1917; color: #f6f1e7; }
      .secondary { background: transparent; color: #1c1917; border-color: #1c1917; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Esta página não carregou</h1>
      <p>Algo deu errado. Você pode tentar de novo ou voltar ao início.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar de novo</button>
        <a class="secondary" href="/">Ir para o início</a>
      </div>
    </div>
  </body>
</html>`;
}
