/**
 * Dungeon Progression Validation Script
 * Validates that the Crypt of Shadows dungeon has proper progression mechanics
 */

class DungeonProgressionValidator {
    constructor() {
        this.floors = [];
        this.config = null;
        this.errors = [];
        this.warnings = [];
    }

    async loadDungeonData() {
        try {
            // Load configuration
            const configResponse = await fetch('./crypt-of-shadows-config.json');
            this.config = await configResponse.json();

            // Load all floor data
            for (const floorConfig of this.config.floors) {
                const floorResponse = await fetch(`./${floorConfig.file}`);
                const floorData = await floorResponse.json();
                this.floors.push({
                    config: floorConfig,
                    data: floorData
                });
            }
        } catch (error) {
            this.errors.push(`Failed to load dungeon data: ${error.message}`);
        }
    }

    validateProgression() {
        this.validateFloorSizes();
        this.validateKeyProgression();
        this.validateSafeZones();
        this.validateDifficultyScaling();
        this.validateLootProgression();
        this.validateTransitions();
        this.validateBossProgression();
    }

    validateFloorSizes() {
        const expectedSizes = [
            { floor: 1, min: 10, max: 10 },
            { floor: 2, min: 12, max: 12 },
            { floor: 3, min: 15, max: 15 },
            { floor: 4, min: 18, max: 18 },
            { floor: 5, min: 20, max: 20 }
        ];

        this.floors.forEach((floor, index) => {
            const expected = expectedSizes[index];
            const actual = { width: floor.data.width, height: floor.data.height };
            
            if (actual.width < expected.min || actual.width > expected.max ||
                actual.height < expected.min || actual.height > expected.max) {
                this.errors.push(
                    `Floor ${index + 1}: Size ${actual.width}x${actual.height} doesn't match expected ${expected.min}x${expected.max}`
                );
            }
        });
    }

    validateKeyProgression() {
        const keyProgression = ['bronze', 'silver', 'gold', 'master', 'ancient', 'shadow', 'final'];
        
        this.floors.forEach((floor, index) => {
            const doors = floor.data.doors || [];
            const keyItems = floor.data.keyItems || [];
            const scriptedEncounters = floor.data.scriptedEncounters || [];

            // Check that doors use appropriate key types for the floor
            doors.forEach(door => {
                if (door.locked && door.keyType) {
                    const keyIndex = keyProgression.indexOf(door.keyType);
                    if (keyIndex === -1) {
                        this.errors.push(`Floor ${index + 1}: Unknown key type '${door.keyType}'`);
                    } else if (keyIndex > index + 2) {
                        this.warnings.push(
                            `Floor ${index + 1}: Key type '${door.keyType}' might be too advanced for this floor`
                        );
                    }
                }
            });

            // Check that keys are obtainable on the floor
            const requiredKeys = doors.filter(d => d.locked).map(d => d.keyType);
            const availableKeys = [
                ...keyItems.map(k => k.itemId.replace('_key', '')),
                ...scriptedEncounters.flatMap(e => 
                    (e.rewards?.loot || [])
                        .filter(l => l.itemId.includes('_key'))
                        .map(l => l.itemId.replace('_key', ''))
                )
            ];

            requiredKeys.forEach(keyType => {
                if (keyType && !availableKeys.includes(keyType)) {
                    this.errors.push(
                        `Floor ${index + 1}: Required key '${keyType}' is not obtainable on this floor`
                    );
                }
            });
        });
    }

    validateSafeZones() {
        this.floors.forEach((floor, index) => {
            const safeZones = floor.data.safeZones || [];
            
            if (safeZones.length === 0) {
                this.errors.push(`Floor ${index + 1}: No safe zones found`);
                return;
            }

            safeZones.forEach(zone => {
                // Validate required services
                if (!zone.services || !zone.services.includes('save')) {
                    this.errors.push(`Floor ${index + 1}: Safe zone '${zone.name}' missing save service`);
                }
                if (!zone.services.includes('heal')) {
                    this.errors.push(`Floor ${index + 1}: Safe zone '${zone.name}' missing heal service`);
                }

                // Validate shop progression
                const expectedShopFloors = [2, 3, 4, 5]; // Floors that should have shops
                if (expectedShopFloors.includes(index + 1)) {
                    if (!zone.services.includes('shop')) {
                        this.warnings.push(
                            `Floor ${index + 1}: Safe zone '${zone.name}' should probably have shop service`
                        );
                    }
                }
            });
        });
    }

    validateDifficultyScaling() {
        this.floors.forEach((floor, index) => {
            const encounters = floor.data.scriptedEncounters || [];
            const expectedLevelRange = this.config.floors[index].targetLevel;

            encounters.forEach(encounter => {
                encounter.enemies?.forEach(enemy => {
                    if (enemy.level < expectedLevelRange.min - 1 || 
                        enemy.level > expectedLevelRange.max + 2) {
                        this.warnings.push(
                            `Floor ${index + 1}: Enemy level ${enemy.level} outside expected range ${expectedLevelRange.min}-${expectedLevelRange.max}`
                        );
                    }
                });
            });
        });
    }

    validateLootProgression() {
        const rarityProgression = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        
        this.floors.forEach((floor, index) => {
            const chests = floor.data.lootChests || [];
            
            if (chests.length === 0 && index > 0) {
                this.warnings.push(`Floor ${index + 1}: No loot chests found`);
            }

            // Check loot quality progression
            chests.forEach(chest => {
                chest.loot?.forEach(loot => {
                    // Basic validation - more complex loot quality checks would require item database
                    if (loot.chance > 1.0 || loot.chance < 0.0) {
                        this.errors.push(
                            `Floor ${index + 1}: Invalid loot chance ${loot.chance} for item ${loot.itemId}`
                        );
                    }
                });
            });
        });
    }

    validateTransitions() {
        this.floors.forEach((floor, index) => {
            const transitions = floor.data.transitions || [];
            
            if (transitions.length === 0) {
                this.errors.push(`Floor ${index + 1}: No transitions found`);
                return;
            }

            transitions.forEach(transition => {
                // Validate transition targets
                if (index < this.floors.length - 1) {
                    const expectedTarget = this.config.floors[index + 1].id;
                    if (transition.target !== expectedTarget && transition.target !== 'victory') {
                        this.errors.push(
                            `Floor ${index + 1}: Transition target '${transition.target}' doesn't match expected '${expectedTarget}'`
                        );
                    }
                } else {
                    // Last floor should lead to victory
                    if (transition.target !== 'victory') {
                        this.errors.push(
                            `Floor ${index + 1}: Final floor should transition to 'victory', not '${transition.target}'`
                        );
                    }
                }
            });
        });
    }

    validateBossProgression() {
        let miniBossCount = 0;
        let finalBossFound = false;

        this.floors.forEach((floor, index) => {
            const encounters = floor.data.scriptedEncounters || [];
            
            encounters.forEach(encounter => {
                if (encounter.type === 'mini_boss') {
                    miniBossCount++;
                } else if (encounter.type === 'boss') {
                    finalBossFound = true;
                    if (index !== this.floors.length - 1) {
                        this.errors.push(
                            `Floor ${index + 1}: Final boss should only be on the last floor`
                        );
                    }
                }
            });
        });

        if (miniBossCount < 2) {
            this.warnings.push(`Only ${miniBossCount} mini-bosses found, consider adding more for better progression`);
        }

        if (!finalBossFound) {
            this.errors.push('No final boss encounter found in the dungeon');
        }
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            dungeonName: this.config?.name || 'Unknown',
            totalFloors: this.floors.length,
            errors: this.errors,
            warnings: this.warnings,
            summary: {
                isValid: this.errors.length === 0,
                errorCount: this.errors.length,
                warningCount: this.warnings.length
            }
        };

        return report;
    }

    async validate() {
        await this.loadDungeonData();
        this.validateProgression();
        return this.generateReport();
    }
}

// Export for use in testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DungeonProgressionValidator;
}

// Browser usage
if (typeof window !== 'undefined') {
    window.DungeonProgressionValidator = DungeonProgressionValidator;
}