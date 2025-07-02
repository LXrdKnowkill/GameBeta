/**
 * Ponto de entrada principal do jogo
 * Inicializa o Babylon.js e conecta todos os sistemas do jogo
 */

// Importar todas as dependências do Babylon.js PRIMEIRO
import './babylon-imports';

import { Engine } from '@babylonjs/core/Engines/engine';
import { GameScene } from './GameScene';

/**
 * Classe principal que gerencia o ciclo de vida do jogo
 * Responsável por inicializar o engine, criar a cena e gerenciar o loop principal
 */
class Game {
    private engine: Engine;
    private canvas: HTMLCanvasElement;
    private gameScene: GameScene;

    constructor() {
        // Obtém o canvas do HTML
        this.canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        
        if (!this.canvas) {
            throw new Error('Canvas não encontrado! Verifique se existe um elemento com id="renderCanvas"');
        }

        // Inicializa o engine do Babylon.js
        // O segundo parâmetro (true) habilita o antialiasing para gráficos mais suaves
        this.engine = new Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            alpha: true
        });

        // Configura o redimensionamento automático quando a janela mudar de tamanho
        this.setupWindowResize();

        // Inicializa a cena do jogo
        this.gameScene = new GameScene(this.engine, this.canvas);
    }

    /**
     * Configura o redimensionamento automático da tela
     * Importante para jogos que devem funcionar em diferentes tamanhos de tela
     */
    private setupWindowResize(): void {
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    /**
     * Inicia o jogo
     * Cria a cena e inicia o loop de renderização
     */
    public async start(): Promise<void> {
        try {
            console.log('🎮 Iniciando o jogo...');
            
            // Cria a cena do jogo (assíncrono porque pode carregar assets)
            await this.gameScene.createScene();
            
            console.log('✅ Cena criada com sucesso!');
            
            // Inicia o loop de renderização
            // Este é o "coração" do jogo - roda a cada frame (normalmente 60 FPS)
            this.engine.runRenderLoop(() => {
                this.gameScene.render();
            });
            
            console.log('🚀 Jogo iniciado! Use WASD para mover e mouse para olhar ao redor.');
            
        } catch (error) {
            console.error('❌ Erro ao iniciar o jogo:', error);
            alert('Erro ao iniciar o jogo. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Para o jogo e limpa os recursos
     * Importante para evitar vazamentos de memória
     */
    public dispose(): void {
        console.log('🛑 Parando o jogo...');
        
        if (this.gameScene) {
            this.gameScene.dispose();
        }
        
        if (this.engine) {
            this.engine.dispose();
        }
    }
}

/**
 * Função que executa quando a página carrega
 * Aqui iniciamos tudo
 */
async function initGame() {
    try {
        const game = new Game();
        await game.start();
        
        // Limpa recursos quando a página é fechada
        window.addEventListener('beforeunload', () => {
            game.dispose();
        });
        
    } catch (error) {
        console.error('❌ Falha ao inicializar o jogo:', error);
    }
}

// Aguarda o DOM carregar completamente antes de iniciar o jogo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // Se o DOM já carregou, inicia imediatamente
    initGame();
}