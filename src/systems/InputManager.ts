/**
 * InputManager - Gerencia apenas captura de input
 * Princípio da Responsabilidade Única: APENAS input, não sabe o que fazer com ele
 */

/**
 * Estado atual dos inputs
 */
export interface InputState {
    // Movimento
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    
    // Ações
    sprint: boolean;
    jump: boolean;
    
    // Mouse
    mouseMovement: { x: number; y: number };
    scroll: number;
    
    // Cliques
    primaryClick: boolean;
    primaryHold: boolean;
    
    // Sistema
    pause: boolean;
}

/**
 * Eventos de input que podem ser observados
 */
export interface InputEvents {
    onPrimaryClickStart: () => void;
    onPrimaryClickEnd: () => void;
    onJumpPress: () => void;
    onPausePress: () => void;
    onScrollChange: (delta: number) => void;
}

/**
 * InputManager - Responsabilidade única: capturar input e disponibilizar para outros sistemas
 * NÃO sabe o que fazer com o input, apenas o captura e expõe
 */
import { Scene } from '@babylonjs/core/scene';
export class InputManager {
    private canvas: HTMLCanvasElement;
    private isActive: boolean = true;
    
    // Estado atual dos inputs
    private inputState: InputState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        jump: false,
        mouseMovement: { x: 0, y: 0 },
        scroll: 0,
        primaryClick: false,
        primaryHold: false,
        pause: false
    };
    
    // Event listeners para cleanup
    private eventListeners: Array<{ element: any; event: string; listener: any }> = [];
    
    // Callbacks para eventos específicos
    private events: Partial<InputEvents> = {};

    constructor(_scene: Scene, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.setupEventListeners();
        console.log('🎮 InputManager iniciado (responsabilidade única)');
    }

    /**
     * Configura todos os event listeners
     */
    private setupEventListeners(): void {
        // === TECLADO ===
        const keydownListener = (event: KeyboardEvent) => {
            if (!this.isActive) return;
            
            const key = event.code.toLowerCase();
            
            switch (key) {
                case 'keyw':
                case 'arrowup':
                    this.inputState.forward = true;
                    break;
                case 'keys':
                case 'arrowdown':
                    this.inputState.backward = true;
                    break;
                case 'keya':
                case 'arrowleft':
                    this.inputState.left = true;
                    break;
                case 'keyd':
                case 'arrowright':
                    this.inputState.right = true;
                    break;
                case 'shiftleft':
                case 'shiftright':
                    this.inputState.sprint = true;
                    break;
                case 'space':
                    if (!this.inputState.jump) { // Evitar repeat
                        this.inputState.jump = true;
                        console.log('🦘 Input: ESPAÇO pressionado - tentando pular');
                        this.events.onJumpPress?.();
                    }
                    event.preventDefault();
                    break;
                case 'escape':
                    if (!this.inputState.pause) { // Evitar repeat
                        this.inputState.pause = true;
                        this.events.onPausePress?.();
                    }
                    event.preventDefault();
                    break;
            }
        };

        const keyupListener = (event: KeyboardEvent) => {
            if (!this.isActive) return;
            
            const key = event.code.toLowerCase();
            
            switch (key) {
                case 'keyw':
                case 'arrowup':
                    this.inputState.forward = false;
                    break;
                case 'keys':
                case 'arrowdown':
                    this.inputState.backward = false;
                    break;
                case 'keya':
                case 'arrowleft':
                    this.inputState.left = false;
                    break;
                case 'keyd':
                case 'arrowright':
                    this.inputState.right = false;
                    break;
                case 'shiftleft':
                case 'shiftright':
                    this.inputState.sprint = false;
                    break;
                case 'space':
                    this.inputState.jump = false;
                    break;
                case 'escape':
                    this.inputState.pause = false;
                    break;
            }
        };

        // === MOUSE ===
        const mouseMoveListener = (event: MouseEvent) => {
            if (!this.isActive) return;
            
            if (document.pointerLockElement === this.canvas) {
                this.inputState.mouseMovement = {
                    x: event.movementX,
                    y: event.movementY
                };
            }
        };

        const mouseDownListener = (event: MouseEvent) => {
            if (!this.isActive) return;
            
            if (event.button === 0) { // Botão esquerdo
                this.inputState.primaryClick = true;
                this.inputState.primaryHold = true;
                this.events.onPrimaryClickStart?.();
            }
        };

        const mouseUpListener = (event: MouseEvent) => {
            if (!this.isActive) return;
            
            if (event.button === 0) { // Botão esquerdo
                this.inputState.primaryClick = false;
                this.inputState.primaryHold = false;
                this.events.onPrimaryClickEnd?.();
            }
        };

        const wheelListener = (event: WheelEvent) => {
            if (!this.isActive) return;
            
            event.preventDefault();
            this.inputState.scroll = event.deltaY;
            this.events.onScrollChange?.(event.deltaY);
        };

        const clickListener = () => {
            if (!this.isActive) return;
            
            // Tentar fazer pointer lock
            if (!document.pointerLockElement) {
                console.log('🖱️ Tentando ativar pointer lock...');
                this.canvas.requestPointerLock().then(() => {
                    console.log('✅ Pointer lock ativado!');
                }).catch((error) => {
                    console.warn('❌ Erro ao ativar pointer lock:', error);
                });
            }
        };

        // Listener para mudanças no pointer lock
        const pointerLockChangeListener = () => {
            if (document.pointerLockElement === this.canvas) {
                console.log('🔒 Pointer lock ativo - mouse capturado');
            } else {
                console.log('🔓 Pointer lock inativo - mouse livre');
            }
        };

        // === REGISTRAR LISTENERS ===
        this.addListener(window, 'keydown', keydownListener);
        this.addListener(window, 'keyup', keyupListener);
        this.addListener(document, 'mousemove', mouseMoveListener);
        this.addListener(window, 'mousedown', mouseDownListener);
        this.addListener(window, 'mouseup', mouseUpListener);
        this.addListener(this.canvas, 'wheel', wheelListener);
        this.addListener(this.canvas, 'click', clickListener);
        this.addListener(document, 'pointerlockchange', pointerLockChangeListener);
    }

    /**
     * Helper para registrar listeners e manter referência para cleanup
     */
    private addListener(element: any, event: string, listener: any): void {
        element.addEventListener(event, listener);
        this.eventListeners.push({ element, event, listener });
    }

    /**
     * Reseta movimento do mouse (deve ser chamado a cada frame)
     */
    public resetFrameInputs(): void {
        this.inputState.mouseMovement = { x: 0, y: 0 };
        this.inputState.scroll = 0;
        this.inputState.primaryClick = false; // Click é apenas um frame
    }

    // === GETTERS PARA ESTADO (READ-ONLY) ===
    
    /**
     * Retorna o estado atual dos inputs (read-only)
     */
    public getInputState(): Readonly<InputState> {
        return this.inputState;
    }

    /**
     * Verifica se está movendo
     */
    public isMoving(): boolean {
        return this.inputState.forward || this.inputState.backward || 
               this.inputState.left || this.inputState.right;
    }

    /**
     * Retorna vetor de movimento normalizado (-1 a 1)
     */
    public getMovementVector(): { x: number; z: number } {
        let x = 0;
        let z = 0;
        
        if (this.inputState.left) x -= 1;
        if (this.inputState.right) x += 1;
        if (this.inputState.forward) z += 1;
        if (this.inputState.backward) z -= 1;
        
        // Normalizar diagonal
        const length = Math.sqrt(x * x + z * z);
        if (length > 0) {
            x /= length;
            z /= length;
        }
        
        return { x, z };
    }

    /**
     * Retorna movimento do mouse desde último frame
     */
    public getMouseDelta(): { x: number; y: number } {
        return { ...this.inputState.mouseMovement };
    }

    // === EVENTOS ===
    
    /**
     * Registra callback para eventos específicos
     */
    public setEventCallback<K extends keyof InputEvents>(
        event: K, 
        callback: InputEvents[K]
    ): void {
        this.events[event] = callback;
    }

    // === CONTROLE DE ESTADO ===
    
    /**
     * Ativa/desativa captura de input
     */
    public setActive(active: boolean): void {
        this.isActive = active;
        
        if (!active) {
            // Limpar estado quando desativado
            Object.keys(this.inputState).forEach(key => {
                if (typeof this.inputState[key as keyof InputState] === 'boolean') {
                    (this.inputState as any)[key] = false;
                }
            });
        }
    }

    /**
     * Liberar pointer lock
     */
    public releasePointerLock(): void {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    /**
     * Limpar todos os event listeners
     */
    public dispose(): void {
        console.log('🧹 Limpando InputManager...');
        
        this.setActive(false);
        this.releasePointerLock();
        
        // Remover todos os event listeners
        this.eventListeners.forEach(({ element, event, listener }) => {
            element.removeEventListener(event, listener);
        });
        this.eventListeners = [];
        
        console.log('✅ InputManager limpo!');
    }
} 