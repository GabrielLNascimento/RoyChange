const express = require('express');
const exphbs = require('express-handlebars');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();

// Configuração da sessão
app.use(session({
    secret: 'seu_segredo_aqui',
    resave: false,
    saveUninitialized: true
}));

// Configuração Handlebars
app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Função para inicializar dados da sessão
function inicializarSessao(req) {
    if (!req.session.jogo) {
        req.session.jogo = {
            cartaSorteada: null,
            tentativas: [],
            cartasUsadas: [],
            ultimoSorteio: null
        };
    }
}

// Carregar cartas
const cartas = JSON.parse(fs.readFileSync('letters.json', 'utf8'));

// Funções auxiliares
function precisaNovaCarta(sessao) {
    const agora = new Date();
    
    if (!sessao.cartaSorteada || !sessao.ultimoSorteio) {
        return true;
    }

    const diffHoras = Math.abs(agora - new Date(sessao.ultimoSorteio)) / 36e5;
    return diffHoras >= 1;
}

function sortearCarta(req) {
    inicializarSessao(req);
    
    if (precisaNovaCarta(req.session.jogo)) {
        req.session.jogo.cartaSorteada = cartas[Math.floor(Math.random() * cartas.length)];
        req.session.jogo.ultimoSorteio = new Date();
        req.session.jogo.tentativas = [];
        req.session.jogo.cartasUsadas = [];
        console.log('Nova carta sorteada para sessão:', req.session.id);
    }
    return req.session.jogo.cartaSorteada;
}

function verificarCartaUsada(req, nome) {
    return req.session.jogo.cartasUsadas.includes(nome);
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
            tipo: carta.tipo === cartaCorreta.tipo,
            danoArea: carta.danoArea === cartaCorreta.danoArea,
            danoCorpoCorpo: carta.danoCorpoCorpo === cartaCorreta.danoCorpoCorpo,
            condicaoVitoria: carta.condicaoVitoria === cartaCorreta.condicaoVitoria
        }
    };
}

// Rotas
app.get('/', (req, res) => {
    inicializarSessao(req);
    const cartaAtual = sortearCarta(req);
    const acertou = req.session.jogo.tentativas.some(t => t.resultados.nome === true);
    
    let tempoRestante = null;
    if (req.session.jogo.ultimoSorteio) {
        const proximoSorteio = new Date(new Date(req.session.jogo.ultimoSorteio).getTime() + 60 * 60 * 1000);
        const agora = new Date();
        const diff = proximoSorteio - agora;
        
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);
        
        tempoRestante = { minutos, segundos };
    }
    
    res.render('home', {
        cartas: cartas,
        tentativas: req.session.jogo.tentativas,
        acertou: acertou,
        tempoRestante: tempoRestante
    });
});

app.post('/tentativa', (req, res) => {
    inicializarSessao(req);
    const { nome } = req.body;
    
    if (!verificarNome(nome)) {
        return res.redirect('/?erro=carta-invalida');
    }
    
    if (verificarCartaUsada(req, nome)) {
        return res.redirect('/?erro=carta-usada');
    }
    
    const resultado = compararTentativa(nome, req.session.jogo.cartaSorteada);
    req.session.jogo.cartasUsadas.push(nome);
    req.session.jogo.tentativas.push(resultado);
    
    res.redirect('/');
});

// Nova rota para buscar cartas
app.get('/buscar-cartas', (req, res) => {
    res.json(cartas);
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
}); 