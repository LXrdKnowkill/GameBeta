/**
 * PlayerStats - Gerencia apenas dados estatísticos do jogador
 * Princípio da Responsabilidade Única: APENAS stats (mana, vida, etc.)
 */

import { MovementState } from './PlayerMovement';
import { Observable } from '@babylonjs/core/Misc/observable';

/**
 * Dados de estatísticas do jogador
 */
export interface PlayerStatsData {
    // Recursos
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    stamina: number;
    maxStamina: number;
    
    // Experiência
    experience: number;
    level: number;
    expToNextLevel: number;
    
    // Contadores
    spellsCast: number;
    damageDealt: number;
    damageTaken: number;
    
    // Estado
    isAlive: boolean;
    isExhausted: boolean;
    isLowMana: boolean;
}

/**
 * Configurações de regeneração
 */
export interface RegenConfig {
    manaRegenRate: number;        // Mana por segundo
    staminaRegenRate: number;     // Stamina por segundo
    healthRegenRate: number;      // Vida por segundo (fora de combate)
    
    // Modificadores baseados em estado
    restingMultiplier: number;    // Multiplicador quando parado
    movingMultiplier: number;     // Multiplicador quando andando
    runningMultiplier: number;    // Multiplicador quando correndo
    
    // Delays
    healthRegenDelay: number;     // Tempo sem tomar dano para regenerar vida
    combatStaminaDelay: number;   // Delay de stamina após ações
}

/**
 * Eventos de stats que outros sistemas podem observar
 */
export interface StatsEvents {
    onHealthChange: (current: number, max: number, delta: number) => void;
    onManaChange: (current: number, max: number, delta: number) => void;
    onStaminaChange: (current: number, max: number, delta: number) => void;
    onLevelUp: (newLevel: number, oldLevel: number) => void;
    onDeath: () => void;
    onRevive: () => void;
    onLowMana: () => void;
    onExhausted: () => void;
    onStatChanged: (statName: string, newValue: number, oldValue: number) => void;
}

/**
 * PlayerStats - Responsabilidade única: gerenciar dados estatísticos
 * NÃO conhece UI, movimento ou input - apenas emite eventos
 * NÃO processa lógica de jogo, apenas mantém e atualiza dados
 */
export class PlayerStats {
    // Stats principais
    private health: number = 100;
    private maxHealth: number = 100;
    private mana: number = 100;
    private maxMana: number = 100;
    private stamina: number = 100;
    private maxStamina: number = 100;
    
    // Sistema de experiência
    private experience: number = 0;
    private level: number = 1;
    
    // Contadores
    private spellsCast: number = 0;
    private damageDealt: number = 0;
    private damageTaken: number = 0;
    
    // Estado
    private isAlive: boolean = true;
    private lastDamageTime: number = 0;
    private lastStaminaUse: number = 0;
    
    // Configurações
    private regenConfig: RegenConfig = {
        manaRegenRate: 10,
        staminaRegenRate: 15,
        healthRegenRate: 5,
        restingMultiplier: 1.5,
        movingMultiplier: 1.0,
        runningMultiplier: 0.7,
        healthRegenDelay: 5000, // 5 segundos
        combatStaminaDelay: 2000 // 2 segundos
    };
    
    // Event system
    private events: Partial<StatsEvents> = {};

    public onManaChanged: Observable<{ current: number; max: number; percentage: number }> = new Observable();
    public onStatsChanged: Observable<PlayerStatsData> = new Observable();

    constructor() {
        this.initializeStats({
            maxHealth: 100,
            maxMana: 100,
            maxStamina: 100,
            startingLevel: 1
        });
        console.log('📊 PlayerStats criado (responsabilidade única)');
    }

    /**
     * Atualiza regeneração de stats baseado no tempo e estado
     */
    public update(deltaTime: number, movementState: MovementState): void {
        const currentTime = performance.now();
        
        this.updateManaRegen(deltaTime, movementState);
        this.updateStaminaRegen(deltaTime, movementState, currentTime);
        this.updateHealthRegen(deltaTime, movementState, currentTime);
        
        this.updateState();
    }

    /**
     * Atualiza regeneração de mana
     */
    private updateManaRegen(deltaTime: number, movementState: MovementState): void {
        if (this.mana >= this.maxMana) return;
        
        let regenRate = this.regenConfig.manaRegenRate;
        
        // Aplicar modificador baseado no estado
        switch (movementState) {
            case MovementState.IDLE:
                regenRate *= this.regenConfig.restingMultiplier;
                break;
            case MovementState.WALKING:
                regenRate *= this.regenConfig.movingMultiplier;
                break;
            case MovementState.RUNNING:
                regenRate *= this.regenConfig.runningMultiplier;
                break;
            case MovementState.JUMPING:
            case MovementState.FALLING:
                regenRate *= 0.5; // Reduzida no ar
                break;
        }
        
        const oldMana = this.mana;
        this.mana = Math.min(this.maxMana, this.mana + (regenRate * deltaTime));
        
        if (this.mana !== oldMana) {
            this.events.onManaChange?.(this.mana, this.maxMana, this.mana - oldMana);
            this.onManaChanged.notifyObservers(this.getMana());
            this.onStatsChanged.notifyObservers(this.getStatsData());
        }
    }

    /**
     * Atualiza regeneração de stamina
     */
    private updateStaminaRegen(deltaTime: number, movementState: MovementState, currentTime: number): void {
        if (this.stamina >= this.maxStamina) return;
        
        // Não regenerar se usou stamina recentemente
        if (currentTime - this.lastStaminaUse < this.regenConfig.combatStaminaDelay) return;
        
        let regenRate = this.regenConfig.staminaRegenRate;
        
        // Aplicar modificador baseado no estado
        switch (movementState) {
            case MovementState.IDLE:
                regenRate *= this.regenConfig.restingMultiplier;
                break;
            case MovementState.WALKING:
                regenRate *= this.regenConfig.movingMultiplier;
                break;
            case MovementState.RUNNING:
                regenRate *= 0.3; // Muito reduzida quando correndo
                break;
        }
        
        const oldStamina = this.stamina;
        this.stamina = Math.min(this.maxStamina, this.stamina + (regenRate * deltaTime));
        
        if (this.stamina !== oldStamina) {
            this.events.onStaminaChange?.(this.stamina, this.maxStamina, this.stamina - oldStamina);
            this.onStatsChanged.notifyObservers(this.getStatsData());
        }
    }

    /**
     * Atualiza regeneração de vida
     */
    private updateHealthRegen(deltaTime: number, movementState: MovementState, currentTime: number): void {
        if (this.health >= this.maxHealth) return;
        
        // Só regenerar se não tomou dano recentemente
        if (currentTime - this.lastDamageTime < this.regenConfig.healthRegenDelay) return;
        
        let regenRate = this.regenConfig.healthRegenRate;
        
        // Aplicar modificador baseado no estado
        if (movementState === MovementState.IDLE) {
            regenRate *= this.regenConfig.restingMultiplier;
        }
        
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + (regenRate * deltaTime));
        
        if (this.health !== oldHealth) {
            this.events.onHealthChange?.(this.health, this.maxHealth, this.health - oldHealth);
            this.onStatsChanged.notifyObservers(this.getStatsData());
        }
    }

    /**
     * Atualiza estado baseado nos stats atuais
     */
    private updateState(): void {
        const wasLowMana = this.isLowMana();
        const wasExhausted = this.isExhausted();
        
        // Verificar low mana
        if (!wasLowMana && this.isLowMana()) {
            this.events.onLowMana?.();
        }
        
        // Verificar exaustão
        if (!wasExhausted && this.isExhausted()) {
            this.events.onExhausted?.();
        }
    }

    // === MÉTODOS DE AÇÃO (para outros sistemas chamarem) ===

    /**
     * Tenta gastar mana
     */
    public spendMana(amount: number): boolean {
        if (this.mana < amount) {
            return false;
        }
        
        this.mana -= amount;
        
        this.events.onManaChange?.(this.mana, this.maxMana, -amount);
        this.onManaChanged.notifyObservers(this.getMana());
        this.onStatsChanged.notifyObservers(this.getStatsData());
        
        return true;
    }

    /**
     * Tenta gastar stamina
     */
    public spendStamina(amount: number): boolean {
        if (this.stamina < amount) {
            return false;
        }
        
        this.stamina -= amount;
        this.lastStaminaUse = performance.now();
        
        this.events.onStaminaChange?.(this.stamina, this.maxStamina, -amount);
        this.onStatsChanged.notifyObservers(this.getStatsData());
        
        return true;
    }

    /**
     * Aplica dano
     */
    public takeDamage(amount: number): boolean {
        if (!this.isAlive) return false;
        
        this.health = Math.max(0, this.health - amount);
        this.lastDamageTime = performance.now();
        this.damageTaken += amount;
        
        this.events.onHealthChange?.(this.health, this.maxHealth, -amount);
        this.onStatsChanged.notifyObservers(this.getStatsData());
        
        // Verificar morte
        if (this.health <= 0 && this.isAlive) {
            this.isAlive = false;
            this.events.onDeath?.();
            console.log('💀 Jogador morreu!');
        }
        
        return this.health <= 0;
    }

    /**
     * Cura o jogador
     */
    public heal(amount: number): void {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        if (this.health !== oldHealth) {
            this.events.onHealthChange?.(this.health, this.maxHealth, amount);
            this.onStatsChanged.notifyObservers(this.getStatsData());
        }
    }

    /**
     * Restaura mana
     */
    public restoreMana(amount: number): void {
        const oldMana = this.mana;
        this.mana = Math.min(this.maxMana, this.mana + amount);
        
        if (this.mana !== oldMana) {
            this.events.onManaChange?.(this.mana, this.maxMana, amount);
            this.onManaChanged.notifyObservers(this.getMana());
            this.onStatsChanged.notifyObservers(this.getStatsData());
        }
    }

    /**
     * Reviver jogador
     */
    public revive(healthPercentage: number = 0.5): void {
        if (this.isAlive) return;
        
        this.isAlive = true;
        this.health = this.maxHealth * healthPercentage;
        this.mana = this.maxMana * 0.25; // Pouca mana ao reviver
        
        this.events.onRevive?.();
        this.events.onHealthChange?.(this.health, this.maxHealth, this.health);
        this.events.onManaChange?.(this.mana, this.maxMana, this.mana);
        
        console.log('✨ Jogador revivido!');
        this.onStatsChanged.notifyObservers(this.getStatsData());
    }

    /**
     * Adiciona experiência
     */
    public addExperience(amount: number): void {
        this.experience += amount;
        
        // Verificar level up
        const expNeeded = this.getExpToNextLevel();
        if (this.experience >= expNeeded) {
            this.levelUp();
        }
    }

    /**
     * Level up
     */
    private levelUp(): void {
        const oldLevel = this.level;
        this.level++;
        
        // Calcular bônus de level up
        const healthBonus = 10;
        const manaBonus = 5;
        const staminaBonus = 5;
        
        this.maxHealth += healthBonus;
        this.maxMana += manaBonus;
        this.maxStamina += staminaBonus;
        
        // Restaurar stats
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        this.stamina = this.maxStamina;
        
        this.events.onLevelUp?.(this.level, oldLevel);
        console.log(`🎉 Level Up! Nível ${this.level} (Vida: +${healthBonus}, Mana: +${manaBonus}, Stamina: +${staminaBonus})`);
        this.onStatsChanged.notifyObservers(this.getStatsData());
    }

    /**
     * Registra que uma magia foi lançada
     */
    public recordSpellCast(): void {
        this.spellsCast++;
        this.events.onStatChanged?.('spellsCast', this.spellsCast, this.spellsCast - 1);
        this.onStatsChanged.notifyObservers(this.getStatsData());
    }

    /**
     * Registra dano causado
     */
    public recordDamageDealt(amount: number): void {
        this.damageDealt += amount;
        this.events.onStatChanged?.('damageDealt', this.damageDealt, this.damageDealt - amount);
        this.onStatsChanged.notifyObservers(this.getStatsData());
    }

    // === GETTERS ===

    /**
     * Retorna todos os dados de stats
     */
    public getStatsData(): PlayerStatsData {
        return {
            health: this.health,
            maxHealth: this.maxHealth,
            mana: this.mana,
            maxMana: this.maxMana,
            stamina: this.stamina,
            maxStamina: this.maxStamina,
            experience: this.experience,
            level: this.level,
            expToNextLevel: this.getExpToNextLevel(),
            spellsCast: this.spellsCast,
            damageDealt: this.damageDealt,
            damageTaken: this.damageTaken,
            isAlive: this.isAlive,
            isExhausted: this.isExhausted(),
            isLowMana: this.isLowMana()
        };
    }

    /**
     * Dados de mana
     */
    public getMana(): { current: number; max: number; percentage: number } {
        return {
            current: this.mana,
            max: this.maxMana,
            percentage: this.mana / this.maxMana
        };
    }

    /**
     * Dados de vida
     */
    public getHealth(): { current: number; max: number; percentage: number } {
        return {
            current: this.health,
            max: this.maxHealth,
            percentage: this.health / this.maxHealth
        };
    }

    /**
     * Dados de stamina
     */
    public getStamina(): { current: number; max: number; percentage: number } {
        return {
            current: this.stamina,
            max: this.maxStamina,
            percentage: this.stamina / this.maxStamina
        };
    }

    /**
     * Verifica se tem mana suficiente
     */
    public hasEnoughMana(amount: number): boolean {
        return this.mana >= amount;
    }

    /**
     * Verifica se tem stamina suficiente
     */
    public hasEnoughStamina(amount: number): boolean {
        return this.stamina >= amount;
    }

    /**
     * Verifica se está com mana baixa
     */
    public isLowMana(): boolean {
        return this.mana / this.maxMana < 0.25;
    }

    /**
     * Verifica se está exausto
     */
    public isExhausted(): boolean {
        return this.stamina / this.maxStamina < 0.15;
    }

    /**
     * Verifica se está vivo
     */
    public getIsAlive(): boolean {
        return this.isAlive;
    }

    /**
     * Calcula experiência necessária para próximo nível
     */
    private getExpToNextLevel(): number {
        return this.level * 100; // Fórmula simples: nível * 100
    }

    // === EVENT SYSTEM ===

    /**
     * Registra callback para eventos de stats
     */
    public setEventCallback<K extends keyof StatsEvents>(
        event: K, 
        callback: StatsEvents[K]
    ): void {
        this.events[event] = callback;
    }

    // === CONFIGURATION ===

    /**
     * Atualiza configurações de regeneração
     */
    public updateRegenConfig(newConfig: Partial<RegenConfig>): void {
        this.regenConfig = { ...this.regenConfig, ...newConfig };
    }

    /**
     * Define stats máximos
     */
    public setMaxStats(maxHealth?: number, maxMana?: number, maxStamina?: number): void {
        if (maxHealth !== undefined) {
            this.maxHealth = maxHealth;
            this.health = Math.min(this.health, this.maxHealth);
        }
        
        if (maxMana !== undefined) {
            this.maxMana = maxMana;
            this.mana = Math.min(this.mana, this.maxMana);
        }
        
        if (maxStamina !== undefined) {
            this.maxStamina = maxStamina;
            this.stamina = Math.min(this.stamina, this.maxStamina);
        }
    }

    // === CONTROL ===

    /**
     * Reseta todos os stats
     */
    public reset(): void {
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        this.stamina = this.maxStamina;
        this.isAlive = true;
        this.lastDamageTime = 0;
        this.lastStaminaUse = 0;
        
        // Manter level e experiência, resetar apenas contadores de combate
        this.damageTaken = 0;
        
        console.log('🔄 PlayerStats resetado');
        this.onStatsChanged.notifyObservers(this.getStatsData());
    }

    /**
     * Reseta completamente (incluindo level)
     */
    public fullReset(): void {
        this.reset();
        this.level = 1;
        this.experience = 0;
        this.spellsCast = 0;
        this.damageDealt = 0;
        
        // Resetar stats máximos para nível 1
        this.maxHealth = 100;
        this.maxMana = 100;
        this.maxStamina = 100;
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        this.stamina = this.maxStamina;
        
        console.log('🔄 PlayerStats completamente resetado');
        this.onStatsChanged.notifyObservers(this.getStatsData());
    }

    /**
     * Limpa recursos
     */
    public dispose(): void {
        console.log('🧹 Limpando PlayerStats...');
        this.events = {};
        console.log('✅ PlayerStats limpo!');
    }

    private initializeStats(config: {
        maxHealth: number;
        maxMana: number;
        maxStamina: number;
        startingLevel: number;
    }): void {
        this.maxHealth = config.maxHealth;
        this.maxMana = config.maxMana;
        this.maxStamina = config.maxStamina;
        this.level = config.startingLevel;
        
        // Inicializar stats no máximo
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        this.stamina = this.maxStamina;
    }
} 