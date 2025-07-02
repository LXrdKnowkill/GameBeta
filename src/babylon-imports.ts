/**
 * Importações necessárias do Babylon.js
 * Este arquivo garante que todos os componentes side-effect sejam carregados
 */

// Core imports
import '@babylonjs/core/Engines/engine';
import '@babylonjs/core/scene';

// Material imports
import '@babylonjs/core/Materials/standardMaterial';
import '@babylonjs/core/Materials/Textures/texture';

// Light imports
import '@babylonjs/core/Lights/hemisphericLight';
import '@babylonjs/core/Lights/directionalLight';

// Shadow imports (crítico - resolve o erro principal)
import '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';

// Mesh imports
import '@babylonjs/core/Meshes/groundMesh';
import '@babylonjs/core/Meshes/meshBuilder';

// Camera imports
import '@babylonjs/core/Cameras/universalCamera';

// Input imports
import '@babylonjs/core/Events/pointerEvents';

// Ray imports (crítico para projéteis)
import '@babylonjs/core/Culling/ray';

// Math imports são automáticos

console.log('✅ Todas as importações do Babylon.js carregadas!');