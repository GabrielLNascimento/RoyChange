document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const submitButton = document.querySelector('button[type="submit"]');

    // Verifica se já acertou (procura por uma div com nome correto)
    function verificaAcerto() {
        const tentativas = document.querySelectorAll('.tentativa-card');
        for (let tentativa of tentativas) {
            const nomeElement = tentativa.querySelector('.nome');
            if (nomeElement && nomeElement.classList.contains('correct')) {
                return true;
            }
        }
        return false;
    }

    // Desabilita input e botão se já acertou
    if (verificaAcerto()) {
        searchInput.disabled = true;
        submitButton.disabled = true;
        searchInput.placeholder = "Parabéns! Você acertou!";
    }

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm.length < 1) {
            searchResults.innerHTML = '';
            return;
        }

        fetch('/buscar-cartas')
            .then(response => response.json())
            .then(cartas => {
                const filteredCards = cartas.filter(carta => 
                    carta.nome.toLowerCase().includes(searchTerm)
                );

                searchResults.innerHTML = '';
                
                if (filteredCards.length > 0) {
                    filteredCards.forEach(carta => {
                        const div = document.createElement('div');
                        div.textContent = carta.nome;
                        
                        // Destaca o texto que corresponde à busca
                        const regex = new RegExp(`(${searchTerm})`, 'gi');
                        div.innerHTML = carta.nome.replace(regex, '<strong>$1</strong>');
                        
                        div.addEventListener('click', () => {
                            searchInput.value = carta.nome;
                            searchResults.innerHTML = '';
                        });
                        searchResults.appendChild(div);
                    });
                } else {
                    const div = document.createElement('div');
                    div.textContent = 'Nenhum personagem encontrado';
                    div.style.color = '#666';
                    div.style.fontStyle = 'italic';
                    searchResults.appendChild(div);
                }
            })
            .catch(error => console.error('Erro ao buscar cartas:', error));
    });

    // Fecha a lista de resultados quando clicar fora
    document.addEventListener('click', function(e) {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.innerHTML = '';
        }
    });

    // Adicione isso ao final do arquivo
    function atualizarTimer() {
        const timerElement = document.getElementById('timer');
        if (!timerElement) return;

        setInterval(() => {
            let [minutos, segundos] = timerElement.textContent.split(':').map(Number);
            
            if (segundos > 0) {
                segundos--;
            } else if (minutos > 0) {
                minutos--;
                segundos = 59;
            } else {
                // Tempo acabou, recarrega a página
                window.location.reload();
                return;
            }
            
            // Formata com zero à esquerda
            const minutosStr = minutos.toString().padStart(2, '0');
            const segundosStr = segundos.toString().padStart(2, '0');
            
            timerElement.textContent = `${minutosStr}:${segundosStr}`;
        }, 1000);
    }

    // Inicia o timer quando a página carrega
    atualizarTimer();
}); 