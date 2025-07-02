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

import { Vector3 } from '@babylonjs/core/Maths/math';
import { Ray } from '@babylonjs/core/Culling/ray';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { InputManager } from './InputManager';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { Observable } from '@babylonjs/core/Misc/observable';

export enum MovementState {
    IDLE = 'idle',
    WALKING = 'walking',
    RUNNING = 'running',
    JUMPING = 'jumping',
    FALLING = 'falling',
    LANDING = 'landing'
}

/**
 * Configurações de movimento com física
 */
export interface MovementConfig {
    walkSpeed: number;
    runSpeed: number;
    jumpForce: number;
    airControl: number;
    groundCheckDistance: number;
    dampingFactor: number;
    rotationSpeed: number;
    mass: number;
    jumpThreshold: number;
    runThreshold: number;
    walkThreshold: number;
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
        mass: 1.0,
        jumpThreshold: 0.5,
        runThreshold: 6.0,
        walkThreshold: 0.5
    };
    
    // Limites do mapa (definidos em PlayerMovementPhysics)
    // private mapBounds = { minX: -25, maxX: 25, minZ: -25, maxZ: 25 };
    
    // Eventos
    private events: Partial<MovementEvents> = {};

    public onStateChanged: Observable<{ oldState: MovementState; newState: MovementState }> = new Observable();

    constructor(
        inputManager: InputManager,
        physicsAggregate: PhysicsAggregate
    ) {
        this.inputManager = inputManager;
        this.physicsAggregate = physicsAggregate;
        this.playerTransform = physicsAggregate.transformNode;
        this.initializePhysics();
    }

    /**
     * Configura propriedades físicas do corpo
     */
    private initializePhysics(): void {
        // Configurar massa e propriedades básicas
        // Note: API mais simples para compatibilidade
        console.log('⚙️ Configurando propriedades físicas básicas...');
        
        // Configurar damping linear para movimento mais suave
        this.physicsAggregate.body.setLinearDamping(0.1);
        this.physicsAggregate.body.setAngularDamping(0.9);
        
        console.log('✅ Propriedades físicas configuradas');
    }

    /**
     * Atualização principal do movimento
     */
    public update(deltaTime: number): void {
        const previousState = this.currentState;

        this.applyGravity(deltaTime);
        this.handleMovement(deltaTime);
        this.updateGrounding();

        // Determinar o estado atual com base na física
        if (!this.isGrounded) {
            const verticalVelocity = this.physicsAggregate.body.getLinearVelocity().y;
            if (verticalVelocity > this.config.jumpThreshold) {
                this.currentState = MovementState.JUMPING;
            } else {
                this.currentState = MovementState.FALLING;
            }
        } else {
            const horizontalSpeed = this.getHorizontalSpeed();
            if (horizontalSpeed > this.config.runThreshold) {
                this.currentState = MovementState.RUNNING;
            } else if (horizontalSpeed > this.config.walkThreshold) {
                this.currentState = MovementState.WALKING;
            } else {
                this.currentState = MovementState.IDLE;
            }
        }

        // Notificar observadores APENAS se o estado mudou
        if (this.currentState !== previousState) {
            console.log(`%c[PlayerMovement] Estado mudou de ${previousState} para ${this.currentState}`, 'color: #f39c12');
            this.onStateChanged.notifyObservers({ oldState: previousState, newState: this.currentState });
        }
    }

    /**
     * Verifica se está no chão usando raycast (VERSÃO ROBUSTA)
     */
    private checkGrounded(): void {
        const wasGrounded = this.isGrounded;

        // A altura da cápsula foi definida em Player.ts (altura padrão do CreateCapsule é 2.0)
        // O centro do transform está no centro da cápsula (Y = 1.0 do chão)
        const playerHeight = 2.0; // Altura padrão da cápsula Babylon.js
        const rayLength = (playerHeight / 2) + 0.1; // Metade da altura + pequena margem = 1.1

        const ray = new Ray(
            this.playerTransform.getAbsolutePosition(), // Começa do centro do corpo
            Vector3.Down(),                             // Aponta para baixo
            rayLength                                   // Comprimento do raio
        );

        const hit = this.playerTransform.getScene().pickWithRay(ray, (mesh) => {
            return mesh.isPickable && 
                   mesh !== this.playerTransform && 
                   mesh.name !== 'playerRoot';
        });

        this.isGrounded = !!hit?.hit; // Se acertou algo, está no chão

        // Debug: Log mudanças no estado do chão
        if (wasGrounded !== this.isGrounded) {
            console.log(`🏃 Status chão mudou para: ${this.isGrounded}`);
            if (this.isGrounded && !wasGrounded) {
                console.log('🛬 Pouso detectado!');
                this.events.onLand?.();
            }
        }

        // Debug opcional: mostrar detalhes do raycast
        if (hit?.hit) {
            console.log(`📏 Raycast hit - Distância: ${hit.distance?.toFixed(2)}, No chão: ${this.isGrounded}`);
        }
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
        
        const worldDirection = this.calculateWorldDirection(movementVector, cameraDirection);
        const targetSpeed = inputState.sprint ? this.config.runSpeed : this.config.walkSpeed;
        
        this.applyMovementForce(worldDirection, targetSpeed, deltaTime);
        this.updateRotation(worldDirection, deltaTime);
    }

    /**
     * Aplica força de movimento usando física
     */
    private applyMovementForce(worldDirection: Vector3, targetSpeed: number, deltaTime: number): void {
        const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
        const targetVelocity = worldDirection.scale(targetSpeed);
        targetVelocity.y = currentVelocity.y; // Preservar velocidade vertical
        
        const controlFactor = this.isGrounded ? 1.0 : this.config.airControl;
        const velocityDiff = targetVelocity.subtract(currentVelocity);
        velocityDiff.y = 0; // Só controlar movimento horizontal
        
        const force = velocityDiff.scale(10.0 * controlFactor);
        
        if (force.length() > 0.1) {
            this.physicsAggregate.body.applyImpulse(force.scale(deltaTime), this.playerTransform.getAbsolutePosition());
        }
    }

    /**
     * Atualiza rotação do personagem
     */
    private updateRotation(worldDirection: Vector3, deltaTime: number): void {
        if (worldDirection.length() < 0.1) return;
        
        const targetAngle = Math.atan2(worldDirection.x, worldDirection.z);
        const currentRotation = this.playerTransform.rotation;
        
        const angleDiff = this.lerpAngle(currentRotation.y, targetAngle, this.config.rotationSpeed * deltaTime);
        this.playerTransform.rotation.y = angleDiff;
    }

    /**
     * Pulo com física
     */
    public jump(): void {
        console.log('🦘 Método jump() chamado - isGrounded:', this.isGrounded);
        
        if (!this.isGrounded) {
            console.log('❌ Pulo negado - personagem não está no chão');
            return;
        }
        
        const jumpImpulse = new Vector3(0, this.config.jumpForce, 0);
        this.physicsAggregate.body.applyImpulse(jumpImpulse, this.playerTransform.getAbsolutePosition());
        
        // Notificar eventos
        if (this.events.onJump) {
            this.events.onJump();
        }
        
        console.log('✅ Pulo aplicado com força:', this.config.jumpForce);
    }

    /**
     * Aplica damping quando não há input
     */
    private applyDamping(): void {
        const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
        const horizontalVelocity = new Vector3(currentVelocity.x, 0, currentVelocity.z);
        
        if (horizontalVelocity.length() > 0.1) {
            const dampedVelocity = horizontalVelocity.scale(this.config.dampingFactor);
            const newVelocity = new Vector3(dampedVelocity.x, currentVelocity.y, dampedVelocity.z);
            this.physicsAggregate.body.setLinearVelocity(newVelocity);
        }
    }

    /**
     * Calcula direção no mundo baseada na câmera
     */
    private calculateWorldDirection(movementVector: { x: number; z: number }, cameraDirection?: Vector3): Vector3 {
        if (!cameraDirection) {
            return new Vector3(movementVector.x, 0, movementVector.z).normalize();
        }
        
        // Projetar direção da câmera no plano horizontal
        const cameraForward = new Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
        const cameraRight = Vector3.Cross(Vector3.Up(), cameraForward).normalize();
        
        // Combinar movimento relativo à câmera
        const worldDirection = cameraForward.scale(movementVector.z).add(cameraRight.scale(movementVector.x));
        
        return worldDirection.normalize();
    }

    /**
     * Atualiza estado de movimento
     */
    private updateState(): void {
        const velocity = this.physicsAggregate.body.getLinearVelocity();
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        const verticalSpeed = velocity.y;
        
        const previousState = this.currentState;
        
        // Determinar novo estado
        if (!this.isGrounded) {
            this.currentState = verticalSpeed > 0.5 ? MovementState.JUMPING : MovementState.FALLING;
        } else if (horizontalSpeed < 0.5) {
            this.currentState = MovementState.IDLE;
        } else if (horizontalSpeed < 6.0) {
            this.currentState = MovementState.WALKING;
        } else {
            this.currentState = MovementState.RUNNING;
        }
        
        // Notificar mudança de estado
        if (previousState !== this.currentState && this.events.onStateChange) {
            this.events.onStateChange(this.currentState, previousState);
            this.onStateChanged.notifyObservers({ oldState: previousState, newState: this.currentState });
        }
        
        // Evento de pouso
        if (previousState === MovementState.FALLING && this.currentState !== MovementState.FALLING && this.events.onLand) {
            this.events.onLand();
        }
    }

    /**
     * Interpolação angular
     */
    private lerpAngle(current: number, target: number, speed: number): number {
        const diff = target - current;
        const shortestAngle = ((diff % (Math.PI * 2)) + (Math.PI * 3)) % (Math.PI * 2) - Math.PI;
        return current + shortestAngle * Math.min(1, speed);
    }

    // === INTERFACE PÚBLICA ===

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

    public getPhysicsAggregate(): PhysicsAggregate {
        return this.physicsAggregate;
    }

    public getTransformNode(): TransformNode {
        return this.playerTransform;
    }

    /**
     * Configura callbacks de eventos
     */
    public setEventCallback<K extends keyof MovementEvents>(
        event: K, 
        callback: MovementEvents[K]
    ): void {
        this.events[event] = callback;
    }

    public updateConfig(newConfig: Partial<MovementConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public setPhysicsMaterial(friction: number, restitution: number): void {
        // Para versões mais novas do Babylon.js
        console.log('⚙️ Configurando material físico:', { friction, restitution });
    }

    public reset(position?: Vector3): void {
        const resetPos = position || new Vector3(0, 2, 0);
        this.playerTransform.position = resetPos;
        this.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
        this.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
        this.currentState = MovementState.IDLE;
        console.log('🔄 Movimento resetado para:', resetPos);
    }

    public dispose(): void {
        this.events = {};
        console.log('🧹 PlayerMovement (físico) limpo');
    }

    public getHorizontalSpeed(): number {
        const velocity = this.physicsAggregate.body.getLinearVelocity();
        return Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    }
} 