; Personalização do instalador — PitWall Racing Simulator · Moratelli Game Company
; Incluído pelo electron-builder (nsis.include). Arquivo em UTF-8 com BOM.

!macro customHeader
  BrandingText "Moratelli Game Company  ·  PitWall Racing Simulator ${VERSION}"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao PitWall Racing Simulator"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TEXT "Uma produção Moratelli Game Company.$\r$\n$\r$\nVocê está a um passo do paddock: comande uma equipe da Fórmula 1 com os dados reais de 2026, acompanhe outras 15 categorias, da F4 à Fórmula E, e escreva a sua própria história a partir da temporada 2027.$\r$\n$\r$\nFeche outros programas antes de continuar.$\r$\n$\r$\nClique em Próximo para começar a instalação."
  ; textos da página final (usados quando o MUI_PAGE_FINISH for inserido)
  !define MUI_FINISHPAGE_TITLE "Tudo pronto para a largada"
  !define MUI_FINISHPAGE_TEXT "O PitWall Racing Simulator ${VERSION} foi instalado. Seus jogos salvos ficam guardados e continuam lá nas próximas atualizações.$\r$\n$\r$\nObrigado por jogar!"
  !define MUI_FINISHPAGE_RUN_TEXT "Abrir o PitWall agora"
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Desinstalar o PitWall Racing Simulator"
  !define MUI_WELCOMEPAGE_TEXT "O PitWall Racing Simulator ${VERSION} será removido deste computador.$\r$\n$\r$\nSeus jogos salvos NÃO serão apagados: eles ficam na pasta de dados do Windows e voltam a aparecer se você instalar o jogo de novo.$\r$\n$\r$\nClique em Próximo para continuar."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
