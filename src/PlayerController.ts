/**
 * PlayerController - Gerencia movimento do jogador e câmera
 * Implementa controle em terceira pessoa estilo "over-the-shoulder"
 * Versão melhorada com sprint, pulo, inércia e estados visuais
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

/**
 * Estados de movimento do jogador
 */
enum MovementState {
    IDLE = 'idle',
    WALKING = 'walking',
    RUNNING = 'running',
    JUMPING = 'jumping',
    FALLING = 'falling'
}

/**
 * Interface para as partes do corpo do jogador humanóide
 */
interface HumanoidParts {
    root: TransformNode;
    body: Mesh;
    head: Mesh;
    leftArm: Mesh;
    rightArm: Mesh;
    leftLeg: Mesh;
    rightLeg: Mesh;
    hair: Mesh;
}

/**
 * Configurações de movimento
 */
interface MovementConfig {
    walkSpeed: number;
    runSpeed: number;
    jumpForce: number;
    gravity: number;
    acceleration: number;
    deceleration: number;
    airControl: number; // Controle no ar (0-1)
    maxFallSpeed: number;
}

/**
 * Configurações de câmera
 */
interface CameraConfig {
    minDistance: number;
    maxDistance: number;
    minHeight: number;
    maxHeight: number;
    sensitivity: number;
    smoothing: number;
    zoomSpeed: number;
}

/**
 * Classe responsável por controlar o jogador
 * Versão melhorada com física, estados e controles aprimorados
 */
export class PlayerController {
    private scene: Scene;
    private canvas: HTMLCanvasElement;
    
    // Jogador e câmera
    private humanoidParts!: HumanoidParts;
    private camera!: UniversalCamera;
    private staff!: Mesh; // Cajado do jogador
    private staffCrystal!: Mesh; // Cristal do cajado
    
    // Materiais do humanóide
    private materials: { [key: string]: StandardMaterial } = {};
    
    // Estado do movimento
    private velocity: Vector3 = Vector3.Zero();
    private currentState: MovementState = MovementState.IDLE;
    private isGrounded: boolean = true;
    private groundLevel: number = 1.0; // Altura do chão para o centro do jogador
    
    // Configurações
    private movementConfig: MovementConfig = {
        walkSpeed: 4.0,
        runSpeed: 8.0,
        jumpForce: 12.0,
        gravity: -25.0,
        acceleration: 15.0,
        deceleration: 20.0,
        airControl: 0.3,
        maxFallSpeed: -30.0
    };
    
    private cameraConfig: CameraConfig = {
        minDistance: 3.0,
        maxDistance: 15.0,
        minHeight: 1.0,
        maxHeight: 8.0,
        sensitivity: 0.005,
        smoothing: 8.0,
        zoomSpeed: 2.0
    };
    
    // Controle da câmera
    private cameraDistance: number = 8.0;
    private cameraHeight: number = 4.0;
    private targetCameraDistance: number = 8.0;
    private targetCameraHeight: number = 4.0;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private targetMouseX: number = 0;
    private targetMouseY: number = 0;
    
    // Estado das teclas
    private keys: { [key: string]: boolean } = {};
    
    // Sistema de mana
    private maxMana: number = 100;
    private currentMana: number = 100;
    private manaRegenRate: number = 10; // mana por segundo
    
    // Limites do mapa
    private mapBounds = {
        minX: -20,
        maxX: 20,
        minZ: -20,
        maxZ: 20
    };
    
    // Animação visual
    private animationTime: number = 0;
    private bobIntensity: number = 0;
    private lastFootstepTime: number = 0;

    constructor(scene: Scene, canvas: HTMLCanvasElement) {
        this.scene = scene;
        this.canvas = canvas;
    }

    /**
     * Inicializa o jogador, câmera e controles
     */
    public async initialize(): Promise<void> {
        console.log('👤 Inicializando jogador melhorado...');
        
        this.createPlayer();
        this.createCamera();
        this.setupInputHandlers();
        
        console.log('✅ Jogador melhorado inicializado!');
    }

    /**
     * Cria o jogador humanóide completo
     */
    private createPlayer(): void {
        console.log('👤 Criando jogador humanóide...');
        
        // Criar materiais primeiro
        this.createMaterials();
        
        // Criar nó raiz para o jogador
        const root = new TransformNode('playerRoot', this.scene);
        root.position = new Vector3(0, this.groundLevel, 0);
        
        // Criar partes do corpo
        const body = this.createBody();
        const head = this.createHead();
        const hair = this.createHair();
        const leftArm = this.createArm('left');
        const rightArm = this.createArm('right');
        const leftLeg = this.createLeg('left');
        const rightLeg = this.createLeg('right');
        
        // Parental das partes ao root
        body.parent = root;
        head.parent = root;
        hair.parent = head; // Cabelo é filho da cabeça
        leftArm.parent = root;
        rightArm.parent = root;
        leftLeg.parent = root;
        rightLeg.parent = root;
        
        // Posicionar partes do corpo
        this.positionBodyParts(body, head, leftArm, rightArm, leftLeg, rightLeg);
        
        // Armazenar referências
        this.humanoidParts = {
            root,
            body,
            head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            hair
        };
        
        // Criar cajado do jogador
        this.createStaff();
        
        console.log('✅ Jogador humanóide criado com sucesso!');
    }

    /**
     * Cria os materiais para as diferentes partes do corpo
     */
    private createMaterials(): void {
        // Material da pele (bege claro)
        this.materials.skin = new StandardMaterial('skinMaterial', this.scene);
        this.materials.skin.diffuseColor = new Color3(0.9, 0.7, 0.6);
        this.materials.skin.specularColor = new Color3(0.1, 0.1, 0.1);
        
        // Material da roupa (azul como Rudeus)
        this.materials.clothes = new StandardMaterial('clothesMaterial', this.scene);
        this.materials.clothes.diffuseColor = new Color3(0.2, 0.4, 0.8);
        this.materials.clothes.specularColor = new Color3(0.2, 0.2, 0.2);
        
        // Material do cabelo (marrom)
        this.materials.hair = new StandardMaterial('hairMaterial', this.scene);
        this.materials.hair.diffuseColor = new Color3(0.4, 0.2, 0.1);
        this.materials.hair.specularColor = new Color3(0.1, 0.1, 0.1);
    }

    /**
     * Cria o corpo (torso)
     */
    private createBody(): Mesh {
        const body = MeshBuilder.CreateBox(
            'playerBody',
            { width: 1.0, height: 1.2, depth: 0.6 },
            this.scene
        );
        
        body.material = this.materials.clothes;
        return body;
    }

    /**
     * Cria a cabeça
     */
    private createHead(): Mesh {
        const head = MeshBuilder.CreateSphere(
            'playerHead',
            { diameter: 0.8 },
            this.scene
        );
        
        head.material = this.materials.skin;
        return head;
    }

    /**
     * Cria o cabelo
     */
    private createHair(): Mesh {
        const hair = MeshBuilder.CreateSphere(
            'playerHair',
            { diameter: 0.85 },
            this.scene
        );
        
        hair.material = this.materials.hair;
        hair.position.y = 0.1;
        return hair;
    }

    /**
     * Cria um braço
     */
    private createArm(side: 'left' | 'right'): Mesh {
        const arm = MeshBuilder.CreateCapsule(
            `player${side}Arm`,
            { radius: 0.15, height: 1.0 },
            this.scene
        );
        
        arm.material = this.materials.skin;
        
        // Definir ponto de rotação no ombro
        arm.setPivotPoint(new Vector3(0, 0.5, 0));
        
        return arm;
    }

    /**
     * Cria uma perna
     */
    private createLeg(side: 'left' | 'right'): Mesh {
        const leg = MeshBuilder.CreateCapsule(
            `player${side}Leg`,
            { radius: 0.18, height: 1.2 },
            this.scene
        );
        
        leg.material = this.materials.clothes;
        
        // Definir ponto de rotação no quadril
        leg.setPivotPoint(new Vector3(0, 0.6, 0));
        
        return leg;
    }

    /**
     * Posiciona todas as partes do corpo corretamente
     */
    private positionBodyParts(
        body: Mesh,
        head: Mesh,
        leftArm: Mesh,
        rightArm: Mesh,
        leftLeg: Mesh,
        rightLeg: Mesh
    ): void {
        // Corpo no centro
        body.position.y = 0.6;
        
        // Cabeça acima do corpo
        head.position.y = 1.5;
        
        // Braços nas laterais do corpo
        leftArm.position.set(-0.7, 0.8, 0);
        rightArm.position.set(0.7, 0.8, 0);
        
        // Pernas embaixo do corpo
        leftLeg.position.set(-0.3, -0.6, 0);
        rightLeg.position.set(0.3, -0.6, 0);
    }

    /**
     * Atualiza os materiais do humanóide baseado no estado
     */
    private updateHumanoidMaterials(): void {
        let clothesColor: Color3;
        let emissive: Color3 = new Color3(0, 0, 0);
        
        switch (this.currentState) {
            case MovementState.IDLE:
                clothesColor = new Color3(0.2, 0.4, 0.8); // Azul normal
                break;
            case MovementState.WALKING:
                clothesColor = new Color3(0.3, 0.5, 0.9); // Azul mais claro
                break;
            case MovementState.RUNNING:
                clothesColor = new Color3(0.1, 0.3, 0.7); // Azul mais escuro
                emissive = new Color3(0.05, 0.1, 0.2); // Leve brilho
                break;
            case MovementState.JUMPING:
            case MovementState.FALLING:
                clothesColor = new Color3(0.4, 0.6, 1.0); // Azul bem claro
                emissive = new Color3(0.1, 0.2, 0.3); // Mais brilho
                break;
            default:
                clothesColor = new Color3(0.2, 0.4, 0.8);
        }
        
        // Atualizar material das roupas
        if (this.materials.clothes) {
            this.materials.clothes.diffuseColor = clothesColor;
            this.materials.clothes.emissiveColor = emissive;
        }
    }

    /**
     * Atualiza animações do humanóide baseado no movimento
     */
    private updateHumanoidAnimations(deltaTime: number): void {
        if (!this.humanoidParts) return;
        
        const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        
        if (this.isGrounded && horizontalSpeed > 0.5) {
            // Animação de caminhada/corrida
            const walkCycle = Math.sin(this.animationTime * (this.currentState === MovementState.RUNNING ? 12 : 8));
            const walkCycleOffset = Math.sin(this.animationTime * (this.currentState === MovementState.RUNNING ? 12 : 8) + Math.PI);
            
            // Movimento dos braços
            this.humanoidParts.leftArm.rotation.x = walkCycle * 0.5;
            this.humanoidParts.rightArm.rotation.x = walkCycleOffset * 0.3; // Menos movimento no braço com cajado
            
            // Movimento das pernas
            this.humanoidParts.leftLeg.rotation.x = walkCycleOffset * 0.3;
            this.humanoidParts.rightLeg.rotation.x = walkCycle * 0.3;
            
            // Bob do corpo
            const bodyBob = Math.abs(Math.sin(this.animationTime * (this.currentState === MovementState.RUNNING ? 16 : 12))) * 0.03;
            this.humanoidParts.body.position.y = 0.6 + bodyBob;
            this.humanoidParts.head.position.y = 1.5 + bodyBob;
        } else {
            // Voltar para pose idle suavemente
            this.humanoidParts.leftArm.rotation.x = this.lerp(this.humanoidParts.leftArm.rotation.x, 0, 5.0 * deltaTime);
            this.humanoidParts.rightArm.rotation.x = this.lerp(this.humanoidParts.rightArm.rotation.x, 0, 5.0 * deltaTime);
            this.humanoidParts.leftLeg.rotation.x = this.lerp(this.humanoidParts.leftLeg.rotation.x, 0, 5.0 * deltaTime);
            this.humanoidParts.rightLeg.rotation.x = this.lerp(this.humanoidParts.rightLeg.rotation.x, 0, 5.0 * deltaTime);
            
            this.humanoidParts.body.position.y = this.lerp(this.humanoidParts.body.position.y, 0.6, 5.0 * deltaTime);
            this.humanoidParts.head.position.y = this.lerp(this.humanoidParts.head.position.y, 1.5, 5.0 * deltaTime);
        }
        
        // Animação sutil da cabeça
        this.humanoidParts.head.rotation.y = Math.sin(this.animationTime * 0.8) * 0.05;
    }

    /**
     * Cria o cajado mágico do jogador
     */
    private createStaff(): void {
        // Cabo do cajado
        this.staff = MeshBuilder.CreateCylinder(
            'playerStaff',
            { height: 1.8, diameter: 0.08 },
            this.scene
        );
        
        // Material do cajado (madeira)
        const staffMaterial = new StandardMaterial('staffMaterial', this.scene);
        staffMaterial.diffuseColor = new Color3(0.6, 0.4, 0.2);
        staffMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        this.staff.material = staffMaterial;
        
        // Cristal no topo do cajado
        this.staffCrystal = MeshBuilder.CreateSphere(
            'playerStaffCrystal',
            { diameter: 0.2 },
            this.scene
        );
        
        // Material do cristal (brilha mais quando correndo/pulando)
        const crystalMaterial = new StandardMaterial('crystalMaterial', this.scene);
        crystalMaterial.diffuseColor = new Color3(0.3, 0.7, 1.0);
        crystalMaterial.emissiveColor = new Color3(0.1, 0.3, 0.5);
        crystalMaterial.specularColor = new Color3(1, 1, 1);
        this.staffCrystal.material = crystalMaterial;
        
        // Posicionar cristal no topo do cajado
        this.staffCrystal.position.y = 0.9;
        this.staffCrystal.parent = this.staff;
        
        // Posicionar cajado na mão direita do jogador
        this.staff.position.set(0.25, -0.3, 0);
        this.staff.rotation.z = 0.2;
        this.staff.parent = this.humanoidParts.rightArm;
        
        console.log('✅ Cajado melhorado criado!');
    }

    /**
     * Cria e configura a câmera em terceira pessoa
     */
    private createCamera(): void {
        this.camera = new UniversalCamera('camera', Vector3.Zero(), this.scene);
        this.updateCameraPosition();
        this.scene.activeCamera = this.camera;
        
        console.log('📷 Câmera melhorada configurada');
    }

    /**
     * Atualiza a posição da câmera com suavização
     */
    private updateCameraPosition(): void {
        if (!this.humanoidParts || !this.camera) return;
        
        // Suavizar rotação da câmera
        this.mouseX = this.lerp(this.mouseX, this.targetMouseX, this.cameraConfig.smoothing * 0.016);
        this.mouseY = this.lerp(this.mouseY, this.targetMouseY, this.cameraConfig.smoothing * 0.016);
        
        // Suavizar distância e altura da câmera
        this.cameraDistance = this.lerp(this.cameraDistance, this.targetCameraDistance, 5.0 * 0.016);
        this.cameraHeight = this.lerp(this.cameraHeight, this.targetCameraHeight, 5.0 * 0.016);
        
        // Calcular posição da câmera
        const offsetX = Math.sin(this.mouseX) * this.cameraDistance;
        const offsetZ = Math.cos(this.mouseX) * this.cameraDistance;
        const offsetY = this.cameraHeight + (Math.sin(this.mouseY) * 2);
        
        const playerPos = this.humanoidParts.root.position;
        this.camera.position = new Vector3(
            playerPos.x + offsetX,
            playerPos.y + offsetY,
            playerPos.z + offsetZ
        );
        
        // Olhar para o jogador com um pequeno offset para cima
        this.camera.setTarget(playerPos.add(new Vector3(0, 1, 0)));
    }

    /**
     * Configura todos os manipuladores de input melhorados
     */
    private setupInputHandlers(): void {
        console.log('🎮 Configurando controles melhorados...');
        
        // === CONTROLES DE TECLADO ===
        window.addEventListener('keydown', (event) => {
            this.keys[event.code.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (event) => {
            this.keys[event.code.toLowerCase()] = false;
        });
        
        // === CONTROLES DE MOUSE ===
        let isMouseLocked = false;
        
        this.canvas.addEventListener('click', () => {
            if (!isMouseLocked) {
                this.canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            isMouseLocked = document.pointerLockElement === this.canvas;
        });
        
        document.addEventListener('mousemove', (event) => {
            if (isMouseLocked) {
                this.targetMouseX += event.movementX * this.cameraConfig.sensitivity;
                this.targetMouseY += event.movementY * this.cameraConfig.sensitivity;
                this.targetMouseY = Math.max(-1.2, Math.min(1.2, this.targetMouseY));
            }
        });
        
        // === CONTROLE DE ZOOM (RODA DO MOUSE) ===
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const zoomDelta = event.deltaY > 0 ? 1 : -1;
            this.targetCameraDistance = Math.max(
                this.cameraConfig.minDistance, 
                Math.min(this.cameraConfig.maxDistance, 
                    this.targetCameraDistance + zoomDelta * this.cameraConfig.zoomSpeed)
            );
        });
        
        console.log('✅ Controles melhorados configurados!');
    }

    /**
     * Atualiza o jogador a cada frame com física melhorada
     */
    public update(deltaTime: number): void {
        this.animationTime += deltaTime;
        
        this.processPhysics(deltaTime);
        this.processMovement(deltaTime);
        this.updateVisualEffects(deltaTime);
        this.regenerateMana(deltaTime);
        this.updateCameraPosition();
        this.updateUI();
        
        // Atualizar animações do humanóide
        this.updateHumanoidAnimations(deltaTime);
        // Atualizar materiais baseado no estado
        this.updateHumanoidMaterials();
    }

    /**
     * Processa física do jogador (gravidade, colisões, etc.)
     */
    private processPhysics(deltaTime: number): void {
        // Aplicar gravidade se não estiver no chão
        if (!this.isGrounded) {
            this.velocity.y += this.movementConfig.gravity * deltaTime;
            this.velocity.y = Math.max(this.velocity.y, this.movementConfig.maxFallSpeed);
        }
        
        // Atualizar posição baseada na velocidade
        const movement = this.velocity.scale(deltaTime);
        this.humanoidParts.root.position.addInPlace(movement);
        
        // Verificar colisão com o chão
        if (this.humanoidParts.root.position.y <= this.groundLevel) {
            this.humanoidParts.root.position.y = this.groundLevel;
            this.isGrounded = true;
            
            // Se estava caindo, parar velocidade vertical
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
                
                // Mudança de estado de queda para idle/movimento
                if (this.currentState === MovementState.FALLING) {
                    this.updateMovementState();
                }
            }
        } else {
            this.isGrounded = false;
        }
        
        // Aplicar limites do mapa
        this.applyMapBounds();
    }

    /**
     * Processa input de movimento com física melhorada
     */
    private processMovement(deltaTime: number): void {
        // Determinar direção desejada
        let inputVector = Vector3.Zero();
        let isRunning = false;
        
        // Processar teclas WASD
        if (this.keys['keyw'] || this.keys['arrowup']) {
            inputVector.z += 1;
        }
        if (this.keys['keys'] || this.keys['arrowdown']) {
            inputVector.z -= 1;
        }
        if (this.keys['keya'] || this.keys['arrowleft']) {
            inputVector.x -= 1;
        }
        if (this.keys['keyd'] || this.keys['arrowright']) {
            inputVector.x += 1;
        }
        
        // Sprint (Shift)
        if (this.keys['shiftleft'] || this.keys['shiftright']) {
            isRunning = true;
        }
        
        // Pulo (Espaço)
        if ((this.keys['space']) && this.isGrounded) {
            this.jump();
        }
        
        // Normalizar entrada
        if (inputVector.length() > 0) {
            inputVector.normalize();
            
            // CORREÇÃO: Usar direção da câmera ao invés de rotação do mouse
            // Obter vetores direcionais da câmera
            const cameraForward = this.camera.getForwardRay().direction.normalize();
            const cameraRight = Vector3.Cross(cameraForward, Vector3.Up()).normalize();
            
            // Calcular movimento baseado na direção da câmera
            // W/S = frente/trás relativo à câmera
            // A/D = esquerda/direita relativo à câmera
            const forwardMovement = cameraForward.scale(inputVector.z);
            const rightMovement = cameraRight.scale(inputVector.x);
            
            // Combinar movimentos e manter no plano horizontal (Y=0)
            const rotatedInput = forwardMovement.add(rightMovement);
            rotatedInput.y = 0; // Manter movimento apenas no plano horizontal
            
            // Normalizar novamente para garantir velocidade consistente
            if (rotatedInput.length() > 0) {
                rotatedInput.normalize();
            }
            
            // Determinar velocidade alvo
            const targetSpeed = isRunning ? this.movementConfig.runSpeed : this.movementConfig.walkSpeed;
            const targetVelocity = rotatedInput.scale(targetSpeed);
            
            // Aplicar aceleração
            const acceleration = this.isGrounded ? 
                this.movementConfig.acceleration : 
                this.movementConfig.acceleration * this.movementConfig.airControl;
            
            this.velocity.x = this.lerp(this.velocity.x, targetVelocity.x, acceleration * deltaTime);
            this.velocity.z = this.lerp(this.velocity.z, targetVelocity.z, acceleration * deltaTime);
            
            // Rotacionar jogador suavemente na direção do movimento
            if (this.isGrounded && rotatedInput.length() > 0.1) {
                // Calcular ângulo baseado na direção de movimento
                const targetRotation = Math.atan2(rotatedInput.x, rotatedInput.z);
                this.humanoidParts.root.rotation.y = this.lerpAngle(
                    this.humanoidParts.root.rotation.y, 
                    targetRotation, 
                    8.0 * deltaTime
                );
            }
        } else {
            // Nenhuma entrada - desacelerar
            const deceleration = this.isGrounded ? 
                this.movementConfig.deceleration : 
                this.movementConfig.deceleration * this.movementConfig.airControl;
            
            this.velocity.x = this.lerp(this.velocity.x, 0, deceleration * deltaTime);
            this.velocity.z = this.lerp(this.velocity.z, 0, deceleration * deltaTime);
        }
        
        // Atualizar estado de movimento
        this.updateMovementState(inputVector.length() > 0, isRunning);
        
        // Efeito sonoro de passos (simulado com console.log)
        this.updateFootsteps(deltaTime);
    }

    /**
     * Executa pulo
     */
    private jump(): void {
        this.velocity.y = this.movementConfig.jumpForce;
        this.isGrounded = false;
        this.currentState = MovementState.JUMPING;
        console.log('🦘 Pulo!');
    }

    /**
     * Atualiza o estado de movimento do jogador
     */
    private updateMovementState(_hasInput: boolean = false, isRunning: boolean = false): void {
        const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        
        if (!this.isGrounded) {
            if (this.velocity.y > 0) {
                this.currentState = MovementState.JUMPING;
            } else {
                this.currentState = MovementState.FALLING;
            }
        } else if (horizontalSpeed > 0.5) {
            if (isRunning && horizontalSpeed > this.movementConfig.walkSpeed * 0.8) {
                this.currentState = MovementState.RUNNING;
            } else {
                this.currentState = MovementState.WALKING;
            }
        } else {
            this.currentState = MovementState.IDLE;
        }
    }

    /**
     * Atualiza efeitos visuais baseados no movimento
     */
    private updateVisualEffects(deltaTime: number): void {
        // Bob da câmera baseado no movimento
        const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        
        if (this.isGrounded && horizontalSpeed > 0.5) {
            const bobSpeed = this.currentState === MovementState.RUNNING ? 10.0 : 6.0;
            const bobAmount = this.currentState === MovementState.RUNNING ? 0.15 : 0.08;
            
            this.bobIntensity = Math.sin(this.animationTime * bobSpeed) * bobAmount;
            this.targetCameraHeight = this.cameraConfig.maxHeight * 0.6 + this.bobIntensity;
        } else {
            this.bobIntensity = this.lerp(this.bobIntensity, 0, 5.0 * deltaTime);
            this.targetCameraHeight = this.cameraConfig.maxHeight * 0.6;
        }
        
        // Atualizar brilho do cristal baseado no estado
        if (this.staffCrystal.material instanceof StandardMaterial) {
            let intensity = 0.1;
            switch (this.currentState) {
                case MovementState.RUNNING:
                    intensity = 0.3;
                    break;
                case MovementState.JUMPING:
                case MovementState.FALLING:
                    intensity = 0.5;
                    break;
                case MovementState.WALKING:
                    intensity = 0.2;
                    break;
            }
            
            const crystalMaterial = this.staffCrystal.material as StandardMaterial;
            crystalMaterial.emissiveColor = new Color3(intensity * 0.3, intensity * 0.7, intensity);
        }
    }

    /**
     * Simula passos (poderia reproduzir sons)
     */
    private updateFootsteps(_deltaTime: number): void {
        const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        
        if (this.isGrounded && horizontalSpeed > 1.0) {
            const stepInterval = this.currentState === MovementState.RUNNING ? 0.3 : 0.5;
            
            if (this.animationTime - this.lastFootstepTime > stepInterval) {
                this.lastFootstepTime = this.animationTime;
                // Aquí se podría reproducir un sonido de paso
                // console.log('👣 Passo'); // Descomentado para não spammar o console
            }
        }
    }

    /**
     * Aplica limites do mapa
     */
    private applyMapBounds(): void {
        const pos = this.humanoidParts.root.position;
        let bounded = false;
        
        if (pos.x < this.mapBounds.minX) {
            pos.x = this.mapBounds.minX;
            this.velocity.x = 0;
            bounded = true;
        } else if (pos.x > this.mapBounds.maxX) {
            pos.x = this.mapBounds.maxX;
            this.velocity.x = 0;
            bounded = true;
        }
        
        if (pos.z < this.mapBounds.minZ) {
            pos.z = this.mapBounds.minZ;
            this.velocity.z = 0;
            bounded = true;
        } else if (pos.z > this.mapBounds.maxZ) {
            pos.z = this.mapBounds.maxZ;
            this.velocity.z = 0;
            bounded = true;
        }
        
        if (bounded) {
            console.log('🚧 Limite do mapa atingido!');
        }
    }

    /**
     * Regenera mana ao longo do tempo
     */
    private regenerateMana(deltaTime: number): void {
        if (this.currentMana < this.maxMana) {
            // Regeneração mais lenta quando correndo
            const regenRate = this.currentState === MovementState.RUNNING ? 
                this.manaRegenRate * 0.7 : this.manaRegenRate;
            
            this.currentMana = Math.min(
                this.maxMana, 
                this.currentMana + (regenRate * deltaTime)
            );
        }
    }

    /**
     * Função utilitária para interpolação linear
     */
    private lerp(start: number, end: number, factor: number): number {
        return start + (end - start) * Math.min(factor, 1);
    }

    /**
     * Interpola entre dois ângulos (para rotação suave)
     */
    private lerpAngle(current: number, target: number, speed: number): number {
        const diff = ((target - current + Math.PI) % (2 * Math.PI)) - Math.PI;
        return current + diff * Math.min(speed, 1);
    }

    /**
     * Atualiza a UI com informações melhoradas do jogador
     */
    private updateUI(): void {
        const manaDisplay = document.getElementById('manaDisplay');
        if (manaDisplay) {
            const current = Math.floor(this.currentMana);
            manaDisplay.textContent = `${current}/${this.maxMana}`;
            
            // Cor baseada na porcentagem e estado
            const percentage = this.currentMana / this.maxMana;
            let color = '#4a90e2'; // Azul normal
            
            if (this.currentState === MovementState.RUNNING) {
                color = '#f0ad4e'; // Laranja quando correndo
            } else if (percentage < 0.3) {
                color = '#d9534f'; // Vermelho quando baixa
            } else if (percentage < 0.6) {
                color = '#f0ad4e'; // Laranja quando média
            }
            
            manaDisplay.style.color = color;
        }
        
        // Mostrar estado atual (debug)
        const statusElement = document.getElementById('status');
        if (statusElement) {
            const stateDisplay = statusElement.querySelector('#currentState') || 
                (() => {
                    const div = document.createElement('div');
                    div.id = 'currentState';
                    statusElement.appendChild(div);
                    return div;
                })();
            
            let stateText = '';
            switch (this.currentState) {
                case MovementState.IDLE:
                    stateText = '🧍 Parado';
                    break;
                case MovementState.WALKING:
                    stateText = '🚶 Caminhando';
                    break;
                case MovementState.RUNNING:
                    stateText = '🏃 Correndo';
                    break;
                case MovementState.JUMPING:
                    stateText = '🦘 Pulando';
                    break;
                case MovementState.FALLING:
                    stateText = '🪂 Caindo';
                    break;
            }
            
            stateDisplay.innerHTML = `Estado: <span class="highlight">${stateText}</span>`;
        }
    }

    // === MÉTODOS PÚBLICOS PARA OUTROS SISTEMAS ===

    /**
     * Retorna a posição atual do jogador
     */
    public getPosition(): Vector3 {
        return this.humanoidParts.root.position.clone();
    }

    /**
     * Retorna a direção para onde o jogador está olhando
     */
    public getForwardDirection(): Vector3 {
        const rotation = this.humanoidParts.root.rotation.y;
        return new Vector3(Math.sin(rotation), 0, Math.cos(rotation));
    }

    /**
     * Retorna a direção da câmera (para onde o jogador está mirando)
     */
    public getCameraDirection(): Vector3 {
        return this.camera.getForwardRay().direction;
    }

    /**
     * Retorna a posição do cristal do cajado (de onde sairão as magias)
     */
    public getStaffTipPosition(): Vector3 {
        if (this.staffCrystal) {
            return this.staffCrystal.getAbsolutePosition();
        }
        return this.humanoidParts.root.position.add(new Vector3(0.8, 1.5, 0));
    }

    /**
     * Retorna a direção do cajado (baseada na câmera)
     */
    public getStaffDirection(): Vector3 {
        return this.getCameraDirection();
    }

    /**
     * Tenta gastar mana. Retorna true se tinha mana suficiente
     */
    public spendMana(amount: number): boolean {
        if (this.currentMana >= amount) {
            this.currentMana -= amount;
            return true;
        }
        return false;
    }

    /**
     * Retorna informações sobre mana atual
     */
    public getMana(): { current: number; max: number; percentage: number } {
        return {
            current: this.currentMana,
            max: this.maxMana,
            percentage: this.currentMana / this.maxMana
        };
    }

    /**
     * Retorna o estado atual de movimento
     */
    public getMovementState(): MovementState {
        return this.currentState;
    }

    /**
     * Reinicia o jogador para a posição inicial
     */
    public resetToStart(): void {
        console.log('🔄 Reiniciando jogador melhorado...');
        
        this.humanoidParts.root.position = new Vector3(0, this.groundLevel, 0);
        this.humanoidParts.root.rotation = Vector3.Zero();
        this.velocity = Vector3.Zero();
        this.currentState = MovementState.IDLE;
        this.isGrounded = true;
        
        this.currentMana = this.maxMana;
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;
        this.targetCameraDistance = 8.0;
        this.targetCameraHeight = 4.0;
        
        this.updateCameraPosition();
        
        console.log('✅ Jogador melhorado reiniciado!');
    }

    /**
     * Limpa recursos quando o jogo é fechado
     */
    public dispose(): void {
        console.log('🧹 Limpando recursos do jogador melhorado...');
        
        if (this.staff) {
            this.staff.dispose();
        }
        
        if (this.staffCrystal) {
            this.staffCrystal.dispose();
        }
        
        // Limpar materiais
        Object.values(this.materials).forEach(material => {
            material.dispose();
        });
        
        // Limpar partes do humanóide
        if (this.humanoidParts && this.humanoidParts.root) {
            this.humanoidParts.root.dispose();
        }
        
        if (this.camera) {
            this.camera.dispose();
        }
        
        console.log('✅ Jogador melhorado limpo!');
    }
}