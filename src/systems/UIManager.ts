/**
 * UIManager - Gerencia apenas interface do usuário
 * Princípio da Responsabilidade Única: APENAS UI, não sabe sobre lógica de jogo
 */

import { MovementState } from './PlayerMovement';
// import { PlayerStatsData } from './PlayerStats'; // Used in commented examples
import { GameUI } from '../GameUI';

/**
 * Configurações de UI
 */
export interface UIConfig {
    showDebugInfo: boolean;
    showFPS: boolean;
    animationDuration: number;
    notificationDuration: number;
    autoHideControls: boolean;
    autoHideDelay: number;
}

/**
 * Dados de UI que podem ser atualizados
 */
export interface UIData {
    mana: { current: number; max: number; percentage: number };
    health: { current: number; max: number; percentage: number };
    stamina: { current: number; max: number; percentage: number };
    level: number;
    spellsCast: number;
    movementState: MovementState;
    fps: number;
}

/**
 * UIManager - Responsabilidade única: gerenciar interface
 * NÃO conhece lógica de jogo, apenas responde a eventos
 * NÃO processa input de gameplay, apenas de UI
 */
export class UIManager {
    // Elementos HTML (! indica que serão inicializados em initialize)
    private elements: { [key: string]: HTMLElement } = {};
    
    // Estado da UI
    private isInitialized: boolean = false;
    
    // Configurações
    private config: Partial<UIConfig> = {
        showDebugInfo: false,
        showFPS: false,
        animationDuration: 300,
        notificationDuration: 3000,
        autoHideControls: false,
        autoHideDelay: 5000
    };
    
    // Casting bar state
    private isCastingBarVisible: boolean = false;
    
    // Auto-hide timer
    private autoHideTimer: number | null = null;

    constructor() {
        this.initialize();
        console.log('🖥️ UIManager criado (responsabilidade única)');
    }

    /**
     * Inicializa o sistema de UI
     */
    private initialize(): void {
        this.findUIElements();
        this.setupEventListeners();
        this.createDebugElements();
        this.setupAutoHide();
        
        this.isInitialized = true;
        console.log('✅ UIManager inicializado');
    }

    /**
     * Encontra e armazena referências aos elementos HTML
     */
    private findUIElements(): void {
        const elementIds = [
            'castingBar',
            'castingProgress',
            'castingText',
            'manaDisplay',
            'spellCount',
            'controls',
            'status'
        ];
        
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[id] = element;
            } else {
                console.warn(`⚠️ Elemento UI '${id}' não encontrado`);
            }
        });
    }

    /**
     * Configura event listeners específicos de UI
     */
    private setupEventListeners(): void {
        // Toggle debug info com F1
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F1') {
                event.preventDefault();
                this.toggleDebugInfo();
            }
        });
        
        // Reset auto-hide timer em qualquer movimento do mouse
        document.addEventListener('mousemove', () => {
            this.resetAutoHideTimer();
        });
    }

    /**
     * Cria elementos de debug se necessário
     */
    private createDebugElements(): void {
        if (!this.config.showDebugInfo && !this.config.showFPS) return;
        
        // Criar container de debug
        const debugContainer = document.createElement('div');
        debugContainer.id = 'debugContainer';
        debugContainer.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            display: none;
        `;
        
        document.body.appendChild(debugContainer);
        this.elements.debugContainer = debugContainer;
        
        if (this.config.showDebugInfo) {
            this.showDebugInfo();
        }
    }

    /**
     * Configura sistema de auto-hide
     */
    private setupAutoHide(): void {
        if (!this.config.autoHideControls) return;
        
        this.resetAutoHideTimer();
    }

    /**
     * Reseta timer de auto-hide
     */
    private resetAutoHideTimer(): void {
        if (!this.config.autoHideControls) return;
        
        // Mostrar controles
        if (this.elements.controls) {
            this.elements.controls.style.opacity = '1';
        }
        
        // Limpar timer anterior
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
        }
        
        // Configurar novo timer
        this.autoHideTimer = window.setTimeout(() => {
            if (this.elements.controls) {
                this.elements.controls.style.transition = 'opacity 0.5s ease';
                this.elements.controls.style.opacity = '0.3';
            }
        }, this.config.autoHideDelay);
    }

    // === MÉTODOS DE ATUALIZAÇÃO (chamados por outros sistemas) ===

    /**
     * Atualiza dados gerais de UI
     */
    public updateUI(uiData: Partial<UIData>): void {
        if (!this.isInitialized) return;
        
        if (uiData.mana) {
            this.updateManaDisplay(uiData.mana.current, uiData.mana.max);
        }
        
        if (uiData.spellsCast !== undefined) {
            this.updateSpellCount(uiData.spellsCast);
        }
        
        if (uiData.movementState) {
            this.updateMovementState(uiData.movementState);
        }
        
        if (uiData.fps !== undefined) {
            this.updateFPS(uiData.fps);
        }
    }

    /**
     * Atualiza display de mana
     */
    public updateManaDisplay(current: number, max: number): void {
        if (!this.elements.manaDisplay) return;
        
        const currentInt = Math.floor(current);
        this.elements.manaDisplay.textContent = `${currentInt}/${max}`;
        
        // Cor baseada na porcentagem
        const percentage = current / max;
        let color = '#4a90e2'; // Azul normal
        
        if (percentage < 0.25) {
            color = '#d9534f'; // Vermelho (crítico)
        } else if (percentage < 0.5) {
            color = '#f0ad4e'; // Laranja (baixo)
        } else if (percentage < 0.75) {
            color = '#5bc0de'; // Azul claro (médio)
        }
        
        this.elements.manaDisplay.style.color = color;
        
        // Animação sutil quando muda
        this.animateElement(this.elements.manaDisplay, 'pulse');
    }

    /**
     * Atualiza contador de magias
     */
    public updateSpellCount(count: number): void {
        if (!this.elements.spellCount) return;
        
        this.elements.spellCount.textContent = count.toString();
        
        // Animação quando aumenta
        this.animateElement(this.elements.spellCount, 'bounce');
    }

    /**
     * Atualiza estado de movimento (debug)
     */
    public updateMovementState(state: MovementState): void {
        if (!this.config.showDebugInfo || !this.elements.debugContainer) return;
        
        const stateElement = this.elements.debugContainer.querySelector('#movementState') as HTMLElement;
        if (stateElement) {
            let emoji = '';
            let text = '';
            
            switch (state) {
                case MovementState.IDLE:
                    emoji = '🧍';
                    text = 'Parado';
                    break;
                case MovementState.WALKING:
                    emoji = '🚶';
                    text = 'Caminhando';
                    break;
                case MovementState.RUNNING:
                    emoji = '🏃';
                    text = 'Correndo';
                    break;
                case MovementState.JUMPING:
                    emoji = '🦘';
                    text = 'Pulando';
                    break;
                case MovementState.FALLING:
                    emoji = '🪂';
                    text = 'Caindo';
                    break;
            }
            
            stateElement.textContent = `${emoji} ${text}`;
        }
    }

    /**
     * Atualiza FPS
     */
    public updateFPS(fps: number): void {
        if (!this.config.showFPS || !this.elements.debugContainer) return;
        
        const fpsElement = this.elements.debugContainer.querySelector('#fpsDisplay') as HTMLElement;
        if (fpsElement) {
            let color = '#00ff00'; // Verde
            if (fps < 30) color = '#ff0000'; // Vermelho
            else if (fps < 45) color = '#ffff00'; // Amarelo
            
            fpsElement.innerHTML = `FPS: <span style="color: ${color}">${Math.round(fps)}</span>`;
        }
    }

    // === CASTING BAR ===

    /**
     * Mostra barra de casting
     */
    public showCastingBar(spellName: string = 'Conjurando...'): void {
        if (!this.elements.castingBar || this.isCastingBarVisible) return;
        
        console.log('📊 Mostrando barra de casting...');
        
        this.elements.castingBar.style.display = 'block';
        this.elements.castingProgress.style.width = '0%';
        if (this.elements.castingText) {
            this.elements.castingText.textContent = spellName;
        }
        
        this.isCastingBarVisible = true;
        
        // Animação de entrada
        this.animateElement(this.elements.castingBar, 'fadeIn');
    }

    /**
     * Atualiza progresso da barra de casting
     */
    public updateCastingProgress(progress: number): void {
        if (!this.isCastingBarVisible || !this.elements.castingProgress) return;
        
        progress = Math.max(0, Math.min(1, progress));
        const percentage = Math.floor(progress * 100);
        
        this.elements.castingProgress.style.width = `${percentage}%`;
        
        // Mudar cor baseado no progresso
        let gradient = 'linear-gradient(90deg, #4a90e2, #7bb3f0)';
        if (progress > 0.8) {
            gradient = 'linear-gradient(90deg, #1e5f96, #ffd700)';
        } else if (progress > 0.5) {
            gradient = 'linear-gradient(90deg, #2e7bc6, #4a90e2)';
        }
        
        this.elements.castingProgress.style.background = gradient;
        
        // Atualizar texto
        if (this.elements.castingText) {
            if (progress < 0.2) {
                this.elements.castingText.textContent = 'Conjurando...';
            } else if (progress < 0.8) {
                this.elements.castingText.textContent = 'Focando...';
            } else if (progress < 1.0) {
                this.elements.castingText.textContent = 'Quase pronto...';
            } else {
                this.elements.castingText.textContent = 'Pronto!';
            }
        }
    }

    /**
     * Esconde barra de casting
     */
    public hideCastingBar(): void {
        if (!this.isCastingBarVisible || !this.elements.castingBar) return;
        
        console.log('📊 Escondendo barra de casting...');
        
        // Animação de saída
        this.animateElement(this.elements.castingBar, 'fadeOut', () => {
            this.elements.castingBar.style.display = 'none';
            this.isCastingBarVisible = false;
        });
    }

    // === NOTIFICAÇÕES ===

    /**
     * Mostra notificação
     */
    public showNotification(
        message: string, 
        type: 'info' | 'success' | 'warning' | 'error' = 'info',
        duration?: number
    ): void {
        console.log(`📢 Notificação: ${message}`);
        
        const notification = this.createNotificationElement(message, type);
        document.body.appendChild(notification);
        
        // Animação de entrada
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translate(-50%, 0)';
        }, 10);
        
        // Remover após duração
        const notificationDuration = duration || this.config.notificationDuration;
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -20px)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, this.config.animationDuration);
        }, notificationDuration);
    }

    /**
     * Cria elemento de notificação
     */
    private createNotificationElement(message: string, type: string): HTMLElement {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translate(-50%, -20px);
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            font-size: 14px;
            z-index: 9999;
            opacity: 0;
            transition: all ${this.config.animationDuration}ms ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        // Cores baseadas no tipo
        const colors = {
            success: 'rgba(92, 184, 92, 0.95)',
            warning: 'rgba(240, 173, 78, 0.95)',
            error: 'rgba(217, 83, 79, 0.95)',
            info: 'rgba(74, 144, 226, 0.95)'
        };
        
        notification.style.backgroundColor = colors[type as keyof typeof colors] || colors.info;
        
        return notification;
    }

    // === EFEITOS VISUAIS ===

    /**
     * Aplica screen shake
     */
    public screenShake(intensity: number = 5, duration: number = 300): void {
        const gameUI = document.getElementById('gameUI');
        if (!gameUI) return;
        
        console.log(`📳 Screen shake: intensidade ${intensity}`);
        
        const originalTransform = gameUI.style.transform;
        const startTime = performance.now();
        
        const shake = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                gameUI.style.transform = originalTransform;
                return;
            }
            
            const currentIntensity = intensity * (1 - progress);
            const offsetX = (Math.random() - 0.5) * currentIntensity;
            const offsetY = (Math.random() - 0.5) * currentIntensity;
            
            gameUI.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            requestAnimationFrame(shake);
        };
        
        shake();
    }

    /**
     * Anima um elemento com efeito específico
     */
    private animateElement(element: HTMLElement, effect: string, callback?: () => void): void {
        switch (effect) {
            case 'pulse':
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                    element.style.transition = 'transform 0.2s ease';
                    callback?.();
                }, 100);
                break;
                
            case 'bounce':
                element.style.transform = 'scale(1.2)';
                element.style.transition = 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                    callback?.();
                }, 200);
                break;
                
            case 'fadeIn':
                element.style.opacity = '0';
                element.style.transition = `opacity ${this.config.animationDuration}ms ease`;
                setTimeout(() => {
                    element.style.opacity = '1';
                    callback?.();
                }, 10);
                break;
                
            case 'fadeOut':
                element.style.transition = `opacity ${this.config.animationDuration}ms ease`;
                element.style.opacity = '0';
                setTimeout(() => {
                    callback?.();
                }, this.config.animationDuration);
                break;
        }
    }

    // === DEBUG ===

    /**
     * Toggle debug info
     */
    public toggleDebugInfo(): void {
        this.config.showDebugInfo = !this.config.showDebugInfo;
        
        if (this.config.showDebugInfo) {
            this.showDebugInfo();
        } else {
            this.hideDebugInfo();
        }
    }

    /**
     * Mostra informações de debug
     */
    private showDebugInfo(): void {
        if (!this.elements.debugContainer) return;
        
        this.elements.debugContainer.style.display = 'block';
        this.elements.debugContainer.innerHTML = `
            <div>🎮 DEBUG INFO (F1 para toggle)</div>
            <div id="fpsDisplay">FPS: --</div>
            <div id="movementState">Estado: --</div>
        `;
        
        this.config.showFPS = true;
    }

    /**
     * Esconde informações de debug
     */
    private hideDebugInfo(): void {
        if (!this.elements.debugContainer) return;
        
        this.elements.debugContainer.style.display = 'none';
        this.config.showFPS = false;
    }

    // === CONFIGURATION ===

    /**
     * Atualiza configurações
     */
    public updateConfig(newConfig: Partial<UIConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.autoHideControls !== undefined) {
            this.setupAutoHide();
        }
    }

    // === CONTROL ===

    /**
     * Reseta UI para estado inicial
     */
    public reset(): void {
        // Esconder barra de casting
        if (this.isCastingBarVisible) {
            this.hideCastingBar();
        }
        
        // Resetar contadores
        this.updateSpellCount(0);
        
        // Limpar notificações
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        console.log('🔄 UI resetada');
    }

    /**
     * Limpa recursos
     */
    public dispose(): void {
        console.log('🧹 Limpando UIManager...');
        
        this.reset();
        
        // Limpar timer
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
        }
        
        // Remover elementos de debug
        if (this.elements.debugContainer && this.elements.debugContainer.parentNode) {
            this.elements.debugContainer.parentNode.removeChild(this.elements.debugContainer);
        }
        
        this.elements = {};
        this.isInitialized = false;
        
        console.log('✅ UIManager limpo!');
    }

    public updateUIMana(data: { current: number; max: number; percentage: number }): void {
        this.updateManaDisplay(data.current, data.max);
    }

    public updateUIStats(data: any): void { // Usar 'any' por enquanto para compatibilidade
        // Este método pode ser expandido para atualizar outras partes da UI
        // como a barra de vida, estamina, etc.
        if (data.mana) {
            this.updateManaDisplay(data.mana.current, data.mana.max);
        }
        // Atualizar outras estatísticas se necessário
    }
} 