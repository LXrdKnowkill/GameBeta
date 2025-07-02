/**
 * GameScene - Gerencia a cena principal do jogo
 * Responsável por criar o mundo, iluminação, e coordenar todos os sistemas
 */

import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { GroundMesh } from '@babylonjs/core/Meshes/groundMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';

import { SimpleMagicController } from './systems/SimpleMagicController';
import { GameUI } from './GameUI';

// Imports para física Havok (Babylon.js v6)
import { HavokPlugin } from '@babylonjs/core/Physics';
import HavokPhysics from '@babylonjs/havok';
import { PhysicsAggregate } from '@babylonjs/core/Physics';
import { PhysicsShapeType } from '@babylonjs/core/Physics';

// Novo sistema de Player com física
import { Player } from './systems/Player';
import { TerrainSystem } from './systems/TerrainSystem';

/**
 * Classe principal que gerencia toda a cena do jogo
 * Aqui criamos o mundo, configuramos iluminação e conectamos todos os sistemas
 */
export class GameScene {
    private engine: Engine;
    private scene: Scene;
    private canvas: HTMLCanvasElement;
    
    // Sistemas principais
    private player!: Player; // Novo sistema com física real
    private magicController!: SimpleMagicController;
    private gameUI!: GameUI;
    
    // Ambiente
    private terrainSystem!: TerrainSystem;
    private ground!: GroundMesh;
    private groundPhysics: PhysicsAggregate | null = null; // Corpo físico do chão (pode ser null)
    private trainingDummy: any; // O boneco de treino
    private dummyPhysics: PhysicsAggregate | null = null; // Corpo físico do boneco (pode ser null)
    
    // Estado da física
    private isPhysicsEnabled: boolean = false;

    constructor(engine: Engine, canvas: HTMLCanvasElement) {
        this.engine = engine;
        this.canvas = canvas;
        
        // Cria a cena básica do Babylon.js
        this.scene = new Scene(this.engine);
        
        // Configura a cor de fundo (céu azul claro)
        this.scene.clearColor = new Color4(0.5, 0.8, 1.0, 1.0);
    }

    /**
     * Cria toda a cena do jogo
     * Método assíncrono porque pode precisar carregar texturas ou modelos
     */
    public async createScene(): Promise<void> {
        console.log('🌍 Criando cena do jogo...');
        
        // 0. Inicializar física PRIMEIRO
        await this.initializePhysics();
        
        // 1. Criar iluminação
        this.createLighting();
        
        // 2. Criar o ambiente melhorado (terreno + grama + detalhes)
        await this.createEnvironment();
        
        // 3. Criar o boneco de treino
        this.createTrainingDummy();
        
        // 4. Inicializar sistemas de jogo
        await this.initializeGameSystems();
        
        // 5. Configurar o loop de atualização
        this.setupGameLoop();
        
        console.log('✅ Cena criada com sucesso!');
    }

    /**
     * Inicializa o motor de física Havok
     * DEVE ser chamado antes de criar qualquer objeto físico
     * Agora com fallback - se falhar, continua sem física
     */
    private async initializePhysics(): Promise<void> {
        console.log("⚙️ Carregando o motor de física Havok...");
        
        try {
            // CORREÇÃO: URL do WASM na pasta public (servido estaticamente)
            const wasmUrl = '/HavokPhysics.wasm';

            // Carregar o WASM do Havok com configuração correta
            const havokInstance = await HavokPhysics({
                locateFile: () => wasmUrl
            });
            
            // Criar plugin de física
            const physicsPlugin = new HavokPlugin(true, havokInstance);
            
            // Habilitar física na cena com gravidade
            this.scene.enablePhysics(new Vector3(0, -9.81, 0), physicsPlugin);
            
            this.isPhysicsEnabled = true;
            console.log("✅ Física Havok habilitada!");
        } catch (error) {
            // O fallback continua aqui, caso o usuário não tenha suporte a WASM
            console.error("❌ Erro ao inicializar física:", error);
            console.warn("⚠️ Continuando sem física real - usando movimento manual");
            this.isPhysicsEnabled = false;
        }
    }

    /**
     * Configura toda a iluminação da cena
     * Usamos luz hemisférica (ambiente) + luz direcional (sol) para um visual melhor
     */
    private createLighting(): void {
        console.log('💡 Configurando iluminação...');
        
        // Luz ambiente - ilumina tudo de forma suave
        // Simula a luz do céu que vem de todas as direções
        const hemisphericLight = new HemisphericLight(
            'hemisphericLight', 
            new Vector3(0, 1, 0), // Direção: de cima para baixo
            this.scene
        );
        hemisphericLight.intensity = 0.6; // Luz suave para não ficar muito claro
        hemisphericLight.diffuse = new Color3(0.8, 0.9, 1.0); // Cor azulada (céu)
        
        // Luz direcional - simula o sol
        // Cria sombras e dá mais definição aos objetos
        const directionalLight = new DirectionalLight(
            'directionalLight',
            new Vector3(-1, -1, -0.5), // Direção do sol (diagonal)
            this.scene
        );
        directionalLight.intensity = 0.8;
        directionalLight.diffuse = new Color3(1.0, 0.95, 0.8); // Cor amarelada (sol)
        
        // Configurar sombras (opcional, mas deixa mais bonito)
        const shadowGenerator = new ShadowGenerator(1024, directionalLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
    }

    /**
     * Cria o ambiente básico da cena
     * Agora usando o novo TerrainSystem com grama e detalhes!
     */
    private async createEnvironment(): Promise<void> {
        console.log('🌱 Criando ambiente melhorado...');
        
        // Criar o novo sistema de terreno
        this.terrainSystem = new TerrainSystem(this.scene, {
            size: 50,        // Terreno 50x50 metros  
            grassDensity: 150, // Quantidade moderada de grama para performance
            grassHeight: 0.4,  // Grama um pouco mais baixa
            grassVariation: 0.2 // Menos variação para uniformidade
        });
        
        // Criar o terreno melhorado
        this.ground = await this.terrainSystem.createTerrain();
        
        // ADICIONAR FÍSICA AO CHÃO (se disponível)
        if (this.isPhysicsEnabled) {
            this.groundPhysics = new PhysicsAggregate(
                this.ground, 
                PhysicsShapeType.BOX, 
                { mass: 0 }, // massa 0 = objeto estático
                this.scene
            );
            console.log('✅ Terreno melhorado criado: 50x50 metros com física + grama + detalhes');
        } else {
            console.log('✅ Terreno melhorado criado: 50x50 metros com grama + detalhes (sem física)');
        }
    }

    /**
     * Cria o boneco de treino - alvo para testar magias
     * Um cilindro simples que muda de cor quando atingido
     */
    private createTrainingDummy(): void {
        console.log('🎯 Criando boneco de treino...');
        
        // Criar cilindro como boneco de treino
        this.trainingDummy = MeshBuilder.CreateCylinder(
            'trainingDummy',
            { 
                height: 2, 
                diameter: 0.8,
                tessellation: 16 // Quantos lados o cilindro tem
            },
            this.scene
        );
        
        // Posicionar o boneco na frente do jogador
        this.trainingDummy.position = new Vector3(0, 1, 5); // 5 metros à frente, 1 metro de altura
        
        // Material do boneco - madeira marrom
        const dummyMaterial = new StandardMaterial('dummyMaterial', this.scene);
        dummyMaterial.diffuseColor = new Color3(0.6, 0.4, 0.2); // Marrom
        dummyMaterial.specularColor = new Color3(0.1, 0.1, 0.1); // Pouco brilho
        
        this.trainingDummy.material = dummyMaterial;
        
        // Armazenar cor original para poder voltar depois de piscar
        this.trainingDummy.originalMaterial = dummyMaterial;
        
        // ADICIONAR FÍSICA AO BONECO (se disponível)
        if (this.isPhysicsEnabled) {
            this.dummyPhysics = new PhysicsAggregate(
                this.trainingDummy, 
                PhysicsShapeType.CYLINDER, 
                { mass: 10 }, // massa baixa para que possa ser empurrado
                this.scene
            );
            console.log('✅ Boneco de treino criado na posição (0, 1, 5) com física');
        } else {
            console.log('✅ Boneco de treino criado na posição (0, 1, 5) (sem física)');
        }
    }

    /**
     * Inicializa todos os sistemas de jogo
     * Cada sistema é responsável por uma parte específica do jogo
     */
    private async initializeGameSystems(): Promise<void> {
        console.log('⚙️ Inicializando sistemas de jogo...');
        
        this.gameUI = new GameUI();
        
        // 1. Criar a instância do Player (síncrono)
        this.player = new Player(this.scene, this.canvas, {
            enablePhysics: this.isPhysicsEnabled,
            showDebugInfo: true
        });

        // 2. Aguardar a inicialização completa do Player (assíncrono)
        await this.player.initialize();
        
        // 3. Definir a câmera na cena, agora que o Player está pronto
        const camera = this.player.getCamera();
        if (camera) {
            this.scene.activeCamera = camera.getCamera();
            console.log('📷 Câmera definida na cena');
        } else {
            throw new Error('❌ Player não possui câmera válida');
        }
        
        // 4. Sistema de magia
        const { SimpleMagicController } = await import('./systems/SimpleMagicController');
        this.magicController = new SimpleMagicController(
            this.scene, 
            this.player,
            [this.trainingDummy]
        );
        
        console.log('✅ Todos os sistemas inicializados (movimento + física + magia + câmera)!');
    }

    /**
     * Configura o loop principal do jogo
     * Este método é chamado antes de cada frame ser renderizado
     * Aqui atualizamos todos os sistemas que precisam rodar constantemente
     */
    private setupGameLoop(): void {
        console.log('🔄 Configurando loop de jogo...');
        
        // O onBeforeRenderObservable é chamado antes de cada frame
        // É aqui que fazemos todas as atualizações da lógica do jogo
        this.scene.onBeforeRenderObservable.add(() => {
            // Calcular delta time (tempo desde o último frame)
            // Importante para movimento suave independente do framerate
            const deltaTime = this.engine.getDeltaTime() / 1000; // Converter para segundos
            
            // Atualizar todos os sistemas
            if (this.player) {
                this.player.update(deltaTime);
            }
            
            // Magic controller ativo
            if (this.magicController) {
                this.magicController.update(deltaTime);
            }
            
            if (this.gameUI) {
                this.gameUI.update(deltaTime);
            }
        });
        
        console.log('✅ Loop de jogo configurado!');
    }

    /**
     * Renderiza um frame do jogo
     * Chamado pelo loop principal em main.ts
     */
    public render(): void {
        if (this.scene) {
            this.scene.render();
        }
    }

    /**
     * Libera todos os recursos quando o jogo é fechado
     * Importante para evitar vazamentos de memória
     */
    public dispose(): void {
        console.log('🧹 Limpando recursos da cena...');
        
        if (this.player) {
            this.player.dispose();
        }
        
        // Magic controller ativo
        if (this.magicController) {
            this.magicController.dispose();
        }
        
        if (this.gameUI) {
            this.gameUI.dispose();
        }
        
        // Limpar agregados de física
        if (this.groundPhysics) {
            this.groundPhysics.dispose();
        }
        
        if (this.dummyPhysics) {
            this.dummyPhysics.dispose();
        }
        
        if (this.scene) {
            this.scene.dispose();
        }
        
        console.log('✅ Recursos limpos!');
    }

    /**
     * Getter para acessar a cena de outros lugares se necessário
     */
    public getScene(): Scene {
        return this.scene;
    }

    /**
     * Getter para acessar o agregado físico do chão
     */
    public getGroundPhysics(): PhysicsAggregate | null {
        return this.groundPhysics;
    }

    /**
     * Getter para acessar o agregado físico do boneco
     */
    public getDummyPhysics(): PhysicsAggregate | null {
        return this.dummyPhysics;
    }
    
    /**
     * Verifica se física está habilitada
     */
    public isPhysicsActive(): boolean {
        return this.isPhysicsEnabled;
    }
}