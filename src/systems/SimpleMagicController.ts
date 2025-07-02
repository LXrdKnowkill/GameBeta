/**
 * SimpleMagicController - Sistema de magia adaptado para nova arquitetura
 * Versão simplificada que funciona com o Player composto
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';

import { Player } from './Player';

/**
 * Dados de uma magia
 */
interface SpellData {
    name: string;
    manaCost: number;
    projectileSpeed: number;
    projectileSize: number;
    damage: number;
    color: Color3;
    castTime: number;
}

/**
 * Projétil ativo
 */
interface Projectile {
    mesh: Mesh;
    direction: Vector3;
    speed: number;
    damage: number;
    lifetime: number;
    maxLifetime: number;
}

/**
 * SimpleMagicController - Sistema de magia simplificado
 */
export class SimpleMagicController {
    private scene: Scene;
    private player: Player;
    private targetMeshes: any[];
    
    // Estado
    private isCasting: boolean = false;
    private castStartTime: number = 0;
    private activeProjectiles: Projectile[] = [];
    
    // Spells disponíveis
    private spells = {
        waterBallQuick: {
            name: 'Water Ball Rápida',
            manaCost: 10,
            projectileSpeed: 15,
            projectileSize: 0.3,
            damage: 25,
            color: new Color3(0.3, 0.7, 1.0),
            castTime: 0.2
        },
        waterBallCharged: {
            name: 'Water Ball Carregada',
            manaCost: 25,
            projectileSpeed: 12,
            projectileSize: 0.6,
            damage: 60,
            color: new Color3(0.2, 0.5, 0.9),
            castTime: 1.5
        }
    };

    constructor(scene: Scene, player: Player, targetMeshes: any[] = []) {
        this.scene = scene;
        this.player = player;
        this.targetMeshes = targetMeshes;
        
        this.setupInputHandlers();
        console.log('🔮 SimpleMagicController criado!');
    }

    /**
     * Configura input handlers para magia
     */
    private setupInputHandlers(): void {
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.event.button === 0) { // Botão esquerdo
                        this.startCasting();
                    }
                    break;
                    
                case PointerEventTypes.POINTERUP:
                    if (pointerInfo.event.button === 0) { // Botão esquerdo
                        this.finishCasting();
                    }
                    break;
            }
        });
    }

    /**
     * Inicia conjuração
     */
    private startCasting(): void {
        if (this.isCasting) return;
        
        console.log('🔮 Iniciando conjuração...');
        this.isCasting = true;
        this.castStartTime = performance.now();
        
        // Notificar player (se tiver método)
        if (typeof this.player.startCasting === 'function') {
            this.player.startCasting();
        }
    }

    /**
     * Finaliza conjuração e lança magia
     */
    private finishCasting(): void {
        if (!this.isCasting) return;
        
        const castTime = (performance.now() - this.castStartTime) / 1000;
        console.log(`⚡ Finalizando conjuração após ${castTime.toFixed(2)}s`);
        
        // Determinar spell baseado no tempo
        let spell: SpellData;
        if (castTime < 0.3) {
            spell = this.spells.waterBallQuick;
        } else {
            spell = this.spells.waterBallCharged;
        }
        
        this.castSpell(spell);
        
        // Limpar estado
        this.isCasting = false;
        
        // Notificar player
        if (typeof this.player.finishCasting === 'function') {
            this.player.finishCasting();
        }
    }

    /**
     * Lança uma magia
     */
    private castSpell(spell: SpellData): void {
        console.log(`🌊 Lançando ${spell.name}...`);
        
        // Verificar mana
        if (!this.player.spendMana(spell.manaCost)) {
            console.log('❌ Mana insuficiente!');
            return;
        }
        
        this.createProjectile(spell);
        console.log(`✨ ${spell.name} lançada! (Mana: -${spell.manaCost})`);
    }

    /**
     * Cria projétil
     */
    private createProjectile(spell: SpellData): void {
        // Criar mesh do projétil
        const projectile = MeshBuilder.CreateSphere(
            `projectile_${Date.now()}`,
            { diameter: spell.projectileSize * 2 },
            this.scene
        );
        
        // Material
        const material = new StandardMaterial(`projMat_${Date.now()}`, this.scene);
        material.diffuseColor = spell.color;
        material.emissiveColor = spell.color.scale(0.3);
        projectile.material = material;
        
        // Posicionar na frente do jogador
        const playerPos = this.player.getPosition();
        const cameraDir = this.player.getCameraDirection();
        
        // Spawn à frente do jogador
        const spawnPos = playerPos.add(cameraDir.scale(1.5));
        spawnPos.y += 1.5; // Altura do peito
        projectile.position = spawnPos;
        
        // Criar dados do projétil
        const projectileData: Projectile = {
            mesh: projectile,
            direction: cameraDir.normalize(),
            speed: spell.projectileSpeed,
            damage: spell.damage,
            lifetime: 0,
            maxLifetime: 5 // 5 segundos
        };
        
        this.activeProjectiles.push(projectileData);
        console.log(`🎯 Projétil criado: ${projectile.position}`);
    }

    /**
     * Atualiza sistema de magia
     */
    public update(deltaTime: number): void {
        this.updateProjectiles(deltaTime);
        this.updateCasting(deltaTime);
    }

    /**
     * Atualiza projéteis ativos
     */
    private updateProjectiles(deltaTime: number): void {
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.activeProjectiles[i];
            
            // Mover projétil
            const movement = projectile.direction.scale(projectile.speed * deltaTime);
            projectile.mesh.position.addInPlace(movement);
            
            // Atualizar lifetime
            projectile.lifetime += deltaTime;
            
            // Verificar colisões
            if (this.checkProjectileCollisions(projectile)) {
                this.removeProjectile(i);
                continue;
            }
            
            // Remover se expirou
            if (projectile.lifetime >= projectile.maxLifetime) {
                this.removeProjectile(i);
                continue;
            }
            
            // Rotacionar projétil (efeito visual)
            projectile.mesh.rotation.y += deltaTime * 2;
        }
    }

    /**
     * Verifica colisões do projétil
     */
    private checkProjectileCollisions(projectile: Projectile): boolean {
        const projectilePos = projectile.mesh.position;
        
        // Verificar colisão com alvos
        for (const target of this.targetMeshes) {
            if (!target || !target.position) continue;
            
            const distance = Vector3.Distance(projectilePos, target.position);
            if (distance < 1.0) { // Raio de colisão
                this.hitTarget(target, projectilePos);
                return true;
            }
        }
        
        // Verificar colisão com chão
        if (projectilePos.y < 0.5) {
            this.createImpactEffect(projectilePos);
            return true;
        }
        
        return false;
    }

    /**
     * Processa hit em alvo
     */
    private hitTarget(target: any, position: Vector3): void {
        console.log(`💥 Alvo atingido!`);
        
        // Efeito visual no alvo
        if (target.material && target.material.diffuseColor) {
            const originalColor = target.material.diffuseColor.clone();
            target.material.diffuseColor = new Color3(1, 0.5, 0.5);
            
            setTimeout(() => {
                target.material.diffuseColor = originalColor;
            }, 200);
        }
        
        this.createImpactEffect(position);
    }

    /**
     * Cria efeito de impacto
     */
    private createImpactEffect(position: Vector3): void {
        console.log(`💥 Efeito de impacto em: ${position}`);
        
        // Criar efeito simples
        for (let i = 0; i < 3; i++) {
            const particle = MeshBuilder.CreateSphere(
                `impact_${Date.now()}_${i}`,
                { diameter: 0.1 },
                this.scene
            );
            
            const material = new StandardMaterial(`impactMat_${Date.now()}_${i}`, this.scene);
            material.diffuseColor = new Color3(0.8, 0.9, 1.0);
            material.emissiveColor = new Color3(0.5, 0.7, 1.0);
            particle.material = material;
            
            particle.position = position.add(new Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.5,
                (Math.random() - 0.5) * 0.5
            ));
            
            // Animar partícula
            const startScale = particle.scaling.clone();
            const animate = () => {
                particle.scaling.scaleInPlace(0.95);
                particle.position.y += 0.02;
                
                if (particle.scaling.x > 0.1) {
                    requestAnimationFrame(animate);
                } else {
                    particle.dispose();
                }
            };
            animate();
        }
    }

    /**
     * Atualiza estado de casting
     */
    private updateCasting(deltaTime: number): void {
        if (!this.isCasting) return;
        
        const castTime = (performance.now() - this.castStartTime) / 1000;
        const maxCastTime = this.spells.waterBallCharged.castTime;
        const progress = Math.min(castTime / maxCastTime, 1.0);
        
        // Atualizar UI se o player tiver método
        if (typeof this.player.updateCasting === 'function') {
            this.player.updateCasting(progress);
        }
    }

    /**
     * Remove projétil
     */
    private removeProjectile(index: number): void {
        const projectile = this.activeProjectiles[index];
        if (projectile && projectile.mesh) {
            projectile.mesh.dispose();
        }
        this.activeProjectiles.splice(index, 1);
    }

    /**
     * Limpa todos os projéteis
     */
    public clearAllProjectiles(): void {
        this.activeProjectiles.forEach(projectile => {
            if (projectile.mesh) {
                projectile.mesh.dispose();
            }
        });
        this.activeProjectiles = [];
    }

    /**
     * Limpa recursos
     */
    public dispose(): void {
        console.log('🧹 Limpando SimpleMagicController...');
        this.clearAllProjectiles();
        console.log('✅ SimpleMagicController limpo!');
    }
} 