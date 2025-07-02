/**
 * ExternalAssetCharacter - Sistema para carregar modelo 3D real
 * Substitui o boneco geométrico por modelo .glb com animações
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

// Importar loaders necessários
import '@babylonjs/loaders/glTF';

/**
 * Interface para estado de animação
 */
interface AnimationState {
    idle: AnimationGroup | null;
    walk: AnimationGroup | null;
    run: AnimationGroup | null;
    jumpStart: AnimationGroup | null;
    jumpLoop: AnimationGroup | null;
    jumpEnd: AnimationGroup | null;
    cast_spell: AnimationGroup | null;
}

/**
 * Interface para partes do personagem
 */
export interface CharacterParts {
    root: TransformNode;
    meshes: AbstractMesh[];
    animations: AnimationState;
}

/**
 * ExternalAssetCharacter - Carregador de modelo 3D
 */
export class ExternalAssetCharacter {
    private scene: Scene;
    private characterParts: CharacterParts | null = null;
    private isLoaded: boolean = false;
    private mainSkeleton: Skeleton | null = null;
    
    // Estado atual de animação
    private currentAnimation: AnimationGroup | null = null;
    private currentState: string = 'idle';
    
    // Caminhos dos assets
    private modelPath = '/models/ModeloPersonagem/';
    private characterFile = 'Twilight_Character.glb';
    private animationPaths = {
        idle: 'Animations/Twilight_Idle.glb',
        walk: 'Animations/Twilight_Walk.glb',
        run: 'Animations/Twilight_Run.glb',
        jumpStart: 'Animations/Twilight_JumpStart.glb',
        jumpLoop: 'Animations/Twilight_JumpLoop.glb',
        jumpEnd: 'Animations/Twilight_JumpEnd.glb',
        cast_spell: 'Animations/Twilight_JumpStart.glb'
    };

    constructor(scene: Scene) {
        this.scene = scene;
        console.log('🎭 ExternalAssetCharacter criado');
    }

    /**
     * Carrega o modelo de personagem e animações
     */
    public async loadCharacter(): Promise<CharacterParts> {
        console.log('📦 Carregando modelo de personagem 3D...');
        
        try {
            // Carregar modelo principal
            const result = await SceneLoader.ImportMeshAsync(
                '',
                this.modelPath,
                this.characterFile,
                this.scene
            );

            if (!result.meshes.length) {
                throw new Error('Nenhuma mesh encontrada no modelo');
            }

            // Criar root node
            const root = new TransformNode('externalCharacterRoot', this.scene);

            // Anexar meshes ao root
            result.meshes.forEach(mesh => {
                if (mesh.parent === null) {
                    mesh.parent = root;
                }
            });

            // Aplicar escala e posição
            const rootNode = result.meshes[0] as TransformNode;
            rootNode.rotationQuaternion = Quaternion.FromEulerAngles(
                Math.PI / 2,
                0,
                0
            );

            // Obter o esqueleto para retarget de animações
            const skeleton = result.skeletons.length > 0 ? result.skeletons[0] : null;
            if (skeleton) {
                this.mainSkeleton = skeleton;
                console.log('💀 Esqueleto principal encontrado e armazenado!');
            } else {
                console.warn('⚠️ Esqueleto principal não encontrado no modelo!');
            }

            console.log('✅ Modelo principal carregado:', result.meshes.length, 'meshes');

            // Carregar animações
            const animations = await this.loadAnimations();

            // Criar estrutura de dados
            this.characterParts = {
                root: root,
                meshes: result.meshes,
                animations: animations
            };

            this.isLoaded = true;
            
            // Iniciar com animação idle
            if (animations.idle) {
                this.playAnimation('idle');
            }

            console.log('🎭 Personagem 3D carregado com sucesso!');
            return this.characterParts;

        } catch (error) {
            console.error('❌ Erro ao carregar personagem:', error);
            
            // Fallback: criar personagem geométrico simples
            console.log('🔄 Usando fallback geométrico...');
            return this.createFallbackCharacter();
        }
    }

    /**
     * Carrega todas as animações
     */
    private async loadAnimations(): Promise<AnimationState> {
        const animations: AnimationState = {
            idle: null,
            walk: null,
            run: null,
            jumpStart: null,
            jumpLoop: null,
            jumpEnd: null,
            cast_spell: null
        };

        console.log('🎬 Carregando e redirecionando animações...');

        if (!this.mainSkeleton) {
            console.error('❌ Não é possível carregar animações sem um esqueleto principal!');
            return animations;
        }

        for (const [animName, animPath] of Object.entries(this.animationPaths)) {
            try {
                const result = await SceneLoader.ImportMeshAsync('', this.modelPath, animPath, this.scene);

                if (result.animationGroups && result.animationGroups.length > 0) {
                    const sourceAnimation = result.animationGroups[0];
                    sourceAnimation.stop();

                    // ✅ CORREÇÃO: Cria um novo AnimationGroup e adiciona apenas as animações válidas
                    const newAnimation = new AnimationGroup(`${animName}_retargeted`, this.scene);

                    sourceAnimation.targetedAnimations.forEach(targetedAnim => {
                        const bone = this.mainSkeleton!.bones.find(b => b.name === targetedAnim.target.name);
                        if (bone) {
                            // Adiciona a animação ao novo grupo, já com o alvo correto
                            newAnimation.addTargetedAnimation(targetedAnim.animation, bone);
                        } else {
                            console.warn(`Retargeting: Osso "${targetedAnim.target.name}" não encontrado. Track de animação ignorado.`);
                        }
                    });

                    animations[animName as keyof AnimationState] = newAnimation;
                    console.log(`✅ Animação ${animName} redirecionada com sucesso!`);

                    // Limpa todos os recursos do arquivo de animação importado
                    sourceAnimation.dispose();
                    result.meshes.forEach(mesh => mesh.dispose());
                    result.skeletons.forEach(skel => skel.dispose());
                } else {
                    console.warn(`⚠️ Animação ${animName} não encontrada`);
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao carregar animação ${animName}:`, error);
            }
        }

        return animations;
    }

    /**
     * Cria personagem geométrico como fallback
     */
    public createFallbackCharacter(): CharacterParts {
        console.log('🔧 Criando personagem fallback...');
        
        const root = new TransformNode('fallbackCharacterRoot', this.scene);
        // A posição será controlada pelo Player.ts

        // Corpo principal
        const body = MeshBuilder.CreateCapsule('fallbackBody', {
            height: 1.8,
            radius: 0.3
        }, this.scene);
        body.parent = root;
        body.position.y = 0.9;

        // Material básico
        const material = new StandardMaterial('fallbackMaterial', this.scene);
        material.diffuseColor = new Color3(0.4, 0.6, 0.8);
        body.material = material;

        return {
            root: root,
            meshes: [body],
            animations: {
                idle: null,
                walk: null,
                run: null,
                jumpStart: null,
                jumpLoop: null,
                jumpEnd: null,
                cast_spell: null
            }
        };
    }

    /**
     * Reproduz uma animação
     */
    public playAnimation(stateName: string, loop: boolean = true): void {
        if (!this.characterParts || !this.isLoaded) {
            console.warn('⚠️ Personagem não carregado, não é possível reproduzir animação');
            return;
        }

        const animation = this.characterParts.animations[stateName as keyof AnimationState];
        
        if (!animation) {
            console.warn(`⚠️ Animação '${stateName}' não encontrada`);
            return;
        }

        // Parar animação atual
        if (this.currentAnimation && this.currentAnimation !== animation) {
            this.currentAnimation.stop();
        }

        // Reproduzir nova animação
        animation.play(loop);
        this.currentAnimation = animation;
        this.currentState = stateName;
        
        console.log(`🎬 Reproduzindo animação: ${stateName}`);
    }

    /**
     * Para a animação atual
     */
    public stopCurrentAnimation(): void {
        if (this.currentAnimation) {
            this.currentAnimation.stop();
            this.currentAnimation = null;
        }
    }

    /**
     * Retorna as partes do personagem
     */
    public getCharacterParts(): CharacterParts | null {
        return this.characterParts;
    }

    /**
     * Retorna posição atual
     */
    public getPosition(): Vector3 {
        return this.characterParts?.root.position.clone() || Vector3.Zero();
    }

    /**
     * Define nova posição
     */
    public setPosition(position: Vector3): void {
        if (this.characterParts) {
            this.characterParts.root.position = position;
        }
    }

    /**
     * Retorna estado atual de animação
     */
    public getCurrentAnimationState(): string {
        return this.currentState;
    }

    /**
     * Verifica se o modelo está carregado
     */
    public isModelLoaded(): boolean {
        return this.isLoaded;
    }

    /**
     * Define velocidade da animação atual
     */
    public setAnimationSpeed(speed: number): void {
        if (this.currentAnimation) {
            this.currentAnimation.speedRatio = speed;
            console.log(`⚡ Velocidade da animação: ${speed}x`);
        }
    }

    /**
     * Atualização por frame (para lógicas futuras)
     */
    public update(_deltaTime: number): void {
        // Placeholder para lógicas futuras como blending de animações
        if (!this.isLoaded) return;
        
        // Aqui podemos adicionar blending, transições suaves, etc.
    }

    /**
     * Limpa recursos
     */
    public dispose(): void {
        console.log('🧹 Limpando ExternalAssetCharacter...');
        
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }

        if (this.characterParts) {
            // Limpar animações
            Object.values(this.characterParts.animations).forEach(anim => {
                if (anim) {
                    anim.dispose();
                }
            });

            // Limpar meshes
            this.characterParts.meshes.forEach(mesh => {
                mesh.dispose();
            });

            // Limpar root
            this.characterParts.root.dispose();
        }

        console.log('✅ ExternalAssetCharacter limpo!');
    }
}

/**
 * INTEGRAÇÃO COM MOVIMENTO
 * 
 * Como conectar com nosso sistema de movimento:
 */
export class MovementToAnimationBridge {
    private character: ExternalAssetCharacter;
    
    constructor(character: ExternalAssetCharacter) {
        this.character = character;
    }
    
    /**
     * Atualizar animação baseada no movimento
     */
    public updateAnimation(movementState: string, horizontalSpeed: number): void {
        switch (movementState) {
            case 'idle':
                this.character.playAnimation('idle');
                break;
                
            case 'walking':
                this.character.playAnimation('walk');
                // Ajustar velocidade baseada na velocidade real
                const walkSpeedRatio = Math.min(horizontalSpeed / 4.0, 1.5);
                this.character.setAnimationSpeed(walkSpeedRatio);
                break;
                
            case 'running':
                this.character.playAnimation('run');
                const runSpeedRatio = Math.min(horizontalSpeed / 8.0, 2.0);
                this.character.setAnimationSpeed(runSpeedRatio);
                break;
                
            case 'jumping':
                this.character.playAnimation('jumpStart');
                break;
                
            case 'falling':
                this.character.playAnimation('jumpEnd');
                break;
        }
    }
    
    /**
     * Tocar animação de spell casting
     */
    public castSpell(onComplete: () => void): void {
        this.character.playAnimation('jumpLoop', false);
        setTimeout(() => {
            onComplete();
        }, 1000);
    }
    
    /**
     * Tocar animação de hit
     */
    public takeDamage(): void {
        this.character.playAnimation('jumpEnd', false);
    }
}

/**
 * WORKFLOW COMPLETO COM ASSETS EXTERNOS
 * 
 * 1. ARTISTA 3D (Blender):
 * ```
 * - Cria modelo do personagem
 * - Adiciona skeleton (bones)
 * - Cria animações: Idle, Walk, Run, Jump, Attack, etc.
 * - Exporta como .glb/.gltf
 * - Coloca em /public/assets/characters/
 * ```
 * 
 * 2. PROGRAMADOR (TypeScript):
 * ```typescript
 * const character = new ExternalAssetCharacter(scene);
 * await character.loadCharacter('rudeus_character.glb');
 * 
 * const bridge = new MovementToAnimationBridge(character);
 * 
 * // No update loop:
 * bridge.updateAnimation(movementState, speed);
 * ```
 * 
 * 3. VANTAGENS:
 * ✅ Visual profissional
 * ✅ Animações fluidas
 * ✅ Artista pode iterar independentemente
 * ✅ Menos código para manter
 * ✅ Separação clara de responsabilidades
 * ✅ Texturas e materiais avançados
 * ✅ Supports mocap animations
 * ✅ Industry standard workflow
 */

/**
 * FERRAMENTAS RECOMENDADAS:
 * 
 * MODELAGEM 3D:
 * - Blender (gratuito) - https://blender.org
 * - Maya (pago) - Para estúdios grandes
 * - 3ds Max (pago) - Alternativa ao Maya
 * 
 * ANIMAÇÃO:
 * - Mixamo (gratuito) - Biblioteca de animações da Adobe
 * - Motion capture data
 * - Hand-animated in Blender/Maya
 * 
 * EXPORTAÇÃO:
 * - glTF 2.0 (.glb) - Recomendado para Babylon.js
 * - FBX - Alternativa comum
 * - OBJ - Apenas geometria (sem animação)
 * 
 * OTIMIZAÇÃO:
 * - gltf-pipeline - Compressão de arquivos
 * - Draco compression - Reduz tamanho dos arquivos
 * - Texture atlasing - Menos draw calls
 */ 