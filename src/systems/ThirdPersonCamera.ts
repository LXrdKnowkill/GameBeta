/**
 * ThirdPersonCamera - Gerencia apenas a câmera em terceira pessoa
 * Princípio da Responsabilidade Única: APENAS lógica de câmera
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { InputManager } from './InputManager';

/**
 * Configurações da câmera
 */
export interface CameraConfig {
    minDistance: number;
    maxDistance: number;
    minHeight: number;
    maxHeight: number;
    sensitivity: number;
    smoothing: number;
    zoomSpeed: number;
    defaultDistance: number;
    defaultHeight: number;
}

/**
 * Dados atuais da câmera
 */
export interface CameraData {
    position: Vector3;
    target: Vector3;
    distance: number;
    height: number;
    forwardDirection: Vector3;
    rightDirection: Vector3;
}

/**
 * ThirdPersonCamera - Responsabilidade única: gerenciar câmera
 * NÃO processa input diretamente, recebe dados do InputManager
 * NÃO conhece movimento do jogador, apenas segue um alvo
 */
export class ThirdPersonCamera {
    private scene: Scene;
    private camera!: UniversalCamera;
    private inputManager: InputManager;
    private target: TransformNode | null = null;
    
    // Estado da câmera
    private cameraDistance: number = 8.0;
    private cameraHeight: number = 4.0;
    private targetCameraDistance: number = 8.0;
    private targetCameraHeight: number = 4.0;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private targetMouseX: number = 0;
    private targetMouseY: number = 0;
    
    // Configurações
    private config: CameraConfig = {
        minDistance: 3.0,
        maxDistance: 15.0,
        minHeight: 1.0,
        maxHeight: 8.0,
        sensitivity: 0.005,
        smoothing: 8.0,
        zoomSpeed: 2.0,
        defaultDistance: 8.0,
        defaultHeight: 4.0
    };

    constructor(scene: Scene, inputManager: InputManager, config?: Partial<CameraConfig>) {
        this.scene = scene;
        this.inputManager = inputManager;
        
        // Aplicar configurações customizadas
        if (config) {
            this.config = { ...this.config, ...config };
        }
        
        // Inicializar valores padrão
        this.cameraDistance = this.config.defaultDistance;
        this.targetCameraDistance = this.config.defaultDistance;
        this.cameraHeight = this.config.defaultHeight;
        this.targetCameraHeight = this.config.defaultHeight;
        
        this.createCamera();
        this.setupInputHandlers();
        
        console.log('📷 ThirdPersonCamera criada (responsabilidade única)');
    }

    /**
     * Cria a câmera
     */
    private createCamera(): void {
        this.camera = new UniversalCamera('thirdPersonCamera', Vector3.Zero(), this.scene);
        this.scene.activeCamera = this.camera;
    }

    /**
     * Configura handlers de input específicos para câmera
     */
    private setupInputHandlers(): void {
        // Escutar scroll para zoom
        this.inputManager.setEventCallback('onScrollChange', (delta: number) => {
            const zoomDelta = delta > 0 ? 1 : -1;
            this.targetCameraDistance = Math.max(
                this.config.minDistance, 
                Math.min(this.config.maxDistance, 
                    this.targetCameraDistance + zoomDelta * this.config.zoomSpeed)
            );
        });
    }

    /**
     * Define o alvo que a câmera deve seguir
     */
    public setTarget(target: TransformNode): void {
        this.target = target;
        this.updateCameraPosition(); // Atualizar posição imediatamente
    }

    /**
     * Atualiza a câmera a cada frame
     */
    public update(deltaTime: number): void {
        if (!this.target) return;
        
        this.processMouseInput();
        this.updateCameraPosition();
        this.smoothTransitions(deltaTime);
    }

    /**
     * Processa input do mouse para rotação da câmera
     */
    private processMouseInput(): void {
        const mouseDelta = this.inputManager.getMouseDelta();
        
        // Debug: Log mouse delta quando há movimento
        if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
            console.log('📹 Mouse delta:', mouseDelta, 'Pointer lock:', !!document.pointerLockElement);
            
            this.targetMouseX += mouseDelta.x * this.config.sensitivity;
            this.targetMouseY += mouseDelta.y * this.config.sensitivity;
            
            // Limitar rotação vertical
            this.targetMouseY = Math.max(-1.2, Math.min(1.2, this.targetMouseY));
            
            console.log('📹 Target mouse:', { x: this.targetMouseX, y: this.targetMouseY });
        }
    }

    /**
     * Atualiza posição da câmera baseada no alvo
     */
    private updateCameraPosition(): void {
        if (!this.target) return;
        
        // Calcular posição da câmera
        const offsetX = Math.sin(this.mouseX) * this.cameraDistance;
        const offsetZ = Math.cos(this.mouseX) * this.cameraDistance;
        const offsetY = this.cameraHeight + (Math.sin(this.mouseY) * 2);
        
        const targetPos = this.target.position;
        this.camera.position = new Vector3(
            targetPos.x + offsetX,
            targetPos.y + offsetY,
            targetPos.z + offsetZ
        );
        
        // Olhar para o alvo com offset para cima
        this.camera.setTarget(targetPos.add(new Vector3(0, 1, 0)));
    }

    /**
     * Aplica suavização nas transições
     */
    private smoothTransitions(deltaTime: number): void {
        const smoothingFactor = this.config.smoothing * deltaTime;
        
        // Suavizar rotação
        this.mouseX = this.lerp(this.mouseX, this.targetMouseX, smoothingFactor);
        this.mouseY = this.lerp(this.mouseY, this.targetMouseY, smoothingFactor);
        
        // Suavizar distância e altura
        this.cameraDistance = this.lerp(this.cameraDistance, this.targetCameraDistance, 5.0 * deltaTime);
        this.cameraHeight = this.lerp(this.cameraHeight, this.targetCameraHeight, 5.0 * deltaTime);
    }

    /**
     * Aplica efeito de bob na câmera (útil para feedback de movimento)
     */
    public applyBob(intensity: number): void {
        this.targetCameraHeight = this.config.defaultHeight + intensity;
    }

    /**
     * Reseta bob da câmera
     */
    public resetBob(): void {
        this.targetCameraHeight = this.config.defaultHeight;
    }

    /**
     * Aplica shake na câmera
     */
    public shake(duration: number, intensity: number): void {
        const startTime = performance.now();
        
        const shakeLoop = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / (duration * 1000);
            
            if (progress >= 1) {
                return; // Shake completo
            }
            
            // Aplicar offset aleatório
            const currentIntensity = intensity * (1 - progress);
            const offsetX = (Math.random() - 0.5) * currentIntensity;
            const offsetY = (Math.random() - 0.5) * currentIntensity;
            
            // Aplicar offset à posição da câmera
            if (this.camera && this.target) {
                const basePosition = this.calculateBasePosition();
                this.camera.position = basePosition.add(new Vector3(offsetX, offsetY, 0));
            }
            
            requestAnimationFrame(shakeLoop);
        };
        
        shakeLoop();
    }

    /**
     * Calcula posição base da câmera (sem shake)
     */
    private calculateBasePosition(): Vector3 {
        if (!this.target) return Vector3.Zero();
        
        const offsetX = Math.sin(this.mouseX) * this.cameraDistance;
        const offsetZ = Math.cos(this.mouseX) * this.cameraDistance;
        const offsetY = this.cameraHeight + (Math.sin(this.mouseY) * 2);
        
        const targetPos = this.target.position;
        return new Vector3(
            targetPos.x + offsetX,
            targetPos.y + offsetY,
            targetPos.z + offsetZ
        );
    }

    /**
     * Interpolação linear
     */
    private lerp(start: number, end: number, factor: number): number {
        return start + (end - start) * Math.min(factor, 1);
    }

    // === GETTERS PÚBLICOS ===

    /**
     * Retorna dados atuais da câmera
     */
    public getCameraData(): CameraData {
        const forwardRay = this.camera.getForwardRay();
        const forwardDir = forwardRay.direction.normalize();
        const rightDir = Vector3.Cross(forwardDir, Vector3.Up()).normalize();
        
        return {
            position: this.camera.position.clone(),
            target: this.target ? this.target.position.clone() : Vector3.Zero(),
            distance: this.cameraDistance,
            height: this.cameraHeight,
            forwardDirection: forwardDir,
            rightDirection: rightDir
        };
    }

    /**
     * Retorna direção para onde a câmera está olhando
     */
    public getForwardDirection(): Vector3 {
        return this.camera.getForwardRay().direction.normalize();
    }

    /**
     * Retorna direção direita da câmera
     */
    public getRightDirection(): Vector3 {
        const forward = this.getForwardDirection();
        return Vector3.Cross(forward, Vector3.Up()).normalize();
    }

    /**
     * Retorna a instância da câmera (para compatibilidade)
     */
    public getCamera(): UniversalCamera {
        return this.camera;
    }

    /**
     * Retorna posição atual da câmera
     */
    public getPosition(): Vector3 {
        return this.camera.position.clone();
    }

    // === CONFIGURAÇÃO ===

    /**
     * Atualiza configurações da câmera
     */
    public updateConfig(newConfig: Partial<CameraConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Aplicar limites às configurações atuais
        this.targetCameraDistance = Math.max(
            this.config.minDistance,
            Math.min(this.config.maxDistance, this.targetCameraDistance)
        );
        
        this.targetCameraHeight = Math.max(
            this.config.minHeight,
            Math.min(this.config.maxHeight, this.targetCameraHeight)
        );
    }

    /**
     * Define zoom da câmera
     */
    public setZoom(distance: number): void {
        this.targetCameraDistance = Math.max(
            this.config.minDistance,
            Math.min(this.config.maxDistance, distance)
        );
    }

    /**
     * Define altura da câmera
     */
    public setHeight(height: number): void {
        this.targetCameraHeight = Math.max(
            this.config.minHeight,
            Math.min(this.config.maxHeight, height)
        );
    }

    // === CONTROLE ===

    /**
     * Reseta câmera para configurações padrão
     */
    public reset(): void {
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;
        this.targetCameraDistance = this.config.defaultDistance;
        this.targetCameraHeight = this.config.defaultHeight;
        
        console.log('🔄 ThirdPersonCamera resetada');
    }

    /**
     * Anima transição suave para nova posição
     */
    public animateToPosition(targetRotationX: number, targetRotationY: number, duration: number = 1000): void {
        const startX = this.targetMouseX;
        const startY = this.targetMouseY;
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Usar easing suave
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.targetMouseX = startX + (targetRotationX - startX) * easeProgress;
            this.targetMouseY = startY + (targetRotationY - startY) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    /**
     * Limpa recursos da câmera
     */
    public dispose(): void {
        console.log('🧹 Limpando ThirdPersonCamera...');
        
        if (this.camera) {
            this.camera.dispose();
        }
        
        this.target = null;
        
        console.log('✅ ThirdPersonCamera limpa!');
    }
} 