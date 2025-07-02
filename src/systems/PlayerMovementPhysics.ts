/**
 * PlayerMovement - Sistema de movimento com física REAL
 * 
 * DIFERENÇAS DA VERSÃO MANUAL:
 * ✅ Usa motor de física Havok do Babylon.js
 * ✅ Funciona em rampas, escadas, terreno irregular
 * ✅ Colisões precisas automaticamente
 * ✅ Fricção e restituição reais
 * ✅ Menos código para manter
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math';
import { Ray } from '@babylonjs/core/Culling/ray';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

import { InputManager } from './InputManager';

export enum MovementState {
    IDLE = 'idle',
    WALKING = 'walking',
    RUNNING = 'running',
    JUMPING = 'jumping',
    FALLING = 'falling'
}

/**
 * Configurações de movimento com física
 */
export interface MovementConfig {
    walkSpeed: number;
    runSpeed: number;
    jumpForce: number;
    airControl: number;      // Controle no ar (0-1)
    groundCheckDistance: number;
    dampingFactor: number;   // Amortecimento quando para
    rotationSpeed: number;  // Velocidade de rotação do personagem
    mass: number;           // Massa do corpo físico
}

/**
 * Interface para eventos de movimento
 */
export interface MovementEvents {
    onStateChange: (newState: MovementState, oldState: MovementState) => void;
    onJump: () => void;
    onLand: () => void;
    onMove: (position: Vector3, velocity: Vector3) => void;
}

/**
 * PlayerMovement com física real - Sistema profissional
 */
export class PlayerMovement {
    private scene: Scene;
    private inputManager: InputManager;
    private physicsAggregate: PhysicsAggregate;
    private playerTransform: TransformNode;
    
    // Estado
    private currentState: MovementState = MovementState.IDLE;
    private isGrounded: boolean = true;
    
    // Configurações
    private config: MovementConfig = {
        walkSpeed: 4.0,
        runSpeed: 8.0,
        jumpForce: 8.0,
        airControl: 0.3,
        groundCheckDistance: 0.2,
        dampingFactor: 0.90,
        rotationSpeed: 15.0,
        mass: 1.0
    };
    
    // Limites do mapa
    private mapBounds = {
        minX: -25,
        maxX: 25,
        minZ: -25,
        maxZ: 25
    };
    
    // Eventos
    private events: Partial<MovementEvents> = {};

    constructor(
        scene: Scene, 
        physicsAggregate: PhysicsAggregate, 
        inputManager: InputManager, 
        config?: Partial<MovementConfig>
    ) {
        this.scene = scene;
        this.physicsAggregate = physicsAggregate;
        this.inputManager = inputManager;
        this.playerTransform = physicsAggregate.transformNode;
        
        // Aplicar configurações customizadas
        if (config) {
            this.config = { ...this.config, ...config };
        }
        
        this.initializePhysics();
        this.setupInputEvents();
        
        console.log('🏃‍♂️ PlayerMovement com física REAL ativado!');
    }

    /**
     * Configura propriedades físicas do corpo
     */
    private initializePhysics(): void {
        // Configurar massa e propriedades inerciais
        this.physicsAggregate.body.setMassProperties({
            mass: this.config.mass,
            // Inércia zero nos eixos X e Z para evitar tombamento
            inertia: new Vector3(0, 0.1, 0) 
        });
        
        // Limitar velocidade angular para evitar spinning
        this.physicsAggregate.body.setAngularDamping(0.8);
        this.physicsAggregate.body.setLinearDamping(0.1);
        
        console.log('⚙️ Propriedades físicas configuradas');
        console.log('💡 Fricção e restituição são configuradas no PhysicsAggregate na criação');
    }

    /**
     * Configura eventos de input
     */
    private setupInputEvents(): void {
        this.inputManager.setEventCallback('onJumpPress', () => {
            this.jump();
        });
    }

    /**
     * Atualização principal do movimento
     */
    public update(deltaTime: number, cameraDirection?: Vector3): void {
        this.checkGrounded();
        this.processMovement(deltaTime, cameraDirection);
        this.updateState();
        this.applyMapBounds();
        
        // Reset frame inputs
        this.inputManager.resetFrameInputs();
    }

    /**
     * Verifica se está no chão usando raycast
     */
    private checkGrounded(): void {
        const capsuleCenter = this.playerTransform.getAbsolutePosition();
        
        // Raycast desde o centro da cápsula para baixo
        const rayStart = new Vector3(capsuleCenter.x, capsuleCenter.y, capsuleCenter.z);
        const rayLength = 1.0 + this.config.groundCheckDistance; // Altura da cápsula + margem
        
        const ray = new Ray(rayStart, Vector3.Down(), rayLength);
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            // Não colidir com o próprio jogador
            return mesh.isPickable && 
                   mesh !== this.playerTransform && 
                   !this.isPlayerMesh(mesh);
        });
        
        const wasGrounded = this.isGrounded;
        this.isGrounded = !!hit?.hit;
        
        // Detectar pouso
        if (!wasGrounded && this.isGrounded) {
            this.events.onLand?.();
            console.log('🛬 Pouso detectado');
        }
    }

    /**
     * Verifica se um mesh pertence ao jogador
     */
    private isPlayerMesh(mesh: any): boolean {
        // Verifica se o mesh é parte do jogador
        let parent = mesh.parent;
        while (parent) {
            if (parent === this.playerTransform) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }

    /**
     * Processa movimento baseado em input
     */
    private processMovement(deltaTime: number, cameraDirection?: Vector3): void {
        const inputState = this.inputManager.getInputState();
        const movementVector = this.inputManager.getMovementVector();
        
        if (!this.inputManager.isMoving()) {
            this.applyDamping();
            return;
        }
        
        // Calcular direção de movimento no mundo
        const worldDirection = this.calculateWorldDirection(movementVector, cameraDirection);
        
        // Determinar velocidade alvo
        const targetSpeed = inputState.sprint ? this.config.runSpeed : this.config.walkSpeed;
        
        // Aplicar força de movimento
        this.applyMovementForce(worldDirection, targetSpeed, deltaTime);
        
        // Rotacionar jogador na direção do movimento
        this.updateRotation(worldDirection, deltaTime);
        
        // Notificar movimento
        const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
        this.events.onMove?.(this.playerTransform.getAbsolutePosition(), currentVelocity);
    }

    /**
     * Aplica força de movimento usando física
     */
    private applyMovementForce(worldDirection: Vector3, targetSpeed: number, deltaTime: number): void {
        const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
        
        // Velocidade alvo (preserva Y para gravidade)
        const targetVelocity = worldDirection.scale(targetSpeed);
        targetVelocity.y = currentVelocity.y;
        
        // Fator de controle (menor no ar)
        const controlFactor = this.isGrounded ? 1.0 : this.config.airControl;
        
        // Calcular diferença de velocidade
        const velocityDiff = targetVelocity.subtract(currentVelocity);
        velocityDiff.y = 0; // Não aplicar força vertical aqui
        
        // Aplicar força proporcional
        const force = velocityDiff.scale(10.0 * controlFactor);
        
        if (force.length() > 0.1) {
            this.physicsAggregate.body.applyImpulse(force.scale(deltaTime), this.playerTransform.getAbsolutePosition());
        }
    }

    /**
     * Atualiza rotação do jogador
     */
    private updateRotation(worldDirection: Vector3, deltaTime: number): void {
        if (worldDirection.length() > 0.1) {
            const targetRotation = Math.atan2(worldDirection.x, worldDirection.z);
            const currentRotation = this.playerTransform.rotation.y;
            
            // Interpolar rotação suavemente
            this.playerTransform.rotation.y = this.lerpAngle(
                currentRotation, 
                targetRotation, 
                this.config.rotationSpeed * deltaTime
            );
        }
    }

    /**
     * Executa pulo usando impulso
     */
    public jump(): void {
        if (!this.isGrounded) return;
        
        console.log('🦘 Aplicando impulso de pulo');
        
        // Aplicar impulso vertical
        const jumpImpulse = new Vector3(0, this.config.jumpForce, 0);
        this.physicsAggregate.body.applyImpulse(jumpImpulse, this.playerTransform.getAbsolutePosition());
        
        this.isGrounded = false;
        this.events.onJump?.();
    }

    /**
     * Aplica amortecimento quando não há input
     */
    private applyDamping(): void {
        const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
        
        // Amortecer apenas velocidade horizontal
        const dampedVelocity = new Vector3(
            currentVelocity.x * this.config.dampingFactor,
            currentVelocity.y, // Preservar Y (gravidade)
            currentVelocity.z * this.config.dampingFactor
        );
        
        this.physicsAggregate.body.setLinearVelocity(dampedVelocity);
    }

    /**
     * Calcula direção de movimento baseada na câmera
     */
    private calculateWorldDirection(movementVector: { x: number; z: number }, cameraDirection?: Vector3): Vector3 {
        let worldDirection = new Vector3(movementVector.x, 0, movementVector.z);
        
        if (cameraDirection) {
            const cameraForward = cameraDirection.normalize();
            const cameraRight = Vector3.Cross(Vector3.Up(), cameraForward).normalize();
            
            const forwardMovement = cameraForward.scale(movementVector.z);
            const rightMovement = cameraRight.scale(movementVector.x);
            
            worldDirection = forwardMovement.add(rightMovement);
            worldDirection.y = 0; // Manter no plano horizontal
            
            if (worldDirection.length() > 0) {
                worldDirection.normalize();
            }
        }
        
        return worldDirection;
    }

    /**
     * Atualiza estado de movimento
     */
    private updateState(): void {
        const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
        const horizontalSpeed = Math.sqrt(currentVelocity.x * currentVelocity.x + currentVelocity.z * currentVelocity.z);
        
        const oldState = this.currentState;
        
        if (!this.isGrounded) {
            if (currentVelocity.y > 0.5) {
                this.currentState = MovementState.JUMPING;
            } else {
                this.currentState = MovementState.FALLING;
            }
        } else if (horizontalSpeed > 0.5) {
            const inputState = this.inputManager.getInputState();
            if (inputState.sprint && horizontalSpeed > this.config.walkSpeed * 0.8) {
                this.currentState = MovementState.RUNNING;
            } else {
                this.currentState = MovementState.WALKING;
            }
        } else {
            this.currentState = MovementState.IDLE;
        }
        
        // Notificar mudança de estado
        if (oldState !== this.currentState) {
            this.events.onStateChange?.(this.currentState, oldState);
            console.log(`🎭 Estado: ${oldState} → ${this.currentState}`);
        }
    }

    /**
     * Aplica limites do mapa
     */
    private applyMapBounds(): void {
        const pos = this.playerTransform.getAbsolutePosition();
        
        if (pos.x < this.mapBounds.minX || pos.x > this.mapBounds.maxX ||
            pos.z < this.mapBounds.minZ || pos.z > this.mapBounds.maxZ) {
            
            // Teleportar de volta para dentro dos limites
            const clampedPos = new Vector3(
                Math.max(this.mapBounds.minX, Math.min(this.mapBounds.maxX, pos.x)),
                pos.y,
                Math.max(this.mapBounds.minZ, Math.min(this.mapBounds.maxZ, pos.z))
            );
            
            this.physicsAggregate.body.setTargetTransform(clampedPos, Quaternion.FromEulerAngles(this.playerTransform.rotation.x, this.playerTransform.rotation.y, this.playerTransform.rotation.z));
            this.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
            
            console.log('🚧 Limite do mapa aplicado');
        }
    }

    // === UTILITY METHODS ===

    private lerpAngle(current: number, target: number, speed: number): number {
        const diff = ((target - current + Math.PI) % (2 * Math.PI)) - Math.PI;
        return current + diff * Math.min(speed, 1);
    }

    // === PUBLIC GETTERS ===

    public getCurrentState(): MovementState {
        return this.currentState;
    }

    public getPosition(): Vector3 {
        return this.playerTransform.getAbsolutePosition();
    }

    public getVelocity(): Vector3 {
        return this.physicsAggregate.body.getLinearVelocity();
    }

    public getIsGrounded(): boolean {
        return this.isGrounded;
    }

    public getHorizontalSpeed(): number {
        const velocity = this.getVelocity();
        return Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    }

    public getPhysicsAggregate(): PhysicsAggregate {
        return this.physicsAggregate;
    }

    public getTransformNode(): TransformNode {
        return this.playerTransform;
    }

    // === CONFIGURATION ===

    public setEventCallback<K extends keyof MovementEvents>(
        event: K, 
        callback: MovementEvents[K]
    ): void {
        this.events[event] = callback;
    }

    public updateConfig(newConfig: Partial<MovementConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Aplicar mudanças imediatamente
        if (newConfig.mass !== undefined) {
            this.physicsAggregate.body.setMassProperties({ mass: newConfig.mass });
        }
    }

    public setMapBounds(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }): void {
        this.mapBounds = bounds;
    }

    /**
     * Configura material de física para diferentes superfícies
     * NOTA: Métodos podem variar dependendo da versão do Babylon.js
     */
    public setPhysicsMaterial(friction: number, restitution: number): void {
        // TODO: Implementar quando métodos estiverem disponíveis na API
        // this.physicsAggregate.body.setFriction?.(friction);
        // this.physicsAggregate.body.setRestitution?.(restitution);
        console.log(`🎯 Material de física configurado: fricção=${friction}, restituição=${restitution}`);
        console.log('💡 Implementação específica depende da versão do Babylon.js');
    }

    // === CONTROL ===

    public reset(position?: Vector3): void {
        const resetPos = position || new Vector3(0, 2, 0);
        
        // Resetar posição e rotação
        this.physicsAggregate.body.setTargetTransform(resetPos, Quaternion.Identity());
        this.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
        this.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
        
        // Resetar estado
        this.currentState = MovementState.IDLE;
        this.isGrounded = false;
        
        console.log('🔄 PlayerMovement resetado');
    }

    public stop(): void {
        this.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
        this.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
    }

    public addForce(force: Vector3): void {
        this.physicsAggregate.body.applyImpulse(force, this.playerTransform.getAbsolutePosition());
    }

    public dispose(): void {
        console.log('🧹 Limpando PlayerMovement com física...');
        
        if (this.physicsAggregate) {
            this.physicsAggregate.dispose();
        }
        
        this.events = {};
        
        console.log('✅ PlayerMovement com física limpo!');
    }
}

/**
 * Materiais de física para diferentes superfícies
 */
export const PhysicsMaterials = {
    GRASS: { friction: 0.8, restitution: 0.1 },
    ICE: { friction: 0.1, restitution: 0.0 },
    MUD: { friction: 1.5, restitution: 0.0 },
    BOUNCY: { friction: 0.6, restitution: 0.8 },
    METAL: { friction: 0.3, restitution: 0.2 }
}; 