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

let nave;
let aliens = [];
let lasers = [];

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

window.setup = function () {
  let canvas = createCanvas(400, 400);
  canvas.parent("game-container");

  nave = {
    x: 200,
    y: 340,
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
  background(10, 10, 30);

  desenharEstrelas();
  desenharTexto();

  if (gameState === "jogando") {
    controlarNave();
    atualizarLasers();
    atualizarAliens();
    verificarColisoes();
  }

  desenharNave();
  desenharLasers();
  desenharAliens();
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
  salvouPontuacao = false;
  lasers = [];

  nave.x = 200;
  nave.y = 340;

  criarAliens();

  telaInicio.classList.add("hidden");
  painelGameOver.classList.add("hidden");
}

function criarAliens() {
  aliens = [
    { x: 40, y: -40, tamanho: 35, velocidade: 4 },
    { x: 200, y: -100, tamanho: 35, velocidade: 5 },
    { x: 340, y: -180, tamanho: 35, velocidade: 3 }
  ];
}

function desenharEstrelas() {
  fill(255);
  noStroke();

  for (let i = 0; i < 30; i++) {
    let x = (i * 53) % width;
    let y = (frameCount * 2 + i * 71) % height;
    circle(x, y, 2);
  }
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
    largura: 6,
    altura: 20,
    velocidade: 7
  });
}

function desenharNave() {
  fill("#ff8c00");
  noStroke();

  triangle(
    nave.x, nave.y - 25,
    nave.x - 25, nave.y + 20,
    nave.x + 25, nave.y + 20
  );

  fill("#38bdf8");
  circle(nave.x, nave.y, 14);
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
  fill("#22c55e");
  noStroke();

  for (let laser of lasers) {
    rect(laser.x - 3, laser.y, laser.largura, laser.altura, 5);
  }
}

function atualizarAliens() {
  for (let alien of aliens) {
    alien.y += alien.velocidade;

    if (alien.y > height + 30) {
      resetarAlien(alien);
    }
  }
}

function desenharAliens() {
  for (let alien of aliens) {
    fill("#6b21a8");
    noStroke();
    ellipse(alien.x, alien.y, alien.tamanho, alien.tamanho);

    fill("#facc15");
    circle(alien.x - 7, alien.y - 4, 6);
    circle(alien.x + 7, alien.y - 4, 6);
  }
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
        resetarAlien(alien);
        score += 2;
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
  alien.y = random(-200, -40);
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
  salvouPontuacao = false;
  lasers = [];

  nave.x = 200;
  nave.y = 340;

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
  salvouPontuacao = false;
  lasers = [];
  nomeAtual = "";

  nave.x = 200;
  nave.y = 340;

  criarAliens();

  nomeInicial.value = "";

  painelGameOver.classList.add("hidden");
  telaInicio.classList.remove("hidden");
}