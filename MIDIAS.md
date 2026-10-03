# Mídias locais dos easter eggs

O mapeamento está centralizado em `js/themes/assets.js`. Os nomes diferenciam maiúsculas e minúsculas, como no GitHub Pages. `LigthTheme.jpg` está escrito intencionalmente como solicitado.

| Tema | Foto | Trilha / vídeo |
| --- | --- | --- |
| Ano Novo | `AnoNovo.jpg` | `AnoNovo.mp3` |
| Cyberpunk | `Cyberpunk.png` | `Cyberpunk.mp3` |
| Escuro | `DarkTheme.png` | `musica.mp3` |
| Original | `foto.jpg` | `musica.mp3` |
| Halloween | `Halloween.png` | `Halloween.mp3` |
| Terror | — | `JumpScare.mp4` (vídeo e áudio; sem foto ou MP3 separado) |
| Claro | `LigthTheme.jpg` | `musica.mp3` |
| Natal | `Natal.png` | `Natal.mp3` |
| Páscoa | `Pascoa.png` | `Pascoa.mp3` |
| São João / Festa Junina | `SaoJoao.png` | `SaoJoao.mp3` |

## Localização dos arquivos

A primeira tentativa usa a mesma pasta do `index.html`. Se o arquivo não estiver nela, o sistema tenta automaticamente:

- Fotos: `assets/`, `assets/images/`, `assets/img/`.
- Trilhas: `assets/`, `assets/audio/`, `assets/music/`.
- Vídeo: `assets/`, `assets/video/`, `assets/videos/`.

O primeiro caminho que carregar é reutilizado durante a sessão. Não são feitas buscas em servidores externos nem downloads antecipados de todas as músicas. As tentativas de caminhos ausentes podem aparecer como 404 no console; se nenhum caminho funcionar, o popup informa qual arquivo precisa ser conferido.

Os caminhos funcionam relativamente à pasta do projeto, sem presumir a raiz do domínio. Mantenha os arquivos reais já presentes no seu repositório ao copiar o código atualizado. Os novos nomes desta tabela não estavam nos arquivos recebidos para esta etapa; por isso, o ZIP não contém essas mídias nem versões de teste delas.
