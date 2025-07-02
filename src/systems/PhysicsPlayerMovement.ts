/**
 * PhysicsPlayerMovement - EXEMPLO de como seria com física real
 * 
 * DIFERENÇA PRINCIPAL:
 * - Código atual: Colisão manual só funciona em chão plano
 * - Este exemplo: Usa motor de física do Babylon.js (Havok)
 * 
 * VANTAGENS DA FÍSICA REAL:
 * ✅ Funciona em rampas, escadas, terreno irregular
 * ✅ Colisões precisas automaticamente
 * ✅ Fricção e restituição reais
 * ✅ Menos código para manter
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
// Physics imports would be:
// import { PhysicsAggregate } from '@babylonjs/core/Physics/physicsAggregate';
// import { PhysicsShapeType } from '@babylonjs/core/Physics/physicsEngineComponent';
// import { HavokPlugin } from '@babylonjs/core/Physics/Plugins/havokPlugin';

import { InputManager } from './InputManager';

export enum MovementState {
    IDLE = 'idle',
    WALKING = 'walking',
    RUNNING = 'running',
    JUMPING = 'jumping',
    FALLING = 'falling'
}

/**
 * EXEMPLO: PlayerMovement com física real
 * 
 * Em um projeto profissional, isso substituiria nossa física manual
 */
export class PhysicsPlayerMovement {
    private inputManager: InputManager;
    private playerMesh: Mesh;
    // private physicsAggregate: PhysicsAggregate; // Would be used with real physics
    
    // Estado
    private currentState: MovementState = MovementState.IDLE;
    private isGrounded: boolean = true;
    // private groundCheckDistance: number = 1.1; // Would be used for ground checking
    
    // Configurações
    private config = {
        walkSpeed: 4.0,
        runSpeed: 8.0,
        jumpForce: 12.0,
        friction: 0.8,
        mass: 1.0,
        airControl: 0.3
    };

    constructor(_scene: Scene, playerMesh: Mesh, inputManager: InputManager) {
        // _scene parameter kept for compatibility but not stored
        this.playerMesh = playerMesh;
        this.inputManager = inputManager;
        
        console.log('🎯 PhysicsPlayerMovement criado (demo - física real)');
        // this.initializePhysics(); // Would initialize real physics
    }

    /**
     * UPDATE COM FÍSICA REAL
     * 
     * MUITO MAIS SIMPLES que nossa implementação manual
     */
    public update(_deltaTime: number, _cameraDirection?: Vector3): void {
        this.checkGrounded();
        this.processMovement(_cameraDirection);
        this.updateState();
    }

    /**
     * VERIFICAR SE ESTÁ NO CHÃO
     * 
     * Com física real: Usar raycast
     * Sem física: Nossa verificação manual atual
     */
    private checkGrounded(): void {
        // EM UM PROJETO REAL:
        /*
        const ray = new Ray(
            this.playerMesh.position,
            Vector3.Down(),
            this.groundCheckDistance
        );
        
        const hit = this.scene.pickWithRay(ray);
        this.isGrounded = hit?.hit && hit.distance <= this.groundCheckDistance;
        */
        
        // SIMULAÇÃO para esta demo:
        this.isGrounded = this.playerMesh.position.y <= 1.1;
    }

    /**
     * PROCESSAR MOVIMENTO COM FÍSICA
     * 
     * Aplica FORÇAS ao invés de mudar posição diretamente
     */
    private processMovement(cameraDirection?: Vector3): void {
        const movementVector = this.inputManager.getMovementVector();
        
        if (!this.inputManager.isMoving()) {
            this.applyDamping();
            return;
        }
        
        // Calcular direção de movimento
        let worldDirection = this.calculateWorldDirection(movementVector, cameraDirection);
        
        // Determinar velocidade alvo
        const inputState = this.inputManager.getInputState();
        const targetSpeed = inputState.sprint ? this.config.runSpeed : this.config.walkSpeed;
        
        // EM UM PROJETO REAL COM FÍSICA:
        /*
        const body = this.physicsAggregate.body;
        const currentVelocity = body.getLinearVelocity();
        
        // Aplicar força horizontal (mantém velocidade Y da gravidade)
        const targetVelocity = worldDirection.scale(targetSpeed);
        targetVelocity.y = currentVelocity.y; // Preservar velocidade vertical
        
        const force = targetVelocity.subtract(currentVelocity).scale(10); // Força proporcional
        force.y = 0; // Não aplicar força vertical aqui
        
        // Reduzir controle no ar
        if (!this.isGrounded) {
            force.scaleInPlace(this.config.airControl);
        }
        
        body.applyImpulse(force, this.playerMesh.position);
        
        // Rotacionar personagem na direção do movimento
        if (worldDirection.length() > 0.1) {
            const targetRotation = Math.atan2(worldDirection.x, worldDirection.z);
            const currentRotation = this.playerMesh.rotation.y;
            const rotationDiff = this._shortestAngleDifference(currentRotation, targetRotation);
            
            body.setAngularVelocity(new Vector3(0, rotationDiff * 5, 0));
        }
        */
        
        // Para esta demo, usar nossa implementação atual:
        this.simulatePhysicsMovement(worldDirection, targetSpeed);
    }

    /**
     * PULO COM FÍSICA REAL
     * 
     * Aplica impulso vertical
     */
    public jump(): void {
        if (!this.isGrounded) return;
        
        // EM UM PROJETO REAL:
        /*
        const jumpImpulse = new Vector3(0, this.config.jumpForce, 0);
        this.physicsAggregate.body.applyImpulse(jumpImpulse, this.playerMesh.position);
        */
        
        // Simulação:
        console.log('🦘 Pulo com física aplicado!');
    }

    /**
     * APLICAR AMORTECIMENTO (damping)
     * 
     * Reduz velocidade gradualmente quando não há input
     */
    private applyDamping(): void {
        // EM UM PROJETO REAL:
        /*
        const body = this.physicsAggregate.body;
        const velocity = body.getLinearVelocity();
        
        const dampingFactor = this.isGrounded ? this.config.groundDamping : this.config.airDamping;
        
        // Aplicar damping apenas horizontalmente
        velocity.x *= dampingFactor;
        velocity.z *= dampingFactor;
        // Manter velocity.y (gravidade)
        
        body.setLinearVelocity(velocity);
        */
    }

    /**
     * CALCULAR DIREÇÃO NO MUNDO
     * 
     * Baseado na direção da câmera (igual ao código atual)
     */
    private calculateWorldDirection(movementVector: { x: number; z: number }, cameraDirection?: Vector3): Vector3 {
        let worldDirection = new Vector3(movementVector.x, 0, movementVector.z);
        
        if (cameraDirection) {
            const cameraForward = cameraDirection.normalize();
            const cameraRight = Vector3.Cross(cameraForward, Vector3.Up()).normalize();
            
            const forwardMovement = cameraForward.scale(movementVector.z);
            const rightMovement = cameraRight.scale(movementVector.x);
            
            worldDirection = forwardMovement.add(rightMovement);
            worldDirection.y = 0;
            
            if (worldDirection.length() > 0) {
                worldDirection.normalize();
            }
        }
        
        return worldDirection;
    }

    /**
     * SIMULAÇÃO para esta demo (já que não temos física real)
     */
    private simulatePhysicsMovement(direction: Vector3, speed: number): void {
        // Simular o que a física faria
        const movement = direction.scale(speed * 0.016); // Aproximar 60 FPS
        this.playerMesh.position.addInPlace(movement);
        
        // Simular rotação
        if (direction.length() > 0.1) {
            const targetRotation = Math.atan2(direction.x, direction.z);
            this.playerMesh.rotation.y = this.lerp(this.playerMesh.rotation.y, targetRotation, 0.1);
        }
    }

    /**
     * COMPARAÇÃO: FÍSICA MANUAL vs FÍSICA REAL
     */
    private updateState(): void {
        // O código atual já faz isso bem
        // A física real não mudaria esta lógica
    }

    // === UTILITIES ===

    private lerp(start: number, end: number, factor: number): number {
        return start + (end - start) * factor;
    }

    // === GETTERS (iguais ao código atual) ===

    public getCurrentState(): MovementState {
        return this.currentState;
    }

    public getPosition(): Vector3 {
        return this.playerMesh.position.clone();
    }

    public getIsGrounded(): boolean {
        return this.isGrounded;
    }

    // === CONFIGURAÇÃO ===

    /**
     * CONFIGURAR MATERIAL DE FÍSICA
     * 
     * Útil para diferentes superfícies (gelo, lama, etc.)
     */
    public setPhysicsMaterial(friction: number, restitution: number): void {
        // EM UM PROJETO REAL:
        /*
        if (this.physicsAggregate) {
            this.physicsAggregate.body.setFriction(friction);
            this.physicsAggregate.body.setRestitution(restitution);
        }
        */
        
        console.log(`🎯 Material de física: fricção=${friction}, restituição=${restitution}`);
    }

    /**
     * LIMPAR RECURSOS
     */
    public dispose(): void {
        // EM UM PROJETO REAL:
        /*
        if (this.physicsAggregate) {
            this.physicsAggregate.dispose();
        }
        */
        
        console.log('🧹 PhysicsPlayerMovement limpo');
    }
}

/**
 * CONFIGURAÇÃO DE FÍSICA PARA DIFERENTES SUPERFÍCIES
 * 
 * Em um jogo real, você criaria diferentes materiais:
 */
export const PhysicsMaterials = {
    // Grama normal
    GRASS: { friction: 0.8, restitution: 0.1 },
    
    // Gelo escorregadio
    ICE: { friction: 0.1, restitution: 0.0 },
    
    // Lama que desacelera
    MUD: { friction: 1.5, restitution: 0.0 },
    
    // Trampolim
    BOUNCY: { friction: 0.6, restitution: 0.8 },
    
    // Metal
    METAL: { friction: 0.3, restitution: 0.2 }
};

/**
 * EXEMPLO DE USO EM UM JOGO REAL:
 * 
 * ```typescript
 * // Inicializar física do jogo
 * const physicsMovement = new PhysicsPlayerMovement(scene, playerMesh, inputManager);
 * 
 * // Quando jogador pisa no gelo:
 * physicsMovement.setPhysicsMaterial(
 *     PhysicsMaterials.ICE.friction, 
 *     PhysicsMaterials.ICE.restitution
 * );
 * 
 * // Quando jogador pisa na grama:
 * physicsMovement.setPhysicsMaterial(
 *     PhysicsMaterials.GRASS.friction, 
 *     PhysicsMaterials.GRASS.restitution
 * );
 * ```
 * 
 * RESULTADO:
 * ✅ Jogador escorrega no gelo automaticamente
 * ✅ Anda normalmente na grama
 * ✅ Afunda na lama
 * ✅ Pula alto em trampolins
 * ✅ Tudo sem código adicional!
 */

/**
 * SETUP COMPLETO DE FÍSICA PARA BABYLON.JS
 * 
 * Para usar em um projeto real:
 * 
 * 1. INSTALAR:
 * ```bash
 * npm install @babylonjs/havok
 * ```
 * 
 * 2. CONFIGURAR NO GAME SCENE:
 * ```typescript
 * import HavokPhysics from '@babylonjs/havok';
 * import { HavokPlugin } from '@babylonjs/core/Physics/Plugins/havokPlugin';
 * 
 * async initPhysics() {
 *     const havokInstance = await HavokPhysics();
 *     const physicsPlugin = new HavokPlugin(true, havokInstance);
 *     this.scene.enablePhysics(new Vector3(0, -9.81, 0), physicsPlugin);
 * }
 * ```
 * 
 * 3. CRIAR CHÃO COM FÍSICA:
 * ```typescript
 * const ground = MeshBuilder.CreateGround('ground', {width: 50, height: 50});
 * new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }); // mass: 0 = estático
 * ```
 * 
 * 4. USAR ESTE PLAYER MOVEMENT:
 * ```typescript
 * const movement = new PhysicsPlayerMovement(scene, playerMesh, inputManager);
 * ```
 * 
 * VANTAGENS IMEDIATAS:
 * ✅ Andar em rampas funciona
 * ✅ Colisão com paredes
 * ✅ Física realista
 * ✅ Performance otimizada
 * ✅ Menos bugs
 */ 