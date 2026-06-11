import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  onValue,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";

// COLE AQUI A CONFIGURAÇÃO DO SEU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA505W87dS_GwRFtGvna3PbXV56N992d6s",
  authDomain: "placar-codeminds-helena.firebaseapp.com",
  projectId: "placar-codeminds-helena",
  storageBucket: "placar-codeminds-helena.firebasestorage.app",
  messagingSenderId: "722504066783",
  appId: "1:722504066783:web:d0c0568ec35b3934c9eb6a"
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let gameState = "inicio";
let score = 0;
let nomeAtual = "";
let salvouPontuacao = false;
let bonusVelocidadeAliens = 0;
let ultimoNivelPontuacao = 0;

let nave;
let aliens = [];
let lasers = [];
let explosoes = [];

let imgNave;
let imgAliens = [];
let imgTiros = [];
let imgExplosoes = [];
let imgSpace = [];

const TAMANHO_JOGO = 500;
const BG_FRAME_INTERVAL = 3;
const TIRO_LARGURA = 4;
const TIRO_ALTURA = 25;
const TIRO_ESCALA = 1.65;
const NAVE_TAMANHO = 50;
const NAVE_ESCALA = 1.5;
const PONTOS_POR_NIVEL = 10;
const ALIEN_VELOCIDADE_BONUS = 0.05;
const ALIEN_VELOCIDADE_BASE = 3;

let telaInicio;
let nomeInicial;
let btnNovoJogador;
let btnComecar;
let painelGameOver;
let mensagemResultado;
let btnReiniciar;
let listaRanking;
let statusControle;

let usandoGamepad = false;
let gamepadIndex = null;
let podeAtirarJoystick = true;

window.addEventListener("gamepadconnected", function (event) {
  usandoGamepad = true;
  gamepadIndex = event.gamepad.index;

  if (statusControle) {
    statusControle.textContent = "Joystick conectado: " + event.gamepad.id;
  }
});

window.addEventListener("gamepaddisconnected", function () {
  usandoGamepad = false;
  gamepadIndex = null;

  if (statusControle) {
    statusControle.textContent = "Joystick desconectado. Use setas + espaço.";
  }
});

window.preload = function () {
  imgNave = loadImage("assets/nave.png");

  for (let i = 1; i <= 3; i++) {
    imgAliens.push(loadImage("assets/alien" + i + ".png"));
  }

  for (let i = 1; i <= 4; i++) {
    imgTiros.push(loadImage("assets/tiro" + i + ".png"));
  }

  for (let i = 0; i <= 5; i++) {
    imgExplosoes.push(loadImage("assets/explosao" + i + ".png"));
  }

  for (let i = 1; i <= 5; i++) {
    imgSpace.push(loadImage("assets/space" + i + ".png"));
  }
};

window.setup = function () {
  let canvas = createCanvas(TAMANHO_JOGO, TAMANHO_JOGO);
  canvas.parent("game-container");

  nave = {
    x: width / 2,
    y: height * 0.85,
    velocidade: 6
  };

  criarAliens();

  telaInicio = document.getElementById("telaInicio");
  nomeInicial = document.getElementById("nomeInicial");
  btnComecar = document.getElementById("btnComecar");
  painelGameOver = document.getElementById("modalGameOver");
  mensagemResultado = document.getElementById("mensagemResultado");
  btnReiniciar = document.getElementById("btnReiniciar");
  btnNovoJogador = document.getElementById("btnNovoJogador");
  listaRanking = document.getElementById("listaRanking");
  statusControle = document.getElementById("statusControle");

  btnComecar.addEventListener("click", iniciarJogo);
  btnReiniciar.addEventListener("click", reiniciarJogo);
  btnNovoJogador.addEventListener("click", novoJogador);


  nomeInicial.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      iniciarJogo();
    }
  });

  carregarRanking();
};

window.draw = function () {
  desenharFundo();
  desenharTexto();

  if (gameState === "jogando") {
    controlarNave();
    atualizarLasers();
    atualizarAliens();
    atualizarExplosoes();
    verificarColisoes();
  }

  desenharNave();
  desenharLasers();
  desenharAliens();
  desenharExplosoes();
};

function iniciarJogo() {
  let nome = nomeInicial.value.trim();

  if (nome === "") {
    alert("Digite seu nome para jogar.");
    return;
  }

  nomeAtual = nome;
  gameState = "jogando";
  score = 0;
  resetarDificuldade();
  salvouPontuacao = false;
  lasers = [];
  explosoes = [];

  nave.x = width / 2;
  nave.y = height * 0.85;

  criarAliens();

  telaInicio.classList.add("hidden");
  painelGameOver.classList.add("hidden");
}

function criarAliens() {
  aliens = [
    { x: width * 0.1, y: -height * 0.2, tamanho: 35, velocidadeBase: ALIEN_VELOCIDADE_BASE, tipo: 0 },
    { x: width * 0.5, y: -height * 0.45, tamanho: 35, velocidadeBase: ALIEN_VELOCIDADE_BASE, tipo: 1 },
    { x: width * 0.85, y: -height * 0.7, tamanho: 35, velocidadeBase: ALIEN_VELOCIDADE_BASE, tipo: 2 }
  ];
}

function resetarDificuldade() {
  bonusVelocidadeAliens = 0;
  ultimoNivelPontuacao = 0;
}

function atualizarDificuldade() {
  let nivelAtual = floor(score / PONTOS_POR_NIVEL);

  if (nivelAtual > ultimoNivelPontuacao) {
    bonusVelocidadeAliens += (nivelAtual - ultimoNivelPontuacao) * ALIEN_VELOCIDADE_BONUS;
    ultimoNivelPontuacao = nivelAtual;
  }
}

function velocidadeAlienAtual(velocidadeBase) {
  return velocidadeBase + bonusVelocidadeAliens;
}

function desenharFundo() {
  if (imgSpace.length === 0) {
    return;
  }

  let frameIndex = floor(frameCount / BG_FRAME_INTERVAL) % imgSpace.length;
  image(imgSpace[frameIndex], 0, 0, width, height);
}

function desenharTexto() {
  fill(255);
  textSize(20);
  textAlign(LEFT);

  if (gameState === "inicio") {
    text("Digite seu nome e clique em jogar", 35, 30);
  } else {
    text("SCORE: " + score, 20, 30);
    text("Jogador: " + nomeAtual, 20, 55);
  }
}

function controlarNave() {
  if (keyIsDown(LEFT_ARROW)) {
    nave.x -= nave.velocidade;
  }

  if (keyIsDown(RIGHT_ARROW)) {
    nave.x += nave.velocidade;
  }

  controlarJoystick();

  nave.x = constrain(nave.x, 25, width - 25);
}

function controlarJoystick() {
  if (!usandoGamepad || gamepadIndex === null) {
    return;
  }

  let gamepads = navigator.getGamepads();
  let controle = gamepads[gamepadIndex];

  if (!controle) {
    return;
  }

  let eixoHorizontal = controle.axes[0];

  if (eixoHorizontal < -0.3) {
    nave.x -= nave.velocidade;
  }

  if (eixoHorizontal > 0.3) {
    nave.x += nave.velocidade;
  }

  let dpadEsquerda = controle.buttons[14] && controle.buttons[14].pressed;
  let dpadDireita = controle.buttons[15] && controle.buttons[15].pressed;

  if (dpadEsquerda) {
    nave.x -= nave.velocidade;
  }

  if (dpadDireita) {
    nave.x += nave.velocidade;
  }

  let botaoA = controle.buttons[0] && controle.buttons[0].pressed;

  if (botaoA && podeAtirarJoystick && gameState === "jogando") {
    atirarLaser();
    podeAtirarJoystick = false;
  }

  if (!botaoA) {
    podeAtirarJoystick = true;
  }
}

window.keyPressed = function () {
  if (keyCode === 32 && gameState === "jogando") {
    atirarLaser();
  }
};

function atirarLaser() {
  if (gameState !== "jogando") {
    return;
  }

  lasers.push({
    x: nave.x,
    y: nave.y - 25,
    velocidade: 7,
    frameOffset: frameCount
  });
}

function desenharNave() {
  imageMode(CENTER);
  image(imgNave, nave.x, nave.y, NAVE_TAMANHO * NAVE_ESCALA, NAVE_TAMANHO * NAVE_ESCALA);
  imageMode(CORNER);
}

function atualizarLasers() {
  for (let i = lasers.length - 1; i >= 0; i--) {
    lasers[i].y -= lasers[i].velocidade;

    if (lasers[i].y < -20) {
      lasers.splice(i, 1);
    }
  }
}

function desenharLasers() {
  imageMode(CENTER);

  for (let laser of lasers) {
    let frameIndex = floor((frameCount + laser.frameOffset) / 3) % imgTiros.length;
    let img = imgTiros[frameIndex];
    image(img, laser.x, laser.y, TIRO_LARGURA * TIRO_ESCALA, TIRO_ALTURA * TIRO_ESCALA);
  }

  imageMode(CORNER);
}

function atualizarAliens() {
  for (let alien of aliens) {
    alien.y += velocidadeAlienAtual(alien.velocidadeBase);

    if (alien.y > height + 30) {
      resetarAlien(alien);
    }
  }
}

function desenharAliens() {
  imageMode(CENTER);

  for (let alien of aliens) {
    image(imgAliens[alien.tipo], alien.x, alien.y, alien.tamanho, alien.tamanho);
  }

  imageMode(CORNER);
}

function atualizarExplosoes() {
  for (let i = explosoes.length - 1; i >= 0; i--) {
    explosoes[i].frame++;

    if (explosoes[i].frame >= imgExplosoes.length) {
      explosoes.splice(i, 1);
    }
  }
}

function desenharExplosoes() {
  imageMode(CENTER);

  for (let explosao of explosoes) {
    let img = imgExplosoes[explosao.frame];
    image(img, explosao.x, explosao.y, 50, 50);
  }

  imageMode(CORNER);
}

function verificarColisoes() {
  for (let alien of aliens) {
    if (colidiu(nave.x, nave.y, 35, alien.x, alien.y, alien.tamanho)) {
      finalizarJogo();
      return;
    }

    for (let i = lasers.length - 1; i >= 0; i--) {
      if (colidiu(lasers[i].x, lasers[i].y, 20, alien.x, alien.y, alien.tamanho)) {
        lasers.splice(i, 1);
        explosoes.push({ x: alien.x, y: alien.y, frame: 0 });
        resetarAlien(alien);
        score += 2;
        atualizarDificuldade();
        break;
      }
    }
  }
}

function colidiu(x1, y1, tamanho1, x2, y2, tamanho2) {
  let distancia = dist(x1, y1, x2, y2);
  return distancia < (tamanho1 + tamanho2) / 2;
}

function resetarAlien(alien) {
  alien.x = random(30, width - 30);
  alien.y = random(-height * 0.8, -height * 0.15);
  alien.tipo = floor(random(imgAliens.length));
}

function finalizarJogo() {
  gameState = "gameOver";

  if (!salvouPontuacao) {
    push(ref(database, "placar"), {
      nome: nomeAtual,
      pontos: score,
      data: new Date().toISOString()
    });

    salvouPontuacao = true;
  }

  mensagemResultado.textContent = nomeAtual + ", sua pontuação foi: " + score + " pontos.";

  painelGameOver.classList.remove("hidden");
}

function reiniciarJogo() {
  gameState = "jogando";
  score = 0;
  resetarDificuldade();
  salvouPontuacao = false;
  lasers = [];
  explosoes = [];

  nave.x = width / 2;
  nave.y = height * 0.85;

  criarAliens();

  painelGameOver.classList.add("hidden");
}

function carregarRanking() {
  const rankingRef = query(
    ref(database, "placar"),
    orderByChild("pontos"),
    limitToLast(10)
  );

  onValue(rankingRef, function (snapshot) {
    let dados = [];

    snapshot.forEach(function (childSnapshot) {
      dados.push(childSnapshot.val());
    });

    dados.reverse();

    listaRanking.innerHTML = "";

    for (let item of dados) {
      let li = document.createElement("li");
      li.textContent = item.nome + " — " + item.pontos + " pontos";
      listaRanking.appendChild(li);
    }
  });
}
function novoJogador() {
  gameState = "inicio";
  score = 0;
  resetarDificuldade();
  salvouPontuacao = false;
  lasers = [];
  explosoes = [];
  nomeAtual = "";

  nave.x = width / 2;
  nave.y = height * 0.85;

  criarAliens();

  nomeInicial.value = "";

  painelGameOver.classList.add("hidden");
  telaInicio.classList.remove("hidden");
}