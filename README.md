# ERP Letícia Lustosa — projeto modular

Projeto completo extraído da versão revisada do ERP de Encerramentos 2026. Os dez temas, componentes, regras, integrações, cálculos e comportamentos foram preservados.

## Executar

1. Extraia o ZIP inteiro, mantendo as pastas junto de `index.html`.
2. Abra `index.html` no navegador.
3. Para servir o projeto por HTTP, execute `python -m http.server 8000` dentro desta pasta e acesse `http://localhost:8000`.

Não é necessário instalar pacotes, compilar ou executar um bundler. Fontes Google, Chart.js, SweetAlert2 e as integrações existentes continuam dependendo de internet. A API real e sua configuração foram mantidas.

## Organização

| Caminho | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura da interface e referências aos arquivos locais e externos; sem scripts, blocos CSS ou atributos de estilo embutidos. |
| `css/themes/` | Uma folha CSS completa por tema, incluindo tokens, componentes, responsividade e animações. |
| `css/settings.css` | Tela de temas, opções de layout/densidade e adaptação responsiva. |
| `css/compatibility.css` | Ajustes já existentes para logos, efeitos, componentes e gráficos. |
| `css/components.css` | Apresentação estática antes definida em sete atributos `style` do HTML. |
| `js/core/` | Módulos operacionais do ERP, separados nos limites das seções originais. |
| `js/themes/registry.js` | Metadados, identidades, fragmentos visuais, fontes e configurações de apresentação dos gráficos. |
| `js/themes/boot.js` | Restauração síncrona da preferência, ativação da folha CSS e sincronização entre abas. |
| `js/themes/effects/` | Registro das funções e um arquivo de efeitos/mascote/easter egg por tema. |
| `js/themes/runtime.js` | Ciclo de vida dos efeitos, áudio, timers, partículas e pausa quando a página está oculta. |
| `js/themes/settings.js` | Seletor de temas, diálogo, montagem da identidade visual e apresentação dos gráficos. |
| `js/themes/assets.js` | Mapeamento fixo de fotos, trilhas e vídeo por tema; resolução dos caminhos locais. |
| `js/forms/cnj.js` | Máscara progressiva e validação CNJ no formulário, sem modificar os módulos de negócio. |
| `assets/images/` | Fotos originais extraídas sem recompressão. |

## Módulos de negócio

Os arquivos em `js/core/` são carregados nesta ordem:

1. `config-state.js`: configurações, chaves de armazenamento e estado original.
2. `helpers.js`: funções auxiliares e formatação.
3. `audit-log.js`: registro e apresentação dos logs.
4. `cloud-api.js`: comunicação e sincronização com a API existente.
5. `calculations.js`: meses, filtros, indicadores e cálculos financeiros.
6. `render.js`: atualização dos indicadores, gráficos, tabela e interface.
7. `records.js`: cadastro, edição, exclusão, validações e metas.
8. `diagnostics.js`: diagnósticos e Radar Financeiro.
9. `aurora.js`: configuração, mensagens, ações e integração da Aurora.
10. `audit-window.js`: janela de auditoria e seu comportamento de arraste.
11. `init.js`: associação dos eventos, atalhos e inicialização.

A concatenação desses onze arquivos, nessa ordem, é byte a byte igual ao núcleo operacional da versão anterior. Não foram alteradas funções, constantes, fórmulas, validações ou chamadas de API.

Os scripts mantêm o escopo global clássico do sistema existente. Essa decisão preserva suas referências compartilhadas e permite abrir o projeto diretamente por `file://`. Os scripts do corpo usam `defer`, mantendo a ordem de execução e permitindo o download paralelo. Não substitua essa ordem nem adicione `async`.

## Temas e estilos

Temas disponíveis: Original, Claro, Escuro, Natal, Ano Novo, Páscoa, Festa Junina, Halloween, Terror e Cyberpunk.

As dez folhas CSS são carregadas antes da inicialização visual. O bootstrap ativa apenas a folha selecionada por meio de `CSSStyleSheet.disabled`; as demais permanecem fora da cascata. Isso mantém a troca síncrona, sem misturar regras ou keyframes entre temas e sem aguardar uma nova requisição durante a seleção. Os arquivos comuns de configurações, compatibilidade e componentes são aplicados depois dos temas.

As folhas de cada tema mantêm integralmente o conteúdo da versão anterior. Os efeitos mantêm seu comportamento; no easter egg do Terror, a mídia foi substituída pelo vídeo `JumpScare.mp4`, sem trilha separada. Os estilos calculados em tempo de execução, como posições das partículas, continuam sendo controlados pelos scripts.

## Mídias automáticas

O seletor manual de arquivos foi removido. O arquivo `js/themes/assets.js` contém o mapeamento exato solicitado; veja a tabela completa e as pastas reconhecidas em `MIDIAS.md`.

A mídia é carregada quando o mascote/easter egg é acionado. Ao fechar o popup, ocultar a página ou trocar de tema, a reprodução anterior é pausada. Ao trocar de tema, os recursos da mídia anterior são liberados. O Terror utiliza apenas `JumpScare.mp4` para imagem em movimento e áudio do easter egg.

Mantenha os arquivos de mídia que já existem no seu repositório. Os novos arquivos nomeados em `MIDIAS.md` não estavam na cópia disponibilizada para esta atualização e não foram substituídos por arquivos fictícios. As duas fotos legadas da entrega anterior foram conservadas, mas não substituem os nomes do novo mapeamento.

Se o navegador bloquear a reprodução, o popup oferece o controle nativo para iniciar o áudio/vídeo; não há seleção manual de arquivo. A reprodução continua dependendo da política de mídia do navegador.

## Número de processo CNJ

O campo `numProcesso` limpa caracteres não numéricos, limita a digitação/colagem a vinte dígitos e aplica progressivamente `NNNNNNN-DD.AAAA.J.TR.OOOO`, preservando zeros à esquerda e o cursor durante a edição.

No `blur` e antes do envio do formulário, `js/forms/cnj.js` verifica o tamanho e calcula:

`BigInt(NNNNNNNAAAAJTROOOODD) % 97n === 1n`

Números incompletos ou com dígito verificador inválido geram um SweetAlert e não chegam ao handler de gravação. O listener de validação usa a fase de captura; os onze arquivos em `js/core/` permanecem idênticos à versão anterior. Registros já armazenados não são reescritos. Ao salvar um registro pelo formulário, aplica-se a nova validação solicitada.

## Persistência

As chaves de negócio e de aparência no `localStorage`, as chamadas da API e os dados da nuvem permanecem intactos. A antiga escolha manual de áudio via IndexedDB não é mais utilizada; o banco anterior não é apagado. A persistência continua vinculada ao navegador e à origem do endereço aberto.

## Publicar no GitHub Pages

Coloque o conteúdo desta pasta na pasta publicada pelo repositório, com `index.html`, `css/` e `js/` no mesmo nível. Preserve as mídias já existentes na raiz ou nas pastas reconhecidas em `MIDIAS.md`. Os caminhos são resolvidos relativamente ao `index.html`, inclusive quando o site é publicado em um subdiretório como `/nome-do-repositorio/`.

## Manutenção

Edite os tokens e estilos do tema desejado em `css/themes/`. Para alterar exclusivamente seu mascote ou easter egg, utilize o arquivo correspondente em `js/themes/effects/`. Os dados e cálculos permanecem em `js/core/`.

Consulte `VALIDACAO.md` para o escopo da verificação desta entrega.
