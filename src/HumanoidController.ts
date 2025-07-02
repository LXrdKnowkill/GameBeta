/**
 * HumanoidController - Sistema de boneco humanóide animado
 * Cria um personagem simples com partes do corpo e animações básicas
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

/**
 * Interface para as partes do corpo do humanóide
 */
interface HumanoidParts {
    root: TransformNode;
    body: Mesh;
    head: Mesh;
    leftArm: Mesh;
    rightArm: Mesh;
    leftLeg: Mesh;
    rightLeg: Mesh;
    staff: Mesh; // Cajado
}

/**
 * Classe que gerencia um boneco humanóide com animações básicas
 */
export class HumanoidController {
    private scene: Scene;
    private parts!: HumanoidParts;
    private materials: { [key: string]: StandardMaterial } = {};
    
    // Estado da animação
    private animationTime: number = 0;
    private isWalking: boolean = false;
    private walkSpeed: number = 2.0;
    
    // Parâmetros de animação
    private armSwingAmount: number = 0.5; // Quanto os braços balançam
    private legSwingAmount: number = 0.3; // Quanto as pernas se movem
    private staffGlowIntensity: number = 0.2; // Brilho do cajado

    constructor(scene: Scene, position: Vector3 = Vector3.Zero()) {
        this.scene = scene;
        this.createHumanoid(position);
        console.log('🤖 Humanóide criado com sucesso!');
    }

    /**
     * Cria todo o boneco humanóide
     */
    private createHumanoid(position: Vector3): void {
        // Criar nó raiz para facilitar transformações
        const root = new TransformNode('humanoidRoot', this.scene);
        root.position = position;
        
        // Criar materiais
        this.createMaterials();
        
        // Criar partes do corpo
        const body = this.createBody();
        const head = this.createHead();
        const leftArm = this.createArm('left');
        const rightArm = this.createArm('right');
        const leftLeg = this.createLeg('left');
        const rightLeg = this.createLeg('right');
        const staff = this.createStaff();
        
        // Parental das partes ao root
        body.parent = root;
        head.parent = root;
        leftArm.parent = root;
        rightArm.parent = root;
        leftLeg.parent = root;
        rightLeg.parent = root;
        staff.parent = rightArm; // Cajado na mão direita
        
        // Posicionar partes
        this.positionBodyParts(body, head, leftArm, rightArm, leftLeg, rightLeg, staff);
        
        // Armazenar referências
        this.parts = {
            root,
            body,
            head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            staff
        };
        
        console.log('✅ Corpo do humanóide montado!');
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
        
        // Material do cajado (madeira marrom)
        this.materials.wood = new StandardMaterial('woodMaterial', this.scene);
        this.materials.wood.diffuseColor = new Color3(0.6, 0.4, 0.2);
        this.materials.wood.specularColor = new Color3(0.1, 0.1, 0.1);
        
        // Material do cristal do cajado (azul brilhante)
        this.materials.crystal = new StandardMaterial('crystalMaterial', this.scene);
        this.materials.crystal.diffuseColor = new Color3(0.3, 0.7, 1.0);
        this.materials.crystal.emissiveColor = new Color3(0.1, 0.3, 0.5);
        this.materials.crystal.specularColor = new Color3(1, 1, 1);
    }

    /**
     * Cria o corpo (torso)
     */
    private createBody(): Mesh {
        const body = MeshBuilder.CreateBox(
            'humanoidBody',
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
            'humanoidHead',
            { diameter: 0.8 },
            this.scene
        );
        
        head.material = this.materials.skin;
        
        // Adicionar cabelo (esfera menor em cima)
        const hair = MeshBuilder.CreateSphere(
            'humanoidHair',
            { diameter: 0.85 },
            this.scene
        );
        hair.material = this.materials.hair;
        hair.position.y = 0.1;
        hair.parent = head;
        
        return head;
    }

    /**
     * Cria um braço
     */
    private createArm(side: 'left' | 'right'): Mesh {
        const arm = MeshBuilder.CreateCapsule(
            `humanoid${side}Arm`,
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
            `humanoid${side}Leg`,
            { radius: 0.18, height: 1.2 },
            this.scene
        );
        
        leg.material = this.materials.clothes;
        
        // Definir ponto de rotação no quadril
        leg.setPivotPoint(new Vector3(0, 0.6, 0));
        
        return leg;
    }

    /**
     * Cria o cajado mágico
     */
    private createStaff(): Mesh {
        // Cabo do cajado
        const staffHandle = MeshBuilder.CreateCylinder(
            'staffHandle',
            { height: 1.5, diameter: 0.08 },
            this.scene
        );
        
        staffHandle.material = this.materials.wood;
        
        // Cristal no topo do cajado
        const crystal = MeshBuilder.CreateSphere(
            'staffCrystal',
            { diameter: 0.15 },
            this.scene
        );
        
        crystal.material = this.materials.crystal;
        crystal.position.y = 0.8; // No topo do cajado
        crystal.parent = staffHandle;
        
        return staffHandle;
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
        rightLeg: Mesh,
        staff: Mesh
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
        
        // Cajado na mão direita
        staff.position.set(0.25, -0.3, 0);
        staff.rotation.z = 0.2; // Leve inclinação
    }

    /**
     * Atualiza animações do humanóide
     */
    public update(deltaTime: number): void {
        this.animationTime += deltaTime;
        
        // Determinar se está "caminhando" (animação contínua suave)
        this.isWalking = true; // Por enquanto sempre animando
        
        if (this.isWalking) {
            this.updateWalkingAnimation();
        }
        
        this.updateStaffGlow();
    }

    /**
     * Atualiza a animação de caminhada
     */
    private updateWalkingAnimation(): void {
        const walkCycle = Math.sin(this.animationTime * this.walkSpeed);
        const walkCycleOffset = Math.sin(this.animationTime * this.walkSpeed + Math.PI);
        
        // Animação dos braços (balançam alternadamente)
        this.parts.leftArm.rotation.x = walkCycle * this.armSwingAmount;
        this.parts.rightArm.rotation.x = walkCycleOffset * this.armSwingAmount * 0.5; // Menos movimento no braço com cajado
        
        // Animação das pernas (balançam alternadamente)
        this.parts.leftLeg.rotation.x = walkCycleOffset * this.legSwingAmount;
        this.parts.rightLeg.rotation.x = walkCycle * this.legSwingAmount;
        
        // Ligeiro movimento do corpo (bob up and down)
        const bodyBob = Math.abs(Math.sin(this.animationTime * this.walkSpeed * 2)) * 0.05;
        this.parts.body.position.y = 0.6 + bodyBob;
        this.parts.head.position.y = 1.5 + bodyBob;
        
        // Rotação sutil da cabeça
        this.parts.head.rotation.y = Math.sin(this.animationTime * 0.8) * 0.1;
    }

    /**
     * Atualiza o brilho do cajado
     */
    private updateStaffGlow(): void {
        const glowPulse = (Math.sin(this.animationTime * 3) + 1) * 0.5; // 0 a 1
        const currentIntensity = this.staffGlowIntensity + (glowPulse * 0.3);
        
        // Atualizar brilho do cristal
        if (this.materials.crystal) {
            this.materials.crystal.emissiveColor = new Color3(
                0.1 * currentIntensity,
                0.3 * currentIntensity,
                0.5 * currentIntensity
            );
        }
    }

    /**
     * Obtém a posição do cajado no mundo (de onde sairão as magias)
     */
    public getStaffTipPosition(): Vector3 {
        // Pegar posição do cristal do cajado no espaço mundial
        const crystal = this.scene.getMeshByName('staffCrystal');
        if (crystal) {
            return crystal.getAbsolutePosition();
        }
        
        // Fallback: posição aproximada
        const staffPos = this.parts.staff.getAbsolutePosition();
        return staffPos.add(new Vector3(0, 0.8, 0)); // Topo do cajado
    }

    /**
     * Obtém a direção do cajado (para onde aponta)
     */
    public getStaffDirection(): Vector3 {
        // Direção baseada na rotação do braço direito e posição do cajado
        // Por enquanto, retorna direção fixa para frente
        return new Vector3(0.2, 0.1, 1).normalize();
    }

    /**
     * Aplica efeito visual quando o humanóide é atingido
     */
    public takeDamage(): void {
        console.log('💥 Humanóide foi atingido!');
        
        // Efeito de escala temporário
        const originalScale = this.parts.root.scaling.clone();
        this.parts.root.scaling = originalScale.scale(1.1);
        
        // Efeito de cor no corpo
        const originalBodyMaterial = this.parts.body.material;
        const hitMaterial = new StandardMaterial('hitMaterial', this.scene);
        hitMaterial.diffuseColor = new Color3(1, 0.8, 0.8); // Rosa claro
        hitMaterial.emissiveColor = new Color3(0.3, 0.1, 0.1);
        
        this.parts.body.material = hitMaterial;
        
        // Voltar ao normal após 300ms
        setTimeout(() => {
            this.parts.root.scaling = originalScale;
            this.parts.body.material = originalBodyMaterial;
            hitMaterial.dispose();
        }, 300);
        
        // Efeito de "recuo" na animação
        this.parts.body.rotation.z = 0.2;
        setTimeout(() => {
            this.parts.body.rotation.z = 0;
        }, 200);
    }

    /**
     * Obtém a posição do humanóide
     */
    public getPosition(): Vector3 {
        return this.parts.root.position;
    }

    /**
     * Define nova posição para o humanóide
     */
    public setPosition(position: Vector3): void {
        this.parts.root.position = position;
    }

    /**
     * Obtém o mesh raiz (para colisões)
     */
    public getRootMesh(): TransformNode {
        return this.parts.root;
    }

    /**
     * Limpa todos os recursos do humanóide
     */
    public dispose(): void {
        console.log('🧹 Limpando recursos do humanóide...');
        
        // Limpar materiais
        Object.values(this.materials).forEach(material => {
            material.dispose();
        });
        
        // Limpar meshes (o dispose do root limpa todos os filhos)
        if (this.parts && this.parts.root) {
            this.parts.root.dispose();
        }
        
        console.log('✅ Humanóide limpo!');
    }
}