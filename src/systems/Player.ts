/**
 * Player - Classe coordenadora que usa COMPOSIÇÃO ao invés de herança
 * 
 * ANTES: God Class fazendo tudo
 * DEPOIS: Composição de sistemas especializados
 * 
 * Esta é a abordagem PROFISSIONAL usada em estúdios de jogos
 */

import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsAggregate, PhysicsShapeCapsule } from '@babylonjs/core/Physics/v2';

// Importar sistemas especializados
import { InputManager } from './InputManager';
import { PlayerMovement, MovementState } from './PlayerMovement'; // Usar o sistema de física real
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { CharacterAnimator } from './CharacterAnimator';
import { PlayerStats } from './PlayerStats';
import { UIManager } from './UIManager';
import { ExternalAssetCharacter, CharacterParts } from './ExternalAssetCharacter';
import { GameUI } from '../GameUI'; // Importar GameUI

/**
 * Configuração do Player
 */
export interface PlayerConfig {
    spawnPosition?: Vector3;
    showDebugInfo?: boolean;
    enablePhysics?: boolean;
}

/**
 * Player - COORDENADOR que usa COMPOSIÇÃO + FÍSICA REAL
 * 
 * Não faz tudo sozinho - delega responsabilidades para sistemas especializados:
 * - InputManager: captura input
 * - PlayerMovement: física REAL e movimento
 * - ThirdPersonCamera: câmera
 * - CharacterAnimator: animações
 * - PlayerStats: dados (mana, vida, etc.)
 * - UIManager: interface
 * 
 * VANTAGENS:
 * ✅ Cada sistema pode ser testado isoladamente
 * ✅ Fácil de manter e modificar
 * ✅ Reutilizável (outros entities podem usar os mesmos sistemas)
 * ✅ Múltiplos programadores podem trabalhar em paralelo
 * ✅ Fácil de debuggar
 * ✅ Física real (rampas, colisões complexas, etc.)
 */
export class Player {
    private scene: Scene;
    private canvas: HTMLCanvasElement;
    
    // === SISTEMAS COMPOSTOS (cada um com sua responsabilidade) ===
    private inputManager!: InputManager;
    private movement!: PlayerMovement;
    private camera!: ThirdPersonCamera;
    private animator!: CharacterAnimator;
    private stats!: PlayerStats;
    private ui!: UIManager;
    
    // === FÍSICA REAL ===
    private physicsAggregate!: PhysicsAggregate;
    
    // === DADOS DO PERSONAGEM ===
    private characterLoader!: ExternalAssetCharacter;
    private characterParts!: CharacterParts; // Modelo 3D ou fallback geométrico
    
    // === MATERIAIS ===
    private materials: { [key: string]: StandardMaterial } = {};
    
    // === ESTADO ===
    private isInitialized: boolean = false;
    private config: PlayerConfig;
    
    // Nós
    private physicsRoot!: TransformNode;

    constructor(
        scene: Scene, 
        canvas: HTMLCanvasElement, 
        config?: PlayerConfig
    ) {
        this.scene = scene;
        this.canvas = canvas;
        this.config = { enablePhysics: true, ...config };
        // O construtor agora é síncrono e rápido.
    }

    /**
     * Inicializa todos os sistemas do Player de forma assíncrona.
     * Deve ser chamado e aguardado após a criação do Player.
     */
    public async initialize(): Promise<void> {
        this.initializeSystems();
        await this.createCharacterMesh();
        
        if (this.config.enablePhysics) {
            this.createPhysicsBody();
        }

        this.connectSystems();
        
        // ✅ CORREÇÃO: Forçar a animação inicial.
        // O evento onStateChanged só dispara em MUDANÇAS de estado, não no estado inicial.
        const initialState = this.movement.getCurrentState();
        this.animator.updateAnimationState(initialState, 0);
        
        this.isInitialized = true;
        console.log('✅ Player criado com composição + física real!');
    }

    /**
     * Inicializa os sistemas especializados (sem dependências de assets)
     */
    private initializeSystems(): void {
        console.log('⚙️ Inicializando sistemas especializados...');
        this.inputManager = new InputManager(this.scene, this.canvas);
        this.stats = new PlayerStats();
        this.ui = new UIManager();
        this.camera = new ThirdPersonCamera(this.scene, this.inputManager);
        console.log('✅ Sistemas básicos (input, stats, ui, camera) inicializados!');
    }

    /**
     * Carrega o modelo 3D do personagem OU cria um fallback
     */
    private async createCharacterMesh(): Promise<void> {
        console.log('🎨 Tentando carregar modelo 3D de personagem...');
        
        // 1. Criar o nó raiz para física e posicionamento
        this.physicsRoot = new TransformNode("playerPhysicsRoot", this.scene);
        this.physicsRoot.position = this.config.spawnPosition || Vector3.Zero();

        // 2. Carregar o modelo do personagem
        this.characterLoader = new ExternalAssetCharacter(this.scene);
        try {
            this.characterParts = await this.characterLoader.loadCharacter();
            console.log('✅ Modelo 3D carregado com sucesso!');
        } catch (error) {
            console.error('❌ Falha ao carregar modelo 3D. Criando fallback.', error);
            this.characterParts = this.characterLoader.createFallbackCharacter();
        }

        // 3. Anexar a malha visual ao nó de física
        this.characterParts.root.parent = this.physicsRoot;
        
        // ✅ CORREÇÃO: Ajustar a posição local do modelo visual para alinhar os pés com a base da física.
        // A cápsula de física tem sua base na posição do physicsRoot.
        // O modelo 3D tem sua origem no centro. Precisamos subir o modelo.
        this.characterParts.root.position.y = 0.9; // ✅ CORREÇÃO: Valor positivo para subir o personagem.
        
        console.log('✅ Personagem criado e pronto!');
    }

    /**
     * Cria o corpo físico e o anexa ao root do personagem
     */
    private createPhysicsBody(): void {
        if (!this.physicsRoot) {
            console.error('❌ Não é possível criar corpo físico sem um physicsRoot.');
            return;
        }
        console.log('⚙️ Criando corpo físico...');

        const capsuleOptions = {
            height: 1.6,
            radius: 0.4,
        };

        const shape = new PhysicsShapeCapsule(
            Vector3.Zero(),
            new Vector3(0, capsuleOptions.height, 0),
            capsuleOptions.radius,
            this.scene
        );

        this.physicsAggregate = new PhysicsAggregate(
            this.physicsRoot, // Aplicar física ao nó raiz correto
            shape,
            { mass: 80, friction: 0.5, restitution: 0.1 },
            this.scene
        );

        this.physicsAggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0), // Impede que o personagem tombe
        });

        console.log('✅ Corpo físico criado e conectado ao root do personagem');
    }

    /**
     * Conecta os sistemas uns aos outros via eventos
     * Isso mantém o baixo acoplamento
     */
    private connectSystems(): void {
        if (!this.physicsRoot) return;
        console.log('🔗 Conectando sistemas com física...');

        // Câmera segue o nó de física
        this.camera.setTarget(this.physicsRoot);

        // Movimento controla o agregado de física
        this.movement = new PlayerMovement(
            this.inputManager,
            this.physicsAggregate
        );
        this.animator = new CharacterAnimator(this.characterLoader);
        this.movement.onStateChanged.add((state) => {
            const speed = this.movement.getHorizontalSpeed ? this.movement.getHorizontalSpeed() : 0;
            this.animator.updateAnimationState(state.newState, speed);
        });
        this.stats.onManaChanged.add((data) => this.ui.updateUIMana(data));
        this.stats.onStatsChanged.add((data) => this.ui.updateUIStats(data));
        console.log('✅ Sistemas conectados via eventos');
    }

    /**
     * Loop de atualização principal do Player (chamado pelo GameScene)
     */
    public update(deltaTime: number): void {
        if (!this.isInitialized) return;

        // const cameraDirection = this.camera.getForwardDirection(); // REMOVER
        
        // 1. Câmera
        this.camera.update(deltaTime);

        // 2. Movimento
        this.movement.update(deltaTime);

        // 3. Animação
        this.animator.update(deltaTime);

        // 4. Estatísticas (regeneração, etc.)
        this.stats.update(deltaTime, this.movement.getCurrentState());

        // 5. UI
        this.updateUI();

        // 6. Input (limpeza no final do frame)
        this.inputManager.resetFrameInputs();
    }

    /**
     * Atualiza UI com dados atuais
     */
    private updateUI(): void {
        const statsData = this.stats.getStatsData();
        const currentState = this.movement?.getCurrentState() || MovementState.IDLE;
        
        this.ui.updateUI({
            mana: this.stats.getMana(),
            spellsCast: statsData.spellsCast,
            movementState: currentState,
            fps: this.calculateFPS()
        });
    }

    /**
     * Calcula FPS aproximado
     */
    private calculateFPS(): number {
        // Implementação simples - em um projeto real usaria timer mais preciso
        return 60; // Placeholder
    }

    // === INTERFACE PÚBLICA (para outros sistemas usarem) ===

    /**
     * Tenta gastar mana (para sistema de magia)
     */
    public spendMana(amount: number): boolean {
        const success = this.stats.spendMana(amount);
        if (success) {
            this.stats.recordSpellCast();
        }
        return success;
    }

    /**
     * Retorna posição atual
     */
    public getPosition(): Vector3 {
        return this.physicsRoot.position;
    }

    /**
     * Retorna direção da câmera (para mirar magias)
     */
    public getCameraDirection(): Vector3 {
        return this.camera.getForwardDirection();
    }

    /**
     * Retorna dados de mana
     */
    public getMana(): { current: number; max: number; percentage: number } {
        return this.stats.getMana();
    }

    /**
     * Retorna estado de movimento
     */
    public getMovementState(): MovementState {
        return this.movement.getCurrentState();
    }

    /**
     * Obtém o sistema de câmera
     */
    public getCamera(): ThirdPersonCamera | null {
        return this.camera;
    }

    /**
     * Verifica se o Player está completamente inicializado
     */
    public isFullyInitialized(): boolean {
        return this.isInitialized && 
               this.camera !== null && 
               this.movement !== null && 
               this.animator !== null;
    }

    /**
     * Aplica efeito de dano visual
     */
    public takeDamage(amount: number): void {
        this.stats.takeDamage(amount);
        // this.animator.playHitEffect(); // TODO: Reimplementar com o novo sistema de animação
        this.ui.screenShake(5, 300);
    }

    /**
     * Força animação específica
     */
    public playAnimation(animationName: string): void {
        // this.animator.playCustomAnimation(animationName); // TODO: Reimplementar com o novo sistema de animação
        this.characterLoader.playAnimation(animationName, false);
    }

    // === CONTROLE ===

    /**
     * Reinicia jogador
     */
    public reset(): void {
        console.log('🔄 Reiniciando Player (composição)...');
        
        // Cada sistema se reseta
        this.movement.reset();
        this.camera.reset();
        // this.animator.resetToIdle(); // TODO: Reimplementar com o novo sistema de animação
        this.stats.reset();
        this.ui.reset();
        
        console.log('✅ Player reiniciado!');
    }

    /**
     * Pausa/despausa sistemas
     */
    public setPaused(paused: boolean): void {
        this.inputManager.setActive(!paused);
        
        if (paused) {
            this.inputManager.releasePointerLock();
        }
    }

    // === MAGIC SYSTEM INTEGRATION ===

    /**
     * Callbacks para sistema de magia
     */
    public startCasting(): void {
        this.ui.showCastingBar('Water Ball');
        this.playAnimation('cast_spell');
    }

    public updateCasting(progress: number): void {
        this.ui.updateCastingProgress(progress);
    }

    public finishCasting(): void {
        this.ui.hideCastingBar();
    }

    // === CLEANUP ===

    /**
     * Limpa TODOS os recursos (cada sistema se limpa)
     */
    public dispose(): void {
        console.log('🧹 Limpando Player (composição)...');
        
        // Cada sistema se limpa
        this.inputManager?.dispose();
        this.movement?.dispose();
        this.camera?.dispose();
        this.animator?.dispose();
        this.stats?.dispose();
        this.ui?.dispose();
        
        // Limpar meshes
        if (this.characterParts?.root) {
            this.characterParts.root.dispose();
        }
        
        // Limpar materiais
        Object.values(this.materials).forEach(material => material.dispose());
        
        console.log('✅ Player limpo (todos os sistemas)!');
    }
}

/**
 * COMPARAÇÃO: ANTES vs DEPOIS
 * 
 * === ANTES (God Class): ===
 * ❌ 1000+ linhas em uma classe
 * ❌ Fazia: input + movimento + câmera + animação + UI + stats
 * ❌ Difícil de manter
 * ❌ Impossível de reutilizar
 * ❌ Conflitos ao trabalhar em equipe
 * ❌ Difícil de testar
 * 
 * === DEPOIS (Composição): ===
 * ✅ Cada sistema tem ~300-400 linhas focadas
 * ✅ Responsabilidade única clara
 * ✅ Fácil de manter e modificar
 * ✅ Sistemas reutilizáveis
 * ✅ Equipe pode trabalhar em paralelo
 * ✅ Cada sistema pode ser testado isoladamente
 * ✅ Fácil adicionar novos sistemas
 * ✅ Padrão usado em Unity, Unreal, etc.
 */ 