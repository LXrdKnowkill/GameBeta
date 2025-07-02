/**
 * GameUI - Gerencia toda a interface do usuário do jogo
 * Inclui barra de casting, HUD de informações e feedback visual
 */

/**
 * Classe responsável por gerenciar todos os elementos de UI do jogo
 * Mantém referências aos elementos HTML e fornece métodos para atualizá-los
 */
export class GameUI {
    // Elementos da barra de casting
    private castingBar!: HTMLElement;
    private castingProgress!: HTMLElement;
    private castingText!: HTMLElement;
    
    // Elementos de status do jogador
    private manaDisplay!: HTMLElement;
    private spellCount!: HTMLElement;
    
    // Estado da UI
    private isCastingBarVisible: boolean = false;

    constructor() {
        this.initializeElements();
        console.log('🖥️ Sistema de UI inicializado!');
    }

    /**
     * Inicializa e obtém referências para todos os elementos HTML
     */
    private initializeElements(): void {
        // Elementos da barra de casting
        this.castingBar = this.getElement('castingBar');
        this.castingProgress = this.getElement('castingProgress');
        this.castingText = this.getElement('castingText');
        
        // Elementos de status
        this.manaDisplay = this.getElement('manaDisplay');
        this.spellCount = this.getElement('spellCount');
        
        // Verificar se todos os elementos foram encontrados
        this.validateElements();
        
        console.log('✅ Elementos de UI carregados com sucesso!');
    }

    /**
     * Obtém um elemento HTML pelo ID com verificação de erro
     */
    private getElement(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Elemento HTML com id="${id}" não encontrado!`);
        }
        return element;
    }

    /**
     * Valida se todos os elementos essenciais estão presentes
     */
    private validateElements(): void {
        const requiredElements = [
            { element: this.castingBar, name: 'castingBar' },
            { element: this.castingProgress, name: 'castingProgress' },
            { element: this.castingText, name: 'castingText' },
            { element: this.manaDisplay, name: 'manaDisplay' },
            { element: this.spellCount, name: 'spellCount' }
        ];

        for (const { element, name } of requiredElements) {
            if (!element) {
                console.error(`❌ Elemento ${name} não encontrado na UI!`);
            }
        }
    }

    // === MÉTODOS DA BARRA DE CASTING ===

    /**
     * Mostra a barra de casting
     */
    public showCastingBar(): void {
        if (this.isCastingBarVisible) return;
        
        console.log('📊 Mostrando barra de casting...');
        
        this.castingBar.style.display = 'block';
        this.castingProgress.style.width = '0%';
        this.castingText.textContent = 'Conjurando...';
        this.isCastingBarVisible = true;
        
        // Animação de entrada suave
        this.castingBar.style.opacity = '0';
        setTimeout(() => {
            this.castingBar.style.transition = 'opacity 0.2s ease';
            this.castingBar.style.opacity = '1';
        }, 10);
    }

    /**
     * Esconde a barra de casting
     */
    public hideCastingBar(): void {
        if (!this.isCastingBarVisible) return;
        
        console.log('📊 Escondendo barra de casting...');
        
        // Animação de saída suave
        this.castingBar.style.transition = 'opacity 0.2s ease';
        this.castingBar.style.opacity = '0';
        
        setTimeout(() => {
            this.castingBar.style.display = 'none';
            this.isCastingBarVisible = false;
        }, 200);
    }

    /**
     * Atualiza o progresso da barra de casting
     * @param progress Valor entre 0.0 e 1.0 representando o progresso
     */
    public updateCastingProgress(progress: number): void {
        if (!this.isCastingBarVisible) return;
        
        // Garantir que o progresso está entre 0 e 1
        progress = Math.max(0, Math.min(1, progress));
        
        // Atualizar largura da barra
        const percentage = Math.floor(progress * 100);
        this.castingProgress.style.width = `${percentage}%`;
        
        // Atualizar texto baseado no progresso
        if (progress < 0.2) {
            this.castingText.textContent = 'Conjurando...';
        } else if (progress < 0.8) {
            this.castingText.textContent = 'Focando...';
        } else if (progress < 1.0) {
            this.castingText.textContent = 'Quase pronto...';
        } else {
            this.castingText.textContent = 'Pronto!';
        }
        
        // Mudar cor da barra baseado no progresso
        if (progress < 0.5) {
            // Começar com azul claro
            this.castingProgress.style.background = 'linear-gradient(90deg, #4a90e2, #7bb3f0)';
        } else if (progress < 0.8) {
            // Meio termo - azul mais intenso
            this.castingProgress.style.background = 'linear-gradient(90deg, #2e7bc6, #4a90e2)';
        } else {
            // Quase completo - azul brilhante com toque dourado
            this.castingProgress.style.background = 'linear-gradient(90deg, #1e5f96, #ffd700)';
        }
    }

    // === MÉTODOS DE STATUS ===

    /**
     * Atualiza a exibição de mana
     * @param current Mana atual
     * @param max Mana máxima
     */
    public updateMana(current: number, max: number): void {
        if (!this.manaDisplay) return;
        
        const currentInt = Math.floor(current);
        this.manaDisplay.textContent = `${currentInt}/${max}`;
        
        // Mudar cor baseado na porcentagem de mana
        const percentage = current / max;
        if (percentage > 0.6) {
            this.manaDisplay.style.color = '#4a90e2'; // Azul normal
        } else if (percentage > 0.3) {
            this.manaDisplay.style.color = '#f0ad4e'; // Laranja (atenção)
        } else {
            this.manaDisplay.style.color = '#d9534f'; // Vermelho (crítico)
        }
    }

    /**
     * Atualiza o contador de magias lançadas
     * @param count Número de magias lançadas
     */
    public updateSpellCount(count: number): void {
        if (!this.spellCount) return;
        
        this.spellCount.textContent = count.toString();
        
        // Pequena animação quando o número aumenta
        this.spellCount.style.transform = 'scale(1.2)';
        this.spellCount.style.transition = 'transform 0.2s ease';
        
        setTimeout(() => {
            this.spellCount.style.transform = 'scale(1)';
        }, 200);
    }

    // === SISTEMA DE NOTIFICAÇÕES ===

    /**
     * Mostra uma notificação temporária na tela
     * @param message Mensagem a ser exibida
     * @param type Tipo da notificação ('info', 'success', 'warning', 'error')
     * @param duration Duração em milissegundos (padrão: 3000)
     */
    public showNotification(
        message: string, 
        type: 'info' | 'success' | 'warning' | 'error' = 'info', 
        duration: number = 3000
    ): void {
        console.log(`📢 Notificação: ${message}`);
        
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Estilos da notificação
        notification.style.position = 'fixed';
        notification.style.top = '100px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.color = 'white';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '9999';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        
        // Cores baseadas no tipo
        switch (type) {
            case 'success':
                notification.style.backgroundColor = 'rgba(92, 184, 92, 0.9)';
                break;
            case 'warning':
                notification.style.backgroundColor = 'rgba(240, 173, 78, 0.9)';
                break;
            case 'error':
                notification.style.backgroundColor = 'rgba(217, 83, 79, 0.9)';
                break;
            default: // info
                notification.style.backgroundColor = 'rgba(74, 144, 226, 0.9)';
        }
        
        // Adicionar ao DOM
        document.body.appendChild(notification);
        
        // Animação de entrada
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remover após duração especificada
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // === MÉTODOS UTILITÁRIOS ===

    /**
     * Atualização geral da UI (chamada no loop principal)
     * @param deltaTime Tempo desde o último frame
     */
    public update(_deltaTime: number): void {
        // Por enquanto não há atualizações contínuas necessárias
        // Este método existe para futuras funcionalidades que precisem
        // de atualização constante (animações, etc.)
    }

    /**
     * Aplica um efeito de "shake" na tela
     * Útil para feedback visual quando algo importante acontece
     * @param intensity Intensidade do shake (1-10)
     * @param duration Duração em milissegundos
     */
    public screenShake(intensity: number = 5, duration: number = 300): void {
        const gameUI = document.getElementById('gameUI');
        if (!gameUI) return;
        
        console.log(`📳 Screen shake: intensidade ${intensity}, duração ${duration}ms`);
        
        const originalTransform = gameUI.style.transform;
        const startTime = performance.now();
        
        const shake = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // Shake completo - voltar ao normal
                gameUI.style.transform = originalTransform;
                return;
            }
            
            // Calcular offset aleatório baseado na intensidade
            const currentIntensity = intensity * (1 - progress); // Diminui com o tempo
            const offsetX = (Math.random() - 0.5) * currentIntensity;
            const offsetY = (Math.random() - 0.5) * currentIntensity;
            
            gameUI.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            
            // Continuar shake
            requestAnimationFrame(shake);
        };
        
        shake();
    }

    /**
     * Reinicia todos os elementos da UI para o estado inicial
     */
    public reset(): void {
        console.log('🔄 Reiniciando UI...');
        
        // Esconder barra de casting se estiver visível
        if (this.isCastingBarVisible) {
            this.hideCastingBar();
        }
        
        // Resetar contadores
        this.updateSpellCount(0);
        
        console.log('✅ UI reiniciada!');
    }

    /**
     * Limpa recursos da UI quando o jogo é fechado
     */
    public dispose(): void {
        console.log('🧹 Limpando recursos da UI...');
        
        // Esconder barra de casting se estiver visível
        if (this.isCastingBarVisible) {
            this.hideCastingBar();
        }
        
        // Remover quaisquer notificações ativas
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        console.log('✅ UI limpa!');
    }
}