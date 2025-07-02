/**
 * PauseMenu - Sistema de menu de pause
 * Ativado com ESC, pausa o jogo e mostra opções
 */

import { Scene } from '@babylonjs/core/scene';

/**
 * Classe que gerencia o menu de pause do jogo
 */
export class PauseMenu {
    private scene: Scene;
    private isPaused: boolean = false;
    
    // Elementos HTML do menu (! indica que serão inicializados em createPauseMenuHTML)
    private pauseOverlay!: HTMLElement;
    private pauseMenu!: HTMLElement;
    
    // Callbacks
    private onResumeCallback?: () => void;
    private onRestartCallback?: () => void;

    constructor(scene: Scene) {
        this.scene = scene;
        this.createPauseMenuHTML();
        this.setupEventListeners();
        console.log('⏸️ Sistema de pause inicializado!');
    }

    /**
     * Cria os elementos HTML do menu de pause
     */
    private createPauseMenuHTML(): void {
        // Criar overlay escuro
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.id = 'pauseOverlay';
        this.pauseOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;
        
        // Criar menu central
        this.pauseMenu = document.createElement('div');
        this.pauseMenu.id = 'pauseMenu';
        this.pauseMenu.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 2px solid #4a90e2;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            color: white;
            font-family: Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            min-width: 300px;
        `;
        
        this.pauseMenu.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #4a90e2; font-size: 28px;">⏸️ JOGO PAUSADO</h2>
                <p style="margin: 0; color: #aaa; font-size: 14px;">Mushoku Tensei RPG Prototype</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button id="resumeBtn" style="
                    background: linear-gradient(135deg, #4a90e2, #357abd);
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='linear-gradient(135deg, #357abd, #2e5a87)'"
                   onmouseout="this.style.background='linear-gradient(135deg, #4a90e2, #357abd)'">
                    ▶️ CONTINUAR
                </button>
                
                <button id="restartBtn" style="
                    background: linear-gradient(135deg, #f0ad4e, #ec971f);
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='linear-gradient(135deg, #ec971f, #d58512)'"
                   onmouseout="this.style.background='linear-gradient(135deg, #f0ad4e, #ec971f)'">
                    🔄 REINICIAR
                </button>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
                <h4 style="margin: 0 0 15px 0; color: #4a90e2;">🎮 Controles:</h4>
                <div style="font-size: 12px; color: #999; line-height: 1.6;">
                    <div><strong>WASD:</strong> Movimento</div>
                    <div><strong>Shift:</strong> Correr</div>
                    <div><strong>Espaço:</strong> Pular</div>
                    <div><strong>Mouse:</strong> Câmera</div>
                    <div><strong>Scroll:</strong> Zoom</div>
                    <div><strong>Clique:</strong> Water Ball rápida</div>
                    <div><strong>Segurar:</strong> Water Ball poderosa</div>
                    <div><strong>ESC:</strong> Pausar/Despausar</div>
                </div>
            </div>
        `;
        
        // Adicionar menu ao overlay
        this.pauseOverlay.appendChild(this.pauseMenu);
        
        // Adicionar ao body
        document.body.appendChild(this.pauseOverlay);
        
        console.log('✅ Menu de pause criado!');
    }

    /**
     * Configura os event listeners
     */
    private setupEventListeners(): void {
        // Listener para ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.togglePause();
            }
        });
        
        // Botão continuar
        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                this.resume();
            });
        }
        
        // Botão reiniciar
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (this.onRestartCallback) {
                    this.onRestartCallback();
                }
                this.resume(); // Despausar após reiniciar
            });
        }
        
        // Clique fora do menu para continuar
        this.pauseOverlay.addEventListener('click', (event) => {
            if (event.target === this.pauseOverlay) {
                this.resume();
            }
        });
    }

    /**
     * Alterna entre pausado e não pausado
     */
    public togglePause(): void {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Pausa o jogo
     */
    public pause(): void {
        if (this.isPaused) return;
        
        console.log('⏸️ Jogo pausado');
        this.isPaused = true;
        
        // Pausar renderização do Babylon.js
        this.scene.getEngine().stopRenderLoop();
        
        // Mostrar menu
        this.pauseOverlay.style.display = 'block';
        
        // Liberar mouse se estiver travado
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Callback personalizado se houver
        if (this.onResumeCallback) {
            // Não chamar callback aqui, apenas na retomada
        }
    }

    /**
     * Retoma o jogo
     */
    public resume(): void {
        if (!this.isPaused) return;
        
        console.log('▶️ Jogo retomado');
        this.isPaused = false;
        
        // Retomar renderização
        this.scene.getEngine().runRenderLoop(() => {
            this.scene.render();
        });
        
        // Esconder menu
        this.pauseOverlay.style.display = 'none';
        
        // Callback personalizado se houver
        if (this.onResumeCallback) {
            this.onResumeCallback();
        }
    }

    /**
     * Verifica se o jogo está pausado
     */
    public isPausedState(): boolean {
        return this.isPaused;
    }

    /**
     * Define callback para quando o jogo for retomado
     */
    public setOnResumeCallback(callback: () => void): void {
        this.onResumeCallback = callback;
    }

    /**
     * Define callback para quando reiniciar for clicado
     */
    public setOnRestartCallback(callback: () => void): void {
        this.onRestartCallback = callback;
    }

    /**
     * Limpa recursos do menu de pause
     */
    public dispose(): void {
        console.log('🧹 Limpando menu de pause...');
        
        if (this.pauseOverlay && this.pauseOverlay.parentNode) {
            this.pauseOverlay.parentNode.removeChild(this.pauseOverlay);
        }
        
        console.log('✅ Menu de pause limpo!');
    }
}