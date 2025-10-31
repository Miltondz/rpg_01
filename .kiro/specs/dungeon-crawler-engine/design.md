# Design Document

## Overview

The dungeon crawler engine is built using a modular architecture with Three.js for 3D rendering and vanilla JavaScript for game logic. The system uses a grid-based coordinate system where all movement occurs in discrete 2x2 meter tiles, with smooth interpolated animations between positions.

The core architecture separates concerns into distinct systems: rendering, movement, collision detection, input handling, and level management. This design ensures maintainable code and allows for easy extension of features in future phases.

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Input Manager │────│Movement Controller│────│ Collision System│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Bus     │────│   Grid System   │────│   Door System   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Renderer     │────│ Dungeon Loader  │────│ Geometry Factory│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Input Capture**: Input Manager captures keyboard events and queues actions
2. **Movement Processing**: Movement Controller validates and executes movement commands
3. **Collision Checking**: Collision System verifies movement validity against grid data
4. **Animation**: Movement Controller interpolates camera position/rotation over time
5. **Rendering**: Renderer updates Three.js scene and camera each frame
6. **Level Management**: Dungeon Loader handles level transitions and geometry updates

## Components and Interfaces

### Grid System

**Purpose**: Manages the discrete coordinate system and tile data storage.

**Key Methods**:
```javascript
class GridSystem {
  // Convert between coordinate systems
  gridToWorld(gridX, gridZ) → {x, z}
  worldToGrid(worldX, worldZ) → {x, z}
  
  // Tile management
  setTile(x, z, tileData)
  getTile(x, z) → tileData | null
  isValidPosition(x, z) → boolean
  
  // Utility
  getAdjacentTiles(x, z) → Array<tileData>
}
```

**Tile Data Structure**:
```javascript
{
  type: 'floor' | 'wall' | 'door' | 'transition' | 'empty',
  walkable: boolean,
  // Door-specific properties
  closed?: boolean,
  locked?: boolean,
  keyType?: 'bronze' | 'silver' | 'gold',
  orientation?: 'vertical' | 'horizontal',
  // Transition-specific properties
  targetLevel?: string,
  targetSpawn?: {x: number, z: number, direction: number}
}
```

### Movement Controller

**Purpose**: Handles player movement, rotation, and animation interpolation.

**State Management**:
```javascript
class MovementController {
  constructor() {
    this.currentPosition = {x: 0, z: 0};
    this.currentDirection = 0; // 0=North, 1=East, 2=South, 3=West
    this.isAnimating = false;
    this.animationData = null;
  }
  
  // Movement commands
  moveForward() → Promise<boolean>
  moveBackward() → Promise<boolean>
  strafeLeft() → Promise<boolean>
  strafeRight() → Promise<boolean>
  turnLeft() → Promise<void>
  turnRight() → Promise<void>
  
  // Animation system
  update(deltaTime)
  startAnimation(type, startPos, targetPos, duration)
}
```

**Animation System**:
- Uses time-based interpolation with ease-out cubic easing
- Blocks input during animation to prevent conflicts
- Guarantees exact final positioning to prevent float accumulation
- Supports both position and rotation animations

### Collision System

**Purpose**: Validates movement attempts and handles special tile interactions.

**Interface**:
```javascript
class CollisionSystem {
  checkMovement(fromX, fromZ, toX, toZ) → {
    blocked: boolean,
    reason?: string,
    data?: object
  }
  
  // Specific checks
  isWalkable(x, z) → boolean
  isDoor(x, z) → boolean
  isTransition(x, z) → boolean
  canOpenDoor(x, z, playerKeys) → boolean
}
```

**Collision Rules**:
- Wall tiles always block movement
- Empty tiles (outside bounds) block movement
- Locked doors block movement unless player has correct key
- Closed doors trigger automatic opening if unlocked
- Transition tiles allow movement and trigger level change

### Door System

**Purpose**: Manages door states, animations, and key interactions.

**Door Management**:
```javascript
class DoorSystem {
  createDoor(x, z, properties)
  openDoor(x, z) → Promise<void>
  closeDoor(x, z) → Promise<void>
  isDoorOpen(x, z) → boolean
  
  // Animation
  update(deltaTime)
  animateDoorSlide(door, direction, duration)
}
```

**Door Animation**:
- Doors slide perpendicular to their orientation
- Vertical doors slide along Z-axis, horizontal doors slide along X-axis
- Animation duration: 300ms with ease-out easing
- Door geometry remains visible but moves out of walkable area

### Input Manager

**Purpose**: Captures keyboard input and manages action queuing.

**Key Mapping**:
```javascript
const keyMap = {
  'KeyW': 'forward',
  'ArrowUp': 'forward',
  'KeyS': 'backward', 
  'ArrowDown': 'backward',
  'KeyA': 'turnLeft',
  'ArrowLeft': 'turnLeft',
  'KeyD': 'turnRight',
  'ArrowRight': 'turnRight',
  'KeyQ': 'strafeLeft',
  'KeyE': 'strafeRight',
  'Space': 'interact'
};
```

**Input Processing**:
- Maintains action queue to prevent input loss
- Blocks input during animations
- Implements cooldown to prevent accidental double-input
- Processes one action per frame when not animating

### Renderer

**Purpose**: Manages Three.js scene, camera, lighting, and geometry.

**Scene Setup**:
```javascript
class Renderer {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({canvas, antialias: false});
    
    this.setupLighting();
    this.setupFog();
  }
  
  // Geometry management
  addFloor(x, z)
  addWall(x, z)
  addCeiling(x, z)
  addDoor(x, z, orientation)
  clearScene()
  
  // Rendering
  render()
  updateCamera(position, rotation)
}
```

**Lighting Configuration**:
- Ambient light: Low intensity (0.4) warm white
- Point light: Attached to camera, simulates torch (orange, intensity 1.0, range 10m)
- Optional directional light: Top-down for general illumination
- Fog: Black fog starting at 1m, full opacity at 12m for atmosphere

### Dungeon Loader

**Purpose**: Loads level data from JSON and generates 3D geometry.

**JSON Format**:
```javascript
{
  "id": "level_identifier",
  "width": 20,
  "height": 20,
  "spawn": {x: 1, z: 1, direction: 0},
  "tiles": [2, 2, 2, 1, 1, ...], // Flat array: width × height
  "doors": [
    {x: 5, z: 0, orientation: "vertical", locked: false, keyType: null}
  ],
  "transitions": [
    {x: 18, z: 18, type: "stairs", target: "next_level", spawn: {x: 1, z: 1}}
  ]
}
```

**Loading Process**:
1. Fetch and parse JSON data
2. Clear existing scene geometry
3. Build grid data structure from tiles array
4. Generate floor, wall, and ceiling meshes
5. Instantiate doors with correct properties
6. Register transition tiles
7. Position player at spawn point

## Data Models

### Player State
```javascript
{
  position: {x: number, z: number},
  direction: number, // 0-3 for N,E,S,W
  keys: Array<string>, // ['bronze', 'silver', 'gold']
  health: number,
  level: string // Current level identifier
}
```

### Animation State
```javascript
{
  type: 'move' | 'rotate',
  startTime: number,
  duration: number,
  startValue: Vector3 | number,
  targetValue: Vector3 | number,
  easingFunction: Function
}
```

### Level Data
```javascript
{
  id: string,
  dimensions: {width: number, height: number},
  spawn: {x: number, z: number, direction: number},
  grid: Map<string, TileData>, // Key: "x,z"
  doors: Map<string, DoorData>,
  transitions: Map<string, TransitionData>
}
```

## Error Handling

### Movement Errors
- **Invalid Position**: Log warning, maintain current position
- **Collision**: Provide user feedback, play blocked sound effect
- **Animation Conflict**: Queue action for after current animation
- **Out of Bounds**: Block movement, show boundary message

### Loading Errors
- **Missing JSON**: Show error message, load fallback level
- **Malformed Data**: Validate and use defaults for missing properties
- **Asset Loading**: Graceful degradation with placeholder geometry
- **Memory Issues**: Implement cleanup and retry mechanism

### Rendering Errors
- **WebGL Context Loss**: Detect and reinitialize renderer
- **Performance Degradation**: Reduce quality settings automatically
- **Geometry Errors**: Use fallback primitive shapes
- **Shader Compilation**: Fall back to basic materials

## Testing Strategy

### Unit Testing
- **Grid System**: Coordinate conversion accuracy, tile management
- **Movement Controller**: Direction calculations, animation timing
- **Collision System**: All collision scenarios, edge cases
- **Door System**: State transitions, animation completion
- **Input Manager**: Key mapping, action queuing

### Integration Testing
- **Movement Flow**: Input → Movement → Collision → Animation → Render
- **Level Transitions**: Complete transition cycle with cleanup
- **Door Interactions**: Movement triggering door opening
- **Performance**: Frame rate stability under various conditions

### Manual Testing Scenarios
1. **Basic Movement**: Walk in all directions, verify smooth animation
2. **Collision Testing**: Attempt to walk through walls, verify blocking
3. **Door Interaction**: Open locked/unlocked doors, verify animations
4. **Level Transitions**: Move between levels, verify proper loading
5. **Edge Cases**: Spam input, resize window, long gameplay sessions
6. **Performance**: Large dungeons (20×20), multiple doors, complex geometry

### Performance Benchmarks
- **Target FPS**: 60fps sustained in 20×20 dungeon
- **Memory Usage**: <300MB after 10 minutes gameplay
- **Loading Time**: <1 second for standard level
- **Animation Smoothness**: No frame drops during movement
- **Input Responsiveness**: <50ms from keypress to action start

### Automated Testing
```javascript
// Example test structure
describe('MovementController', () => {
  test('should move forward correctly', () => {
    const controller = new MovementController();
    controller.setPosition(5, 5, 0); // North
    const result = controller.calculateForwardPosition();
    expect(result).toEqual({x: 5, z: 4});
  });
  
  test('should handle animation timing', async () => {
    const startTime = performance.now();
    await controller.moveForward();
    const endTime = performance.now();
    expect(endTime - startTime).toBeCloseTo(250, 50); // 250ms ±50ms
  });
});
```

This design provides a solid foundation for implementing the dungeon crawler engine with clear separation of concerns, robust error handling, and comprehensive testing coverage.