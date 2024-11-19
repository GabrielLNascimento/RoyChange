const express = require('express');
const exphbs = require('express-handlebars');
const fs = require('fs');
const path = require('path');

const app = express();

// Configuração Handlebars
app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Variáveis globais
let cartaSorteada = null;
let tentativas = [];
let cartasUsadas = new Set();
let ultimoSorteio = null;

// Carregar cartas
const cartas = JSON.parse(fs.readFileSync('letters.json', 'utf8'));

// Funções auxiliares
function precisaNovaCarta() {
    const agora = new Date();
    
    // Se não tem carta sorteada ou último sorteio
    if (!cartaSorteada || !ultimoSorteio) {
        return true;
    }

    // Calcula diferença em horas
    const diffHoras = Math.abs(agora - ultimoSorteio) / 36e5; // 36e5 é 1 hora em millisegundos
    return diffHoras >= 1;
}

function sortearCarta() {
    if (precisaNovaCarta()) {
        cartaSorteada = cartas[Math.floor(Math.random() * cartas.length)];
        ultimoSorteio = new Date();
        // Reseta as tentativas e cartas usadas
        tentativas = [];
        cartasUsadas = new Set();
        console.log('Nova carta sorteada:', cartaSorteada.nome);
    }
    return cartaSorteada;
}

function verificarCartaUsada(nome) {
    return cartasUsadas.has(nome);
}

function verificarNome(nome) {
    return cartas.some(carta => carta.nome.toLowerCase() === nome.toLowerCase());
}

function compararTentativa(tentativa, cartaCorreta) {
    const carta = cartas.find(c => c.nome.toLowerCase() === tentativa.toLowerCase());
    if (!carta) return null;

    return {
        ...carta,
        resultados: {
            nome: carta.nome === cartaCorreta.nome,
            elixir: {
                correto: carta.elixir === cartaCorreta.elixir,
                maior: cartaCorreta.elixir > carta.elixir
            },
            raridade: {
                correto: carta.raridade === cartaCorreta.raridade,
                maior: cartaCorreta.raridade > carta.raridade
            },
            evolucao: carta.evolucao === cartaCorreta.evolucao,
            terrestre: carta.terrestre === cartaCorreta.terrestre,
            condicaoVitoria: carta.condicaoVitoria === cartaCorreta.condicaoVitoria
        }
    };
}

// Rotas
app.get('/', (req, res) => {
    const cartaAtual = sortearCarta();
    const acertou = tentativas.some(t => t.resultados.nome === true);
    
    // Calcula tempo restante para próximo sorteio
    let tempoRestante = null;
    if (ultimoSorteio) {
        const proximoSorteio = new Date(ultimoSorteio.getTime() + 60 * 60 * 1000); // +1 hora
        const agora = new Date();
        const diff = proximoSorteio - agora;
        
        // Converte para minutos e segundos
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);
        
        tempoRestante = {
            minutos,
            segundos
        };
    }
    
    res.render('home', {
        cartas: cartas,
        tentativas: tentativas,
        acertou: acertou,
        tempoRestante: tempoRestante
    });
});

app.post('/tentativa', (req, res) => {
    const { nome } = req.body;
    
    if (!verificarNome(nome)) {
        return res.redirect('/?erro=carta-invalida');
    }
    
    if (verificarCartaUsada(nome)) {
        return res.redirect('/?erro=carta-usada');
    }
    
    const resultado = compararTentativa(nome, cartaSorteada);
    cartasUsadas.add(nome);
    tentativas.push(resultado);
    
    res.redirect('/');
});

// Nova rota para buscar cartas
app.get('/buscar-cartas', (req, res) => {
    res.json(cartas);
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
}); 