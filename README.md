# Morais Football 3D — V1.0
Jogo de futebol 3D arcade/simulação leve para navegador, em JavaScript ES Modules e Three.js.

## Estrutura
- `src/main.js`: loop e integração dos sistemas.
- `src/scene.js`: estádio, campo, atletas, câmera e renderer.
- `src/physics.js`: bola, gravidade, atrito, quique, colisões e gols.
- `src/controls.js`: teclado e multitouch via Pointer Events.
- `src/ai.js`: movimentação tática simples e goleiros.
- `src/match.js`: relógio, placar, gol e reinício.

A bola usa gravidade, amortecimento no ar, atrito no gramado e colisão simplificada com jogadores e limites do campo. A câmera acompanha a bola com interpolação exponencial. A IA calcula alvos táticos e aplica aceleração amortecida para manter a execução leve.

## Executar localmente
Os módulos ES precisam de servidor HTTP. Na pasta do projeto:
```bash
python -m http.server 8000
```
Abra http://localhost:8000. Alternativa: `npx serve .`

## GitHub Pages
1. Abra Settings → Pages.
2. Em Build and deployment, escolha Deploy from a branch.
3. Selecione branch `v1-modular-3d` e pasta `/(root)`.
4. Salve e aguarde a publicação.
5. Abra o endereço Pages mostrado pelo GitHub.

Three.js é carregado por CDN; a primeira abertura exige internet.

## Controles
WASD/setas: mover · Shift: sprint · J: passe · L: lançamento · segurar/soltar K: chute carregado · Tab: trocar atleta. No celular, use o analógico e os botões multitouch.

## Roadmap
1. V1.1: mira pelo vetor de movimento, domínio orientado, colisões refinadas e goleiro com mergulho.
2. V1.2: fintas, proteção de bola e animações por estados.
3. V1.3: lateral, escanteio, tiro de meta, faltas e impedimento.
4. V1.4: áudio de torcida, chute, apito e rede.
5. V2.0: seleção de times/formações, replay e IA tática ampliada.
6. Futuro: multiplayer com servidor autoritativo e interpolação de rede.

Modelos e animações são procedurais e simplificados nesta primeira versão.