# Validação — mídias automáticas e CNJ

## Integridade preservada

Os onze arquivos em `js/core/` e as dez folhas em `css/themes/` permanecem byte a byte iguais à entrega modular anterior. APIs, cálculos, dados, chaves de negócio no LocalStorage, sincronização, gráficos, auditoria e Aurora não foram reescritos.

A máscara/validação foi adicionada em `js/forms/cnj.js`, com listeners próprios. O listener de envio usa captura para bloquear CNJs inválidos antes do handler existente. O carregamento de mídia foi centralizado em `js/themes/assets.js` e `js/themes/runtime.js`. O efeito do Terror foi ajustado para utilizar vídeo em vez de foto e áudio separados. Os demais arquivos de efeitos permanecem idênticos.

O núcleo de negócio preservado mantém o SHA-256:

`2b9a5ec7e03195d2f20dc27242d3d0baea36b403f031dbfeb9196508b1f459b3`

## CNJ

- Testes das funções puras com duzentos números matematicamente válidos e alterações inválidas, além de casos vazios, incompletos e longos.
- Máscara progressiva de zero a vinte dígitos; remoção de caracteres não numéricos e conservação de zeros à esquerda.
- Digitação e colagem real com Ctrl+V no navegador, incluindo texto com espaços, pontuação e dígitos excedentes.
- Edição com Backspace/Delete ao lado dos separadores e preservação do cursor.
- SweetAlert no blur incompleto e no submit vazio ou com dígito verificador inválido.
- Nenhuma gravação na API nem inclusão local quando a validação falha; ausência de alertas duplicados.
- Gravação válida pelo handler original, com o número formatado.
- Limpeza automática depois de salvar sem aviso indevido por blur do campo recém-limpo.

## Mídias

- Seletor manual de arquivos e uso do antigo áudio escolhido via IndexedDB removidos.
- Os dez mapeamentos exatos foram exercitados no navegador.
- Nove fotos e suas trilhas carregaram; no Terror, somente o vídeo `JumpScare.mp4`, com áudio do próprio vídeo.
- Fechar o popup e trocar de tema interrompem a reprodução. Na troca, a origem da mídia anterior é liberada.
- Busca alternativa da raiz para `assets/` exercitada tanto para foto quanto para trilha.
- URLs relativas ao diretório do `index.html`, verificadas sob um caminho de projeto, sem depender da raiz do domínio.

**Limite da verificação de mídia:** os novos arquivos reais nomeados pelo usuário não estavam disponíveis nesta cópia. Foram usados arquivos de teste interceptados exclusivamente no navegador automatizado; nenhum arquivo de teste foi incluído no ZIP. A reprodução e os nomes/caminhos foram verificados, mas não o conteúdo ou os codecs dos arquivos reais no repositório. Consulte `MIDIAS.md` e mantenha essas mídias ao atualizar o código.

## Regressão dos fluxos existentes

- Dez temas em larguras de 390, 800, 1180 e 1920 pixels; gráficos e navegação dentro dos limites.
- Oitenta trocas de tema preservando dados, rascunhos, filtros e cálculos.
- Efeitos de canvas, pausa por visibilidade, preferência de movimento reduzido e retorno da navegação sem duplicação de efeitos.
- Configurações por teclado, Escape e retorno do foco.
- Cadastro, edição, exclusão, confirmações e validação mútua de campos com API simulada.
- Abertura/fechamento da Aurora e da auditoria.
- Persistência de tema, layout, densidade e efeitos após recarregar.

Ambiente: Chromium automatizado. Não houve erros de JavaScript nem avisos de console nos cenários de arquivos disponíveis. O cenário específico de busca alternativa registrou dois 404 esperados nas tentativas da raiz, seguido de carregamento bem-sucedido em `assets/`.

As chamadas de negócio foram simuladas; nenhum dado real foi escrito durante os testes.
