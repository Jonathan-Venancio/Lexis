# English Bloom

Quero que você crie o FRONTEND COMPLETO de uma aplicação web para estudo de inglês e gerenciamento de vocabulário pessoal.

IMPORTANTE:
Neste momento NÃO quero backend, banco de dados, API ou autenticação real.

Todo o aplicativo deve funcionar apenas no frontend, utilizando dados hardcoded/mockados para que eu consiga navegar, clicar, cadastrar informações e testar toda a experiência do produto.

Se for necessário persistir alterações durante os testes, pode utilizar localStorage, mas mantenha toda a arquitetura preparada para futuramente substituir os mocks/localStorage por uma API/backend.

OBJETIVO DO APP

O aplicativo será meu sistema pessoal para aprender inglês.

Minha meta é aprender pelo menos 10 palavras novas por dia.

Quero poder:

cadastrar palavras novas;

acompanhar quantas palavras aprendi por dia;

impedir palavras duplicadas;

cadastrar frases em inglês;

relacionar automaticamente frases com palavras do meu vocabulário;

pesquisar uma palavra e encontrar todas as frases onde ela aparece;

estudar através de flashcards;

utilizar repetição espaçada semelhante ao Anki;

cadastrar músicas;

armazenar a letra original em inglês;

escrever minha própria tradução;

armazenar uma tradução oficial/de referência;

comparar minha tradução com a tradução de referência;

acompanhar meu progresso geral.

O app deve parecer uma aplicação real e pronta para uso, mesmo utilizando apenas dados mockados.

DESIGN E EXPERIÊNCIA

Quero um design moderno, minimalista, elegante e focado em estudo.

Utilize:

React;

TypeScript;

Tailwind CSS;

componentes do shadcn/ui quando fizer sentido;

Lucide Icons;

layout responsivo para desktop e mobile.

Quero uma interface clean, com bastante espaço em branco, boa hierarquia visual e cards bem organizados.

Não quero aparência infantil ou gamificação exagerada.

Pode existir gamificação sutil através de:

streak;

progresso diário;

metas;

estatísticas;

mensagens de progresso.

Criar suporte visual para Light Mode e Dark Mode.

Use uma sidebar no desktop e navegação adequada para mobile.

As principais áreas serão:

Dashboard
Vocabulário
Frases
Revisão
Músicas

1. DASHBOARD

Criar uma página inicial que mostre rapidamente meu progresso.

No topo:

"Good evening, Alex"
"Ready to learn some English?"

Criar um card principal:

Daily Goal
7 / 10 words

Mostrar uma progress bar indicando 70%.

Também mostrar cards menores:

Total Words
247

Learning
38

Mastered
189

Due for Review
12

Current Streak
8 days

Também quero uma seção:

Today's Words

Exibir algumas palavras cadastradas hoje.

Exemplo:

achieve
although
aware
challenge
improve
likely
purpose

Cada palavra pode mostrar seu status:

New
Learning
Review
Mastered

Criar também um pequeno resumo:

"3 more words to reach today's goal."

Adicionar um botão destacado:

Add Word

2. VOCABULÁRIO

Criar uma página chamada:

Vocabulary

Ela será o coração do aplicativo.

Quero conseguir cadastrar uma nova palavra.

Botão:

Add Word

Ao clicar, abrir modal ou drawer.

Campos:

Word
Meaning / Translation
Definition in English
Example sentence
Notes

Opcionalmente:

Part of speech

Exemplo:

Word:
achieve

Translation:
alcançar / conseguir

Definition:
to succeed in doing something after making an effort

Example:
She worked hard to achieve her goals.

Part of speech:
verb

Ao salvar, adicionar a palavra à lista local.

IMPORTANTE:

NÃO permitir palavras duplicadas.

A comparação deve ignorar:

maiúsculas/minúsculas;

espaços antes/depois da palavra.

Exemplo:

Apple
apple
APPLE
apple

devem ser consideradas a MESMA palavra.

Caso o usuário tente cadastrar novamente, NÃO cadastrar.

Mostrar toast/alert:

"Word already exists in your vocabulary."

E oferecer um botão:

"View word"

que leva para a palavra já existente.

LISTAGEM DE VOCABULÁRIO

Mostrar tabela ou cards com:

Word
Translation
Part of Speech
Status
Date Added
Next Review
Sentences

Exemplo:

apple
maçã
noun
Learning
Today
Tomorrow
2 sentences

Adicionar:

Search
Filter
Sort

Filtros:

All
New
Learning
Review
Mastered

Ordenação:

Recently added
Oldest
A-Z
Z-A
Most reviewed

DETALHE DA PALAVRA

Ao clicar em uma palavra, abrir uma página de detalhes.

Exemplo:

APPLE

noun

maçã

Definition:
A round fruit with red, green or yellow skin.

Example:
I eat an apple every morning.

Mostrar:

Added:
September 23

Reviews:
8

Success Rate:
87%

Status:
Learning

Next Review:
Tomorrow

Também quero uma seção MUITO IMPORTANTE:

Sentences with "apple"

Mostrar automaticamente todas as frases cadastradas que contenham essa palavra.

Exemplo:

"The apple is red."

"I love apple pie."

"She bought an apple at the supermarket."

Mostrar:

3 sentences found

3. FRASES

Criar uma página:

Sentences

Essa área será utilizada para criar meu banco pessoal de frases em inglês.

Botão:

Add Sentence

Campos:

English Sentence
Translation (optional)
Notes (optional)

Exemplo:

English:
The apple is red.

Translation:
A maçã é vermelha.

Outro exemplo:

I love apple pie.

Outro:

The car is red.

RELAÇÃO ENTRE PALAVRAS E FRASES

Esse comportamento é muito importante.

O sistema deve analisar as frases cadastradas e identificar palavras do meu Vocabulary que aparecem nelas.

Por exemplo, meu vocabulário possui:

apple
red
car
love

E minhas frases são:

"The apple is red."
"I love apple pie."
"The car is red."

Ao pesquisar:

apple

Mostrar:

2 sentences found

The apple is red.
I love apple pie.

Ao pesquisar:

red

Mostrar:

2 sentences found

The apple is red.
The car is red.

Ao pesquisar:

car

Mostrar:

1 sentence found

The car is red.

Faça essa lógica funcionar no frontend utilizando os dados locais.

A busca deve ser case-insensitive.

Evitar matches incorretos por substring quando possível.

Por exemplo, pesquisar "car" não deveria encontrar automaticamente uma palavra maior que apenas contenha as letras "car".

Utilize tokenização simples das frases para simular corretamente esse comportamento.

Na página de uma frase, destacar visualmente as palavras que fazem parte do meu vocabulário.

Exemplo:

The [apple] is [red].

As palavras reconhecidas podem aparecer como chips/badges clicáveis.

Ao clicar em "apple", abrir os detalhes da palavra apple.

4. REVISÃO / FLASHCARDS

Criar uma área chamada:

Review

Quero um sistema inspirado no Anki.

Mostrar inicialmente:

12 cards due today

Botão:

Start Review

Ao iniciar, mostrar UM card por vez.

Frente:

achieve

Botão:

Show Answer

Depois de clicar:

achieve

alcançar / conseguir

to succeed in doing something after making an effort

Example:
She worked hard to achieve her goals.

Na parte inferior mostrar quatro opções:

Again
Hard
Good
Easy

Exemplo de intervalos:

Again
< 1 min

Hard
6 min

Good
1 day

Easy
4 days

Ao selecionar uma opção:

atualizar apenas o estado local;

avançar para o próximo card;

simular o próximo intervalo de revisão.

Não precisa implementar o algoritmo completo do Anki neste momento.

Criar uma versão simplificada de repetição espaçada.

Cada palavra deve possuir mock/local state como:

difficulty
reviewCount
lastReviewedAt
nextReviewAt
interval
status

Regra simplificada sugerida:

Again → volta para revisão imediatamente ou em poucos minutos.
Hard → intervalo pequeno.
Good → aumenta o intervalo normalmente.
Easy → aumenta bastante o intervalo.

Simular progressão como:

1 day
3 days
7 days
14 days
30 days
60 days

Criar também uma progress bar:

Card 4 of 12

Após terminar:

Review Complete!

12 cards reviewed

Again: 2
Hard: 3
Good: 5
Easy: 2

Mostrar uma mensagem:

"Next review: tomorrow"

5. MÚSICAS

Criar uma página:

Songs

Essa seção será utilizada para estudar inglês através de músicas.

Botão:

Add Song

Campos:

Song Title
Artist
Album (optional)
YouTube/Spotify URL (optional)

Lyrics in English

My Translation

Reference Translation

IMPORTANTE:

Não buscar letras ou traduções reais na internet.

Utilizar somente conteúdo mockado original/placeholder criado para a demonstração, para evitar depender de APIs ou conteúdo externo.

DETALHE DA MÚSICA

Criar uma experiência boa para tradução.

No topo:

Song title
Artist

Depois criar tabs:

Lyrics
My Translation
Compare

Em:

Lyrics

mostrar a letra em inglês.

Em:

My Translation

mostrar um editor/textarea onde posso escrever minha própria tradução.

Em:

Compare

quero comparar:

Original
My Translation
Reference Translation

Idealmente em colunas no desktop.

Exemplo:

ORIGINAL

I walked through the city lights

MY TRANSLATION

Eu caminhei pelas luzes da cidade

REFERENCE

Eu andei pelas luzes da cidade

Cada linha/trecho pode ser apresentado em cards para facilitar a comparação.

Criar visualmente estados mockados:

Correct
Close
Different

Não precisa utilizar IA para avaliar.

Pode deixar esses estados hardcoded apenas para demonstrar como futuramente essa funcionalidade funcionaria.

Adicionar uma pequena estatística:

Translation comparison

Correct: 65%
Close: 25%
Different: 10%

DADOS MOCKADOS

Popular inicialmente o aplicativo com bastante conteúdo para que eu consiga testar a interface.

Criar aproximadamente:

25 palavras
20 frases
3 músicas fictícias
12 cards pendentes de revisão

Exemplos de palavras:

achieve
although
aware
challenge
improve
likely
purpose
apple
red
car
love
journey
wonder
through
enough
instead
perhaps
choice
quiet
remember
discover
believe
change
future
learn

Criar frases relacionando várias dessas palavras.

Por exemplo:

"The apple is red."
"I love apple pie."
"The car is red."
"I believe things can change."
"This journey will be a challenge."
"Perhaps we will discover something new."

Isso é importante para testar o relacionamento Vocabulary ↔ Sentences.

INTERAÇÕES QUE PRECISAM FUNCIONAR

Apesar de não existir backend, quero que a interface seja realmente interativa.

Implementar:

adicionar palavra;

detectar palavra duplicada;

editar palavra;

excluir palavra;

pesquisar palavras;

filtrar palavras;

cadastrar frases;

editar frases;

excluir frases;

pesquisar frases por palavra;

detectar palavras do vocabulário dentro das frases;

abrir detalhes de uma palavra;

visualizar frases relacionadas;

iniciar sessão de flashcards;

virar card;

escolher Again / Hard / Good / Easy;

atualizar progresso da sessão;

finalizar sessão;

cadastrar música;

editar música;

escrever minha tradução;

alternar entre Lyrics / My Translation / Compare;

pesquisar músicas;

alternar Light/Dark Mode.

Todas essas operações devem funcionar utilizando estado frontend/localStorage.

LOCALSTORAGE

Criar uma camada simples de persistência utilizando localStorage.

Na primeira execução:

carregar os dados mockados.

Depois disso:

as alterações realizadas pelo usuário devem permanecer após atualizar a página.

Criar também em Settings ou em algum menu uma opção:

Reset Demo Data

Ao clicar:

mostrar confirmação:

"Reset all data to the original demo data?"

Cancel
Reset

Isso facilita meus testes.

ARQUITETURA

Mesmo sendo frontend-only, organize o código de maneira que seja fácil adicionar backend futuramente.

Separar:

components
pages
hooks
types
data
services/utils

Criar interfaces TypeScript para:

Word
Sentence
Song
ReviewCard
ReviewSession

Não misturar os dados mockados diretamente dentro dos componentes.

Criar algo como:

/data/mockWords.ts
/data/mockSentences.ts
/data/mockSongs.ts

Criar uma camada de repository/service local para que futuramente seja possível substituir localStorage por chamadas de API sem precisar reconstruir toda a UI.

NAVEGAÇÃO

Sidebar:

Home
Vocabulary
Sentences
Review
Songs

Na parte inferior:

Settings

Adicionar ícones Lucide apropriados.

No mobile utilizar bottom navigation ou menu responsivo.

DETALHES DE UX

Quero empty states bem feitos.

Exemplo:

"No sentences with this word yet."

"Add a sentence using 'achieve' to see it here."

Adicionar:

tooltips
toasts
confirmações de exclusão
loading states simulados quando fizer sentido
hover states
keyboard focus states
transições sutis

Não exagerar nas animações.

Priorizar velocidade e simplicidade.

OBJETIVO FINAL

Quero que você entregue uma aplicação frontend completamente navegável e funcional que pareça um produto real.

Não crie backend.

Não crie banco de dados.

Não utilize Supabase.

Não utilize Firebase.

Não crie autenticação real.

Não dependa de APIs externas.

Tudo deve funcionar localmente através de:

mock data
React state
localStorage

O objetivo desta primeira versão é validar UX, estrutura das páginas, fluxo de estudo e funcionalidades antes de desenvolver o backend.

Não faça apenas páginas estáticas.

Implemente de verdade no frontend as interações e regras descritas acima, especialmente:

prevenção de palavras duplicadas;

relacionamento automático entre palavras e frases;

busca de frases por palavra;

sessão funcional de flashcards;

repetição espaçada simplificada;

cadastro e comparação de traduções de músicas;

persistência via localStorage.

Comece criando toda a estrutura da aplicação e depois implemente as páginas e interações.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/03222ccf-6e97-4e8d-b9dd-f711b608de12).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
