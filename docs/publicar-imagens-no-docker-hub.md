# Publicar as imagens do Lexis no Docker Hub

Este arquivo explica, na ordem, o que foi preciso para o GitHub construir duas imagens Docker e enviá-las para o Docker Hub. A próxima vez, em outro projeto, o caminho é o mesmo: um `Dockerfile` por serviço, dois segredos no repositório, e um workflow em `.github/workflows/`.

O Lexis publica:

| Imagem | Conteúdo | Porta dentro do container | Domínio |
| --- | --- | --- | --- |
| `<usuario>/lexis-backend` | API FastAPI | 8000 | `https://apilexis.jonathanvenancio.site` |
| `<usuario>/lexis-frontend` | App | 3000 | `https://lexis.jonathanvenancio.site` |

`<usuario>` é o valor do segredo `DOCKERHUB_USERNAME`.

## 1. Separar o que vira imagem

Cada processo que sobe sozinho vira uma imagem. Aqui são dois: a API e o app. O workflow não inventa o servidor. Ele só executa o `docker build` de cada pasta e faz o `docker push`.

Por isso existem:

- `Backend/Dockerfile`
- `Frontend/Dockerfile`
- `.github/workflows/docker-hub.yml`

## 2. Imagem da API

O `Backend/Dockerfile` tem dois estágios.

O primeiro instala o Poetry e roda `poetry install --only main`. Isso deixa de fora pytest, httpx e taskipy. O ambiente fica em `/app/.venv`.

O segundo estágio é a imagem que vai para o Docker Hub. Ela copia só o `.venv`, o código em `app/`, as migrações do Alembic e o `docker/entrypoint.sh`. Não copia o Poetry.

O container sobe assim:

1. `alembic upgrade head` aplica as migrações.
2. `uvicorn` escuta em `0.0.0.0:8000`, para o proxy conseguir entrar no container.

Duas variáveis já vêm com valor de deploy, e as duas podem ser trocadas na hora de rodar o container, sem gerar a imagem de novo:

- `CORS_ORIGINS=https://lexis.jonathanvenancio.site`
  O navegador do app chama a API em outro domínio. Sem esse valor, o browser bloqueia a resposta.
- `DATABASE_URL=sqlite:///./data/lexis.db`
  Serve para um teste. No servidor, na API, preencha `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`. Com essas quatro obrigatórias (`DB_PORT` pode ficar 5432), a API usa Postgres e ignora o SQLite da imagem.
- `JWT_SECRET`
  Segredo que assina o token de login. No EasyPanel, na API, coloque um valor longo e aleatório. Sem isso o container sobe com um segredo de desenvolvimento e um token pode ser forjado. Trocar o segredo desloga todo mundo.

O arquivo `Backend/.dockerignore` impede que `.venv`, `.env` e o banco local entrem no build.

## 3. Imagem do app

O TanStack Start, sozinho, não abre uma porta. O `vite build` gera um handler. O plugin `nitro()` em `Frontend/vite.config.ts` transforma esse handler num servidor Node. A saída fica em `.output/server/index.mjs`, e o script `npm start` sobe esse arquivo.

O `Frontend/Dockerfile` também tem dois estágios.

No build, `VITE_API_URL` entra antes do `npm run build`. O Vite grava esse endereço dentro do JavaScript que o navegador baixa. O valor padrão é:

```text
https://apilexis.jonathanvenancio.site
```

Sem barra no final. O app junta esse endereço com caminhos como `/api/words`.

Isso não muda o `npm run dev`. Em desenvolvimento a variável fica vazia e o Vite continua encaminhando `/api` para `http://127.0.0.1:8000`.

Na imagem final só entra a pasta `.output`. O servidor escuta em `0.0.0.0:3000`.

Se o domínio da API mudar, altere o `build-args` do workflow e publique a imagem de novo. Trocar uma variável no container já pronto não muda o JavaScript que foi gerado no build.

## 4. Segredos no GitHub

O token do Docker Hub não fica no repositório. Ele fica em **Settings → Secrets and variables → Actions → Secrets**.

Este repositório já tem:

- `DOCKERHUB_TOKEN`
- `DOCKERHUB_USERNAME`

No workflow eles aparecem como `secrets.DOCKERHUB_TOKEN` e `secrets.DOCKERHUB_USERNAME`. São segredos, não Variables. Variable fica visível para quem edita o repositório. O token não pode estar lá.

Para criar de novo, em outro repositório:

1. No Docker Hub, em **Account Settings → Personal access tokens**, crie um token com permissão de leitura e escrita.
2. No GitHub, abra o repositório, **Settings → Secrets and variables → Actions → New repository secret**.
3. Crie `DOCKERHUB_USERNAME` com o nome da conta.
4. Crie `DOCKERHUB_TOKEN` com o token.
5. Os nomes no workflow têm que ser exatamente esses, ou os que você escrever em `secrets.NOME`.

O GitHub não mostra o valor de um segredo depois de salvo. Se o login falhar, apague o segredo e crie outro.

## 5. O workflow

O arquivo é `.github/workflows/docker-hub.yml`. O GitHub só reconhece workflows dentro de `.github/workflows/`, com extensão `.yml` ou `.yaml`.

### Quando ele roda

```yaml
on:
  push:
    branches: [master]
  workflow_dispatch:
```

- Um push na branch `master` dispara o build. Esta é a branch padrão deste repositório. Se o projeto usar `main`, troque essa linha.
- `workflow_dispatch` coloca o botão **Run workflow** na aba Actions, para publicar sem um commit novo.

```yaml
concurrency:
  group: docker-hub-${{ github.ref }}
  cancel-in-progress: true
```

Se chegar um segundo push enquanto o primeiro ainda constrói, o GitHub cancela o antigo. Só a publicação mais nova continua.

`permissions: contents: read` deixa o job ler o código. Publicar no Docker Hub não precisa de permissão de escrita no GitHub. A autenticação é o token do Docker Hub.

### Dois jobs

`backend` e `frontend` são jobs separados. O GitHub executa os dois ao mesmo tempo, cada um numa máquina `ubuntu-latest` limpa.

Cada job repete os mesmos quatro passos.

**Baixar o código.** `actions/checkout@v4` clona o repositório na máquina do Actions. Sem isso, não existe `Backend/Dockerfile`.

**Preparar o Buildx.** `docker/setup-buildx-action@v3` liga o builder que o passo seguinte usa. A máquina já tem Docker. Esse passo só deixa o build no formato que a action de push espera.

**Entrar no Docker Hub.** `docker/login-action@v3` recebe o usuário e o token pelos segredos. O equivalente no seu computador é `docker login`.

**Construir e publicar.** `docker/build-push-action@v6` faz o `docker build` e, com `push: true`, o `docker push`.

Campos que importam:

- `context` é a pasta enviada para o build. `Backend` para a API e `Frontend` para o app. O `Dockerfile` dessa pasta é o que o Docker lê. `file` aponta para ele de forma explícita.
- `tags` são os nomes no Docker Hub. Cada imagem recebe duas tags:
  - `latest`, a que o deploy costuma puxar.
  - o SHA do commit, por exemplo `lexis-backend:a1b2c3d...`. Serve para voltar a uma versão antiga se a `latest` quebrar.
- No app, `build-args` define `VITE_API_URL`. Esse nome tem que existir como `ARG` no `Dockerfile`. O valor daqui substitui o padrão do `Dockerfile`.

O `@v4`, `@v3` e `@v6` são a versão maior da action. Elas recebem correções sem você mudar o arquivo. Quando for copiar este workflow daqui a muito tempo, confira na página da action no GitHub se essa versão maior ainda existe.

## 6. Ver se publicou

1. Faça commit destes arquivos e envie para `master`. O workflow só existe no GitHub depois desse push.
2. Abra a aba **Actions** do repositório. O workflow se chama **Publicar imagens no Docker Hub**.
3. Os dois jobs ficam verdes quando as imagens subiram.
4. No Docker Hub, na sua conta, aparecem `lexis-backend` e `lexis-frontend`, cada uma com as tags `latest` e o SHA.

Se o job falhar no login, o nome ou o token do segredo está diferente do que a action lê. Se falhar no build, abra o log do passo **Construir e publicar**. O erro é o mesmo de um `docker build` na sua máquina.

## 7. Subir no servidor

O workflow só entrega as imagens. Quem aponta o domínio para o container é o servidor, com um proxy e HTTPS na frente.

A API:

```sh
docker pull USUARIO/lexis-backend:latest
docker run -d --name lexis-api --restart unless-stopped \
  -p 8000:8000 \
  -e DB_HOST=nome-do-postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=lexis \
  -e DB_USER=lexis \
  -e DB_PASSWORD=senha \
  -e CORS_ORIGINS=https://lexis.jonathanvenancio.site \
  USUARIO/lexis-backend:latest
```

O app:

```sh
docker pull USUARIO/lexis-frontend:latest
docker run -d --name lexis-app --restart unless-stopped \
  -p 3000:3000 \
  USUARIO/lexis-frontend:latest
```

No proxy:

- `lexis.jonathanvenancio.site` encaminha para a porta 3000.
- `apilexis.jonathanvenancio.site` encaminha para a porta 8000.

Os containers falam HTTP. O certificado fica no proxy.

Para conferir a API antes do domínio: `curl http://127.0.0.1:8000/api/health` deve responder `{"status":"ok"}`.

Se for testar com SQLite em vez de Postgres, monte um volume para os dados não sumirem quando o container for recriado:

```sh
docker run -d --name lexis-api --restart unless-stopped \
  -p 8000:8000 \
  -v lexis-data:/app/data \
  USUARIO/lexis-backend:latest
```

## 8. Repetir em outro projeto

1. Escreva um `Dockerfile` na pasta do serviço. O que você roda no terminal (`uvicorn`, `node .output/server/index.mjs`) vira o `CMD` ou o `ENTRYPOINT`.
2. Crie um `.dockerignore` para deixar de fora `node_modules`, `.venv`, `.env` e a pasta de build. A imagem gera isso de novo.
3. Se o front grava a URL da API no build, passe essa URL com `ARG` e `build-args`. Se a configuração pode mudar no servidor, use variável de ambiente lida quando o processo inicia, como o `DATABASE_URL` e o `CORS_ORIGINS`.
4. Crie os segredos `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`.
5. Copie `.github/workflows/docker-hub.yml`.
6. Troque `master` se a branch for outra.
7. Troque `context`, `file`, o nome da imagem e, no front, o `VITE_API_URL`.
8. Envie para a branch configurada em `on.push.branches` e acompanhe a aba Actions.
