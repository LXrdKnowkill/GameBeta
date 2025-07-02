/**
 * Ponte entre o estado de movimento e as animações do modelo 3D.
 * Recebe um estado (ex: WALKING) e diz ao ExternalAssetCharacter qual animação tocar (ex: "walk").
 */

import { MovementState } from './PlayerMovement';
import { ExternalAssetCharacter } from './ExternalAssetCharacter';

export class CharacterAnimator {
    private characterLoader: ExternalAssetCharacter;

    constructor(characterLoader: ExternalAssetCharacter) {
        this.characterLoader = characterLoader;
    }

    /**
     * Atualiza a animação com base no estado de movimento do jogador.
     * @param newState O novo estado de movimento (IDLE, WALKING, etc.).
     * @param speed A velocidade horizontal atual do jogador.
     */
    public updateAnimationState(newState: MovementState, speed: number): void {
        console.log(`%c[Animator] Tentando atualizar animação. Novo Estado: ${newState}, Velocidade: ${speed.toFixed(2)}`, 'color: #3498db; font-weight: bold;');

        let stateName = 'idle';
        let loop = true;

        switch (newState) {
            case MovementState.IDLE:
                stateName = 'idle';
                break;
            case MovementState.WALKING:
                stateName = 'walk';
                break;
            case MovementState.RUNNING:
                stateName = 'run';
                break;
            case MovementState.JUMPING:
                stateName = 'jumpStart';
                loop = false; // Animação de início de pulo não deve repetir
                break;
            case MovementState.FALLING:
                stateName = 'jumpLoop'; // Animação de loop no ar
                break;
            case MovementState.LANDING:
                stateName = 'jumpEnd';
                loop = false; // Animação de pouso não deve repetir
                break;
        }

        // Delega a reprodução da animação para o sistema que a controla
        console.log(`%c[Animator] Mapeado para a animação: "${stateName}". Loop: ${loop}.`, 'color: #3498db');
        this.characterLoader.playAnimation(stateName, loop);

        // Ajusta a velocidade da animação para sincronizar com o movimento
        if (newState === MovementState.WALKING || newState === MovementState.RUNNING) {
            // Em um sistema real, a velocidade base viria do arquivo de animação
            const baseSpeed = (newState === MovementState.WALKING) ? 1.0 : 2.0; 
            this.characterLoader.setAnimationSpeed(speed / baseSpeed);
        } else {
            this.characterLoader.setAnimationSpeed(1.0);
        }
    }

    /**
     * Método de atualização chamado a cada frame (para futuras lógicas de blending).
     */
    public update(_deltaTime: number): void {
        // Placeholder: No futuro, aqui entraria a lógica de blending suave entre animações.
    }

    /**
     * Limpa os recursos. (Neste caso, não há muito a limpar)
     */
    public dispose(): void {
        console.log('✅ CharacterAnimator (ponte) limpo!');
    }
}