/**
 * TerrainSystem - Sistema de terreno com grama e detalhes
 * Substitui o chão simples por um terreno mais rico e interessante
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { GroundMesh } from '@babylonjs/core/Meshes/groundMesh';

/**
 * Configuração do terreno
 */
interface TerrainConfig {
    size: number;
    subdivisions: number;
    grassDensity: number;
    grassHeight: number;
    grassVariation: number;
}

/**
 * TerrainSystem - Criador de terreno com grama
 */
export class TerrainSystem {
    private scene: Scene;
    private groundMesh: GroundMesh | null = null;
    private grassElements: Mesh[] = [];
    
    // Configuração padrão
    private config: TerrainConfig = {
        size: 50,        // 50x50 unidades
        subdivisions: 25, // Detalhamento da mesh
        grassDensity: 200, // Quantidade de elementos de grama
        grassHeight: 0.5,  // Altura média da grama
        grassVariation: 0.3 // Variação na altura
    };

    constructor(scene: Scene, config?: Partial<TerrainConfig>) {
        this.scene = scene;
        
        if (config) {
            this.config = { ...this.config, ...config };
        }
        
        console.log('🌍 TerrainSystem criado');
    }

    /**
     * Cria o terreno completo
     */
    public async createTerrain(): Promise<GroundMesh> {
        console.log('🌱 Criando terreno melhorado...');
        
        // 1. Criar base do terreno
        this.createGroundBase();
        
        // 2. Aplicar material/textura
        this.applyGroundMaterial();
        
        // 3. Adicionar elementos de grama
        await this.addGrassElements();
        
        // 4. Adicionar detalhes extras
        this.addTerrainDetails();
        
        console.log('✅ Terreno criado com sucesso!');
        return this.groundMesh!;
    }

    /**
     * Cria a base do terreno
     */
    private createGroundBase(): void {
        console.log('📐 Criando base do terreno...');
        
        this.groundMesh = MeshBuilder.CreateGround(
            'improvedGround', 
            {
                width: this.config.size,
                height: this.config.size,
                subdivisions: this.config.subdivisions
            },
            this.scene
        );
        
        // Posicionar no centro
        this.groundMesh.position = Vector3.Zero();
        
        // Configurar para receber sombras
        this.groundMesh.receiveShadows = true;
        
        console.log(`✅ Terreno base criado (${this.config.size}x${this.config.size})`);
    }

    /**
     * Aplica material e textura ao terreno
     */
    private applyGroundMaterial(): void {
        if (!this.groundMesh) return;
        
        console.log('🎨 Aplicando material ao terreno...');
        
        const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
        
        // Criar textura procedural de grama
        const grassTexture = this.createGrassTexture();
        groundMaterial.diffuseTexture = grassTexture;
        
        // Configurações do material
        groundMaterial.diffuseColor = new Color3(0.4, 0.8, 0.3); // Verde claro
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1); // Baixo brilho
        groundMaterial.roughness = 0.8; // Superfície rugosa
        
        // Aplicar tiling para repetir a textura
        if (groundMaterial.diffuseTexture) {
            groundMaterial.diffuseTexture.uScale = 5;
            groundMaterial.diffuseTexture.vScale = 5;
        }
        
        this.groundMesh.material = groundMaterial;
        console.log('✅ Material aplicado ao terreno');
    }

    /**
     * Cria textura procedural de grama
     */
    private createGrassTexture(): DynamicTexture {
        console.log('🖼️ Criando textura de grama...');
        
        const textureSize = 256;
        const grassTexture = new DynamicTexture(
            'grassTexture', 
            { width: textureSize, height: textureSize }, 
            this.scene
        );
        
        const context = grassTexture.getContext();
        
        // Background verde
        context.fillStyle = '#4a7c59';
        context.fillRect(0, 0, textureSize, textureSize);
        
        // Adicionar variações de cor para simular grama
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * textureSize;
            const y = Math.random() * textureSize;
            const size = Math.random() * 3 + 1;
            
            // Cores variadas de verde
            const greenIntensity = Math.random() * 100 + 100;
            context.fillStyle = `rgb(${Math.floor(greenIntensity * 0.4)}, ${greenIntensity}, ${Math.floor(greenIntensity * 0.6)})`;
            
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // Adicionar "fios" de grama
        context.strokeStyle = '#2d5233';
        context.lineWidth = 1;
        
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * textureSize;
            const y = Math.random() * textureSize;
            const length = Math.random() * 8 + 3;
            
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + (Math.random() - 0.5) * 2, y - length);
            context.stroke();
        }
        
        grassTexture.update();
        console.log('✅ Textura de grama criada');
        
        return grassTexture;
    }

    /**
     * Adiciona elementos de grama 3D
     */
    private async addGrassElements(): Promise<void> {
        console.log('🌾 Adicionando elementos de grama 3D...');
        
        const grassCount = this.config.grassDensity;
        const terrainSize = this.config.size;
        
        for (let i = 0; i < grassCount; i++) {
            // Posição aleatória no terreno
            const x = (Math.random() - 0.5) * terrainSize * 0.9; // Não muito perto das bordas
            const z = (Math.random() - 0.5) * terrainSize * 0.9;
            const y = 0; // No nível do chão
            
            // Criar elemento de grama
            const grassElement = this.createSingleGrassElement(i);
            grassElement.position = new Vector3(x, y, z);
            
            // Rotação aleatória
            grassElement.rotation.y = Math.random() * Math.PI * 2;
            
            // Escala variada
            const scale = 0.8 + Math.random() * 0.4; // 0.8 a 1.2
            grassElement.scaling = new Vector3(scale, scale, scale);
            
            this.grassElements.push(grassElement);
        }
        
        console.log(`✅ ${grassCount} elementos de grama adicionados`);
    }

    /**
     * Cria um único elemento de grama
     */
    private createSingleGrassElement(index: number): Mesh {
        // Criar blade de grama com geometria simples
        const grassBlade = MeshBuilder.CreateCylinder(
            `grassBlade_${index}`,
            {
                height: this.config.grassHeight + (Math.random() - 0.5) * this.config.grassVariation,
                diameterTop: 0.02,
                diameterBottom: 0.05,
                tessellation: 4 // Poucos vértices para performance
            },
            this.scene
        );
        
        // Material para a grama
        const grassMaterial = new StandardMaterial(`grassMaterial_${index}`, this.scene);
        
        // Cores variadas de verde
        const greenVariation = Math.random() * 0.3;
        grassMaterial.diffuseColor = new Color3(
            0.2 + greenVariation * 0.5,
            0.6 + greenVariation,
            0.3 + greenVariation * 0.3
        );
        
        grassMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        grassMaterial.roughness = 1.0; // Sem brilho
        
        grassBlade.material = grassMaterial;
        
        // Posicionar acima do chão
        grassBlade.position.y = grassBlade.getBoundingInfo().boundingBox.extendSize.y;
        
        return grassBlade;
    }

    /**
     * Adiciona detalhes extras ao terreno
     */
    private addTerrainDetails(): void {
        console.log('🌿 Adicionando detalhes extras...');
        
        // Adicionar algumas "pedras" pequenas
        this.addRocks();
        
        // Adicionar patches de flores pequenas
        this.addFlowerPatches();
        
        console.log('✅ Detalhes adicionados');
    }

    /**
     * Adiciona pedras pequenas
     */
    private addRocks(): void {
        const rockCount = 15;
        const terrainSize = this.config.size;
        
        for (let i = 0; i < rockCount; i++) {
            const rock = MeshBuilder.CreateSphere(
                `rock_${i}`,
                { 
                    diameter: 0.3 + Math.random() * 0.4,
                    segments: 6 // Baixa resolução para parecer pedra
                },
                this.scene
            );
            
            // Posição aleatória
            rock.position = new Vector3(
                (Math.random() - 0.5) * terrainSize * 0.8,
                0.1,
                (Math.random() - 0.5) * terrainSize * 0.8
            );
            
            // Achatamento para parecer mais natural
            rock.scaling.y = 0.4 + Math.random() * 0.3;
            
            // Material de pedra
            const rockMaterial = new StandardMaterial(`rockMaterial_${i}`, this.scene);
            rockMaterial.diffuseColor = new Color3(0.5, 0.4, 0.35);
            rockMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
            rock.material = rockMaterial;
        }
    }

    /**
     * Adiciona patches de flores
     */
    private addFlowerPatches(): void {
        const patchCount = 8;
        const terrainSize = this.config.size;
        
        for (let i = 0; i < patchCount; i++) {
            // Posição central do patch
            const centerX = (Math.random() - 0.5) * terrainSize * 0.7;
            const centerZ = (Math.random() - 0.5) * terrainSize * 0.7;
            
            // Criar algumas flores ao redor do centro
            const flowersInPatch = 3 + Math.floor(Math.random() * 4);
            
            for (let j = 0; j < flowersInPatch; j++) {
                const flower = MeshBuilder.CreateSphere(
                    `flower_${i}_${j}`,
                    { diameter: 0.1 },
                    this.scene
                );
                
                // Posição ao redor do centro do patch
                const offsetX = (Math.random() - 0.5) * 2;
                const offsetZ = (Math.random() - 0.5) * 2;
                
                flower.position = new Vector3(
                    centerX + offsetX,
                    0.15,
                    centerZ + offsetZ
                );
                
                // Cores variadas de flores
                const flowerMaterial = new StandardMaterial(`flowerMaterial_${i}_${j}`, this.scene);
                const flowerColors = [
                    new Color3(0.9, 0.8, 0.2), // Amarelo
                    new Color3(0.8, 0.3, 0.8), // Rosa
                    new Color3(0.9, 0.9, 0.9), // Branco
                    new Color3(0.6, 0.4, 0.9)  // Roxo
                ];
                
                flowerMaterial.diffuseColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                flowerMaterial.emissiveColor = flowerMaterial.diffuseColor.clone().scale(0.2);
                flower.material = flowerMaterial;
            }
        }
    }

    /**
     * Retorna a mesh do terreno
     */
    public getGroundMesh(): GroundMesh | null {
        return this.groundMesh;
    }

    /**
     * Retorna configuração atual
     */
    public getConfig(): TerrainConfig {
        return { ...this.config };
    }

    /**
     * Atualiza configuração
     */
    public updateConfig(newConfig: Partial<TerrainConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('🔧 Configuração do terreno atualizada');
    }

    /**
     * Limpa todos os recursos
     */
    public dispose(): void {
        console.log('🧹 Limpando TerrainSystem...');
        
        // Limpar elementos de grama
        this.grassElements.forEach(grass => {
            if (grass.material) {
                grass.material.dispose();
            }
            grass.dispose();
        });
        this.grassElements = [];
        
        // Limpar terreno
        if (this.groundMesh) {
            if (this.groundMesh.material) {
                this.groundMesh.material.dispose();
            }
            this.groundMesh.dispose();
            this.groundMesh = null;
        }
        
        console.log('✅ TerrainSystem limpo!');
    }
} 