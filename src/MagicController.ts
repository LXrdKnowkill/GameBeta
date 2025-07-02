/**
 * MagicController - Sistema de magia inspirado em Mushoku Tensei
 * Implementa mecânica de canto (chanting) e sistema de projéteis
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { PlayerController } from './PlayerController';
import { GameUI } from './GameUI';

/**
 * Interface para definir propriedades de uma magia
 */
interface SpellData {
    name: string;
    manaCost: number;
    projectileSpeed: number;
    projectileSize: number;
    damage: number;
    color: Color3;
    castTime: number; // tempo em segundos para cast completo
}

/**
 * Interface para projéteis ativos na cena
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
 * Classe que gerencia todo o sistema de magia do jogo
 * Inclui casting, projéteis, colisões e efeitos visuais
 */
export class MagicController {
    private scene: Scene;
    private playerController: PlayerController;
    private gameUI: GameUI;
    private targetMeshes: any[]; // Lista de alvos que podem ser atingidos (pode ser Mesh ou TransformNode)
    private humanoidTarget: any = null; // Referência direta ao humanóide para facilitar
    
    // Sistema de casting
    private isCasting: boolean = false;
    private castStartTime: number = 0;
    private currentSpell: SpellData | null = null;
    
    // Lista de projéteis ativos
    private activeProjectiles: Projectile[] = [];
    
    // Contador de magias lançadas (para UI)
    private spellsCast: number = 0;
    
    // Definições das magias disponíveis
    private readonly spells = {
        waterBallQuick: {
            name: 'Water Ball (Rápida)',
            manaCost: 5,
            projectileSpeed: 25,
            projectileSize: 0.3,
            damage: 15,
            color: new Color3(0.2, 0.6, 1.0), // Azul água
            castTime: 0 // Sem tempo de cast (instantânea)
        } as SpellData,
        
        waterBallCharged: {
            name: 'Water Ball (Carregada)',
            manaCost: 20,
            projectileSpeed: 15,
            projectileSize: 0.6,
            damage: 50,
            color: new Color3(0.1, 0.4, 0.9), // Azul mais escuro
            castTime: 2.0 // 2 segundos de cast
        } as SpellData
    };

    constructor(
        scene: Scene, 
        playerController: PlayerController, 
        gameUI: GameUI,
        targetMeshes: any[],
        humanoidTarget?: any
    ) {
        this.scene = scene;
        this.playerController = playerController;
        this.gameUI = gameUI;
        this.targetMeshes = targetMeshes;
        this.humanoidTarget = humanoidTarget;
        
        this.setupInputHandlers();
        console.log('🔮 Sistema de magia inicializado!');
    }

    /**
     * Configura os controles de mouse para o sistema de magia
     */
    private setupInputHandlers(): void {
        console.log('🖱️ Configurando controles de magia...');
        
        // Observar eventos do mouse na cena
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
        
        console.log('✅ Controles de magia configurados!');
    }

    /**
     * Inicia o processo de conjuração
     */
    private startCasting(): void {
        if (this.isCasting) return; // Já está conjurando
        
        console.log('🔮 Iniciando conjuração...');
        
        this.isCasting = true;
        this.castStartTime = performance.now();
        this.currentSpell = this.spells.waterBallCharged; // Começar com spell carregada
        
        // Mostrar barra de casting na UI
        this.gameUI.showCastingBar();
    }

    /**
     * Finaliza o processo de conjuração e lança a magia
     */
    private finishCasting(): void {
        if (!this.isCasting) return;
        
        const castTime = (performance.now() - this.castStartTime) / 1000; // Converter para segundos
        console.log(`⚡ Finalizando conjuração após ${castTime.toFixed(2)}s`);
        
        // Determinar qual magia lançar baseado no tempo de cast
        let spellTocast: SpellData;
        
        if (castTime < 0.2) {
            // Clique rápido - Water Ball pequena
            spellTocast = this.spells.waterBallQuick;
        } else if (castTime >= this.currentSpell!.castTime) {
            // Cast completo - Water Ball poderosa
            spellTocast = this.spells.waterBallCharged;
        } else {
            // Cast parcial - Water Ball intermediária
            const powerRatio = castTime / this.currentSpell!.castTime;
            spellTocast = {
                ...this.spells.waterBallCharged,
                manaCost: Math.ceil(this.spells.waterBallQuick.manaCost + 
                    (this.spells.waterBallCharged.manaCost - this.spells.waterBallQuick.manaCost) * powerRatio),
                projectileSize: this.spells.waterBallQuick.projectileSize + 
                    (this.spells.waterBallCharged.projectileSize - this.spells.waterBallQuick.projectileSize) * powerRatio,
                damage: Math.ceil(this.spells.waterBallQuick.damage + 
                    (this.spells.waterBallCharged.damage - this.spells.waterBallQuick.damage) * powerRatio)
            };
        }
        
        // Tentar lançar a magia
        this.castSpell(spellTocast);
        
        // Limpar estado de casting
        this.isCasting = false;
        this.currentSpell = null;
        this.gameUI.hideCastingBar();
    }

    /**
     * Lança uma magia específica
     */
    private castSpell(spell: SpellData): void {
        console.log(`🌊 Lançando ${spell.name}...`);
        
        // Verificar se tem mana suficiente
        if (!this.playerController.spendMana(spell.manaCost)) {
            console.log('❌ Mana insuficiente!');
            return;
        }
        
        // Criar o projétil
        this.createProjectile(spell);
        
        // Atualizar contador
        this.spellsCast++;
        
        console.log(`✨ ${spell.name} lançada! (Mana: -${spell.manaCost})`);
    }

    /**
     * Cria um projétil de magia
     */
    private createProjectile(spell: SpellData): void {
        // Criar mesh do projétil (esfera para Water Ball)
        const projectileMesh = MeshBuilder.CreateSphere(
            `projectile_${Date.now()}`,
            { diameter: spell.projectileSize * 2 },
            this.scene
        );
        
        // Material do projétil
        const projectileMaterial = new StandardMaterial(
            `projectileMaterial_${Date.now()}`,
            this.scene
        );
        projectileMaterial.diffuseColor = spell.color;
        projectileMaterial.emissiveColor = spell.color.scale(0.4); // Mais brilho próprio
        projectileMaterial.specularColor = new Color3(1, 1, 1); // Reflexo brilhante
        
        projectileMesh.material = projectileMaterial;
        
        // NOVA CORREÇÃO: Posicionar na ponta do cajado do jogador
        const staffTipPosition = this.playerController.getStaffTipPosition();
        const staffDirection = this.playerController.getStaffDirection().normalize();
        
        // Spawn na ponta do cajado, ligeiramente à frente para não colidir
        const spawnOffset = staffDirection.scale(0.3); // 30cm à frente da ponta
        const spawnPosition = staffTipPosition.add(spawnOffset);
        
        projectileMesh.position = spawnPosition;
        
        // Direção baseada na direção do cajado/câmera
        const direction = staffDirection.clone();
        
        // Criar dados do projétil
        const projectile: Projectile = {
            mesh: projectileMesh,
            direction: direction,
            speed: spell.projectileSpeed,
            damage: spell.damage,
            lifetime: 0,
            maxLifetime: 8 // 8 segundos antes de desaparecer
        };
        
        // Adicionar à lista de projéteis ativos
        this.activeProjectiles.push(projectile);
        
        // Efeito visual no projétil (rotação aleatória)
        projectileMesh.rotation.x = Math.random() * Math.PI * 2;
        projectileMesh.rotation.y = Math.random() * Math.PI * 2;
        
        // Efeito de brilho no cajado quando lança magia
        this.createStaffCastEffect();
        
        console.log(`🎯 Projétil criado na ponta do cajado: ${projectileMesh.position}`);
    }

    /**
     * Cria efeito visual no cajado quando lança magia
     */
    private createStaffCastEffect(): void {
        const staffTip = this.playerController.getStaffTipPosition();
        
        // Criar pequenas esferas brilhantes ao redor da ponta do cajado
        for (let i = 0; i < 5; i++) {
            const sparkle = MeshBuilder.CreateSphere(
                `sparkle_${Date.now()}_${i}`,
                { diameter: 0.08 },
                this.scene
            );
            
            // Material brilhante
            const sparkleMaterial = new StandardMaterial(`sparkleMat_${Date.now()}_${i}`, this.scene);
            sparkleMaterial.diffuseColor = new Color3(0.8, 0.9, 1.0);
            sparkleMaterial.emissiveColor = new Color3(0.5, 0.7, 1.0);
            sparkle.material = sparkleMaterial;
            
            // Posição aleatória ao redor da ponta do cajado
            const angle = (i / 5) * Math.PI * 2;
            const radius = 0.15;
            sparkle.position = staffTip.add(new Vector3(
                Math.cos(angle) * radius,
                Math.random() * 0.1 - 0.05,
                Math.sin(angle) * radius
            ));
            
            // Animar sparkle
            let lifetime = 0;
            const maxLifetime = 0.5;
            
            const animateSparkle = () => {
                lifetime += 0.016;
                
                if (lifetime >= maxLifetime) {
                    sparkle.dispose();
                    sparkleMaterial.dispose();
                    return;
                }
                
                // Movimento para cima e fade
                sparkle.position.y += 0.01;
                const alpha = 1 - (lifetime / maxLifetime);
                sparkleMaterial.alpha = alpha;
                
                requestAnimationFrame(animateSparkle);
            };
            
            animateSparkle();
        }
    }

    /**
     * Atualiza todos os projéteis ativos
     */
    public update(deltaTime: number): void {
        // Atualizar barra de casting se estiver conjurando
        if (this.isCasting && this.currentSpell) {
            const castTime = (performance.now() - this.castStartTime) / 1000;
            const progress = Math.min(castTime / this.currentSpell.castTime, 1.0);
            this.gameUI.updateCastingProgress(progress);
        }
        
        // Atualizar todos os projéteis
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.activeProjectiles[i];
            
            // Mover projétil
            const movement = projectile.direction.scale(projectile.speed * deltaTime);
            projectile.mesh.position.addInPlace(movement);
            
            // Atualizar tempo de vida
            projectile.lifetime += deltaTime;
            
            // Verificar colisões
            if (this.checkProjectileCollisions(projectile)) {
                // Colidiu - remover projétil
                this.removeProjectile(i);
                continue;
            }
            
            // Verificar se expirou
            if (projectile.lifetime > projectile.maxLifetime) {
                console.log('⏰ Projétil expirou');
                this.removeProjectile(i);
                continue;
            }
        }
        
        // Atualizar UI
        this.updateUI();
    }

    /**
     * Verifica colisões de um projétil com alvos
     */
    private checkProjectileCollisions(projectile: Projectile): boolean {
        const projectilePos = projectile.mesh.position;
        
        // Verificar colisão com cada alvo
        for (const target of this.targetMeshes) {
            let targetPos: Vector3;
            
            // Obter posição do alvo (pode ser Mesh ou TransformNode)
            if (target.position) {
                targetPos = target.position;
            } else if (target.getAbsolutePosition) {
                targetPos = target.getAbsolutePosition();
            } else {
                continue; // Não conseguiu obter posição, pular
            }
            
            const distance = Vector3.Distance(projectilePos, targetPos);
            
            // Raio de colisão baseado no tamanho do projétil
            const collisionRadius = (projectile.mesh.scaling.x * 0.5) + 1.0; // Raio mais generoso
            
            if (distance <= collisionRadius) {
                console.log(`💥 Projétil atingiu alvo! Dano: ${projectile.damage}`);
                
                // Ativar efeito visual no alvo
                this.hitTarget(target, targetPos);
                
                return true; // Colidiu
            }
        }
        
        // Verificar colisão com o chão (Y <= 0)
        if (projectilePos.y <= 0) {
            console.log('💥 Projétil atingiu o chão');
            return true;
        }
        
        return false; // Não colidiu
    }

    /**
     * Aplica efeito visual quando um alvo é atingido
     */
    private hitTarget(_target: any, targetPosition: Vector3): void {
        console.log('🎯 Aplicando efeito de impacto no humanóide...');
        
        // Usar referência direta ao humanóide se disponível
        if (this.humanoidTarget && this.humanoidTarget.takeDamage) {
            this.humanoidTarget.takeDamage();
        }
        
        // Criar efeito de partículas no local do impacto
        this.createImpactEffect(targetPosition);
    }
    
    /**
     * Cria efeito de partículas no impacto
     */
    private createImpactEffect(position: Vector3): void {
        const numParticles = 8;
        const particles: Mesh[] = [];
        
        for (let i = 0; i < numParticles; i++) {
            // Criar pequenas esferas como "gotas" de água
            const particle = MeshBuilder.CreateSphere(
                `particle_${Date.now()}_${i}`,
                { diameter: 0.1 },
                this.scene
            );
            
            // Material da partícula
            const particleMaterial = new StandardMaterial(`particleMat_${Date.now()}_${i}`, this.scene);
            particleMaterial.diffuseColor = new Color3(0.3, 0.7, 1.0); // Azul água
            particleMaterial.emissiveColor = new Color3(0.1, 0.3, 0.5);
            particle.material = particleMaterial;
            
            // Posição inicial no ponto de impacto
            particle.position = position.clone();
            
            // Direção aleatória para cada partícula
            const angle = (i / numParticles) * Math.PI * 2;
            const direction = new Vector3(
                Math.cos(angle) * 0.5,
                Math.random() * 0.3 + 0.2, // Para cima
                Math.sin(angle) * 0.5
            );
            
            particles.push(particle);
            
            // Animar partícula
            let lifetime = 0;
            const maxLifetime = 1.0; // 1 segundo
            const gravity = -9.8; // Gravidade
            
            const animateParticle = () => {
                lifetime += 0.016; // ~60 FPS
                
                if (lifetime >= maxLifetime) {
                    particle.dispose();
                    particleMaterial.dispose();
                    return;
                }
                
                // Movimento com gravidade
                direction.y += gravity * 0.016;
                particle.position.addInPlace(direction.scale(0.016));
                
                // Fade out
                const alpha = 1 - (lifetime / maxLifetime);
                particleMaterial.alpha = alpha;
                
                // Continuar animação
                requestAnimationFrame(animateParticle);
            };
            
            animateParticle();
        }
    }

    /**
     * Remove um projétil da lista e da cena
     */
    private removeProjectile(index: number): void {
        const projectile = this.activeProjectiles[index];
        
        // Remover mesh da cena
        projectile.mesh.dispose();
        
        // Remover da lista
        this.activeProjectiles.splice(index, 1);
    }

    /**
     * Atualiza elementos da UI relacionados à magia
     */
    private updateUI(): void {
        const spellCountElement = document.getElementById('spellCount');
        if (spellCountElement) {
            spellCountElement.textContent = this.spellsCast.toString();
        }
    }

    /**
     * Remove todos os projéteis da cena (usado no restart)
     */
    public clearAllProjectiles(): void {
        console.log('🧹 Removendo todos os projéteis...');
        
        for (const projectile of this.activeProjectiles) {
            projectile.mesh.dispose();
        }
        this.activeProjectiles = [];
        
        // Resetar contador de magias
        this.spellsCast = 0;
        this.updateUI();
        
        console.log('✅ Todos os projéteis removidos!');
    }

    /**
     * Limpa todos os recursos do sistema de magia
     */
    public dispose(): void {
        console.log('🧹 Limpando sistema de magia...');
        
        // Remover todos os projéteis ativos
        for (const projectile of this.activeProjectiles) {
            projectile.mesh.dispose();
        }
        this.activeProjectiles = [];
        
        console.log('✅ Sistema de magia limpo!');
    }
}