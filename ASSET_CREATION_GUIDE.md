# Asset Creation Guide — Shattered Sanctum RPG

## Overview

All assets are optional — the engine has full procedural Canvas 2D fallbacks for every portrait and texture.
Dropping a real file at the correct path automatically replaces the procedural version.

**Total files to create:** 21
- 6 dungeon textures (wall + floor × 3 themes)
- 15 character portraits (4 party + 7 enemies + 4 NPCs)

---

## File Structure

```
rpg_01/
├── assets/
│   ├── portraits/
│   │   ├── warrior.png
│   │   ├── rogue.png
│   │   ├── mage.png
│   │   ├── cleric.png
│   │   ├── fungal_spider.png
│   │   ├── cave_troll.png
│   │   ├── shadow_acolyte.png
│   │   ├── corrupted_paladin.png
│   │   ├── outpost_warden.png
│   │   ├── corrupted_captain.png
│   │   ├── hollow_king.png
│   │   ├── npc_voss.png
│   │   ├── npc_mira.png
│   │   ├── npc_aldric.png
│   │   └── npc_archivist.png
│   └── textures/
│       └── dungeon/
│           ├── ruin_wall.png
│           ├── ruin_floor.png
│           ├── fungal_wall.png
│           ├── fungal_floor.png
│           ├── void_wall.png
│           └── void_floor.png
```

---

## Recommended Free Tools

| Tool | Best For | Free Limit | URL |
|------|----------|------------|-----|
| **Leonardo.ai** | Textures (tiling mode), portraits | 150 gen/day | leonardo.ai |
| **Bing Image Creator** | Portraits (DALL-E 3, no signup friction) | ~15 fast/day then slow | bing.com/images/create |
| **Adobe Firefly** | Seamless textures (tiling checkbox) | 25 credits/month | firefly.adobe.com |
| **Ideogram.ai** | Style-consistent portraits | 10/day | ideogram.ai |

**Recommended workflow:**
- Textures → Leonardo.ai (enable **Alchemy + Tiling** in generation settings)
- Portraits → Bing Image Creator (DALL-E 3 quality, completely free)
- If a portrait needs retrying with more control → Ideogram

---

## Style Anchor (apply to ALL assets)

Establish a consistent visual style by always including this in every prompt:

```
dark fantasy RPG, painterly art style, muted desaturated color palette,
atmospheric moody lighting, black background
```

This keeps all portraits visually coherent even generated across multiple sessions/tools.

---

## Part 1 — Dungeon Textures

### Specs
- **Size:** 256 × 256 px
- **Format:** PNG
- **Critical:** must tile seamlessly (use Leonardo Tiling mode or Adobe Firefly Seamless)
- **Drop path:** `assets/textures/dungeon/<name>.png`

### Tips
- In Leonardo: set **Tiling = ON** in the Alchemy panel before generating
- In Adobe Firefly: check **Seamless pattern** option
- Textures should have **no directional lighting** — the engine adds its own
- If output has a visible seam: run through [seamless.ai](https://www.seamlessai.com) (free) or GIMP Filters → Map → Make Seamless

---

### TEXTURE 1 — `ruin_wall.png`
**Theme:** Floor 1 — Ruined Military Outpost

```
seamless tileable dungeon wall texture, crumbling military outpost,
dark grey stone blocks with eroded mortar, iron ring mounts bolted
to stone, faded garrison carved relief, cold wet stone surface,
no directional lighting, game asset top-down RPG, 256x256
```

**Color palette reference:** Dark grey (#2a2a2a), charcoal mortar (#1a1a1a), rust-brown iron (#5a3a1a)

---

### TEXTURE 2 — `ruin_floor.png`
**Theme:** Floor 1 — Ruined Military Outpost

```
seamless tileable dungeon floor texture, ruined stone flagstones,
cracked dark grey slate, dirt accumulation in cracks, faint old
dried blood stains, scattered small pebbles, worn by boots,
no directional lighting, game asset RPG top-down view, 256x256
```

**Color palette reference:** Slate grey (#383838), dark earth fill (#2a1e10), faint rust (#3a1a0a)

---

### TEXTURE 3 — `fungal_wall.png`
**Theme:** Floor 2 — Fungal Warrens

```
seamless tileable cave wall texture, underground fungal cavern,
black wet basalt stone with thick purple and green mycelium veins
threading through cracks, small bioluminescent mushroom clusters
sprouting from the surface, green spore dots glowing faintly,
moist glistening surface, no directional lighting, dark fantasy
game asset, 256x256
```

**Color palette reference:** Black basalt (#0a0a0a), mycelium purple (#4a1a6a), bioluminescent green (#2a8a2a)

---

### TEXTURE 4 — `fungal_floor.png`
**Theme:** Floor 2 — Fungal Warrens

```
seamless tileable cave floor texture, underground fungal cavern,
dark damp soil with dense white mycelium root network spread across
surface, scattered small glowing mushrooms in purple and green,
moist black earth, bioluminescent spore patches, no directional
lighting, dark fantasy RPG game asset, 256x256
```

**Color palette reference:** Black earth (#0c0c08), mycelium white (#ccccaa), glow green (#1a6a1a)

---

### TEXTURE 5 — `void_wall.png`
**Theme:** Floor 3 — Shattered Sanctum

```
seamless tileable ancient sanctum wall texture, cracked black obsidian
stone blocks, thin crackling purple and white void energy running
through every fracture like veins of light, broken arcane seal rune
fragments carved into the stone surface, no directional lighting,
dark fantasy game asset RPG, 256x256
```

**Color palette reference:** Obsidian black (#080808), void purple (#6600aa), void white crack (#ccaaff)

---

### TEXTURE 6 — `void_floor.png`
**Theme:** Floor 3 — Shattered Sanctum

```
seamless tileable ancient sanctum floor texture, polished black stone,
glowing purple void energy veins running through it like cracks in glass,
faint incomplete arcane circle fragments visible, deep darkness, subtle
glow from beneath, no directional lighting, dark fantasy game asset
RPG, 256x256
```

**Color palette reference:** Polished black (#060408), void vein (#8800cc), faint glow (#3a0066)

---

## Part 2 — Character Portraits

### Specs
- **Output size:** any — crop and resize to **96 × 128 px** (portrait ratio 3:4)
- **Format:** PNG (transparency optional but nice)
- **Drop path:** `assets/portraits/<name>.png`

### Tips
- Use Bing Image Creator for speed (DALL-E 3 quality)
- Generate at high resolution then downscale to 96×128 — this anti-aliases automatically
- Crop tight: head to mid-chest, centered
- Keep the style anchor (`dark fantasy RPG, painterly, muted tones, black background`) in every prompt

---

### Style Anchor (paste into every portrait prompt)

```
dark fantasy RPG character portrait, bust shot head and shoulders,
black background, painterly digital art, muted desaturated color
palette with one accent color, atmospheric moody side lighting,
high detail face, game UI asset style
```

---

## PARTY CLASS PORTRAITS

### `warrior.png`

```
dark fantasy RPG character portrait, bust shot, battle-worn warrior
in heavy dented iron plate armor, blue kite shield at shoulder,
grey stubble, strong jaw, determined grim expression, scar on brow,
torchlight from below, black background, painterly digital art,
muted greys and blues, moody atmospheric
```

**Accent color:** Steel blue (#4477aa)
**Mood:** Determined, war-hardened

---

### `rogue.png`

```
dark fantasy RPG character portrait, bust shot, hooded shadow assassin,
deep purple-black cloak hood casting face in shadow, two faint violet
glowing eyes barely visible, twin dagger hilts at collar,
black background, painterly digital art, muted dark purples and blacks,
mysterious dangerous energy
```

**Accent color:** Violet (#8833cc)
**Mood:** Dangerous, concealed

---

### `mage.png`

```
dark fantasy RPG character portrait, bust shot, aged wizard in deep
blue star-patterned robes, tall pointed hat, glowing icy blue magical
orb on staff visible at frame edge, long silver beard, sharp intelligent
eyes full of arcane knowledge, black background, painterly digital art,
cool blue accent light
```

**Accent color:** Ice blue (#44aaff)
**Mood:** Ancient wisdom, contained power

---

### `cleric.png`

```
dark fantasy RPG character portrait, bust shot, holy cleric in white
and gold robes with cross tabard, warm golden halo glow behind head,
kind but battle-hardened face, ornate gold scepter top visible at edge,
black background, painterly digital art, warm golden accent lighting
```

**Accent color:** Holy gold (#ffcc44)
**Mood:** Compassionate, resolute

---

## ENEMY PORTRAITS

### `fungal_spider.png`

```
dark fantasy RPG enemy portrait, close-up bust, giant cave spider,
black chitinous body, purple mushroom caps growing from abdomen,
six compound eyes glowing bright green, pale segmented legs visible,
dripping luminescent spores, intimidating close angle, black background,
painterly, green bioluminescent accent
```

**Accent color:** Spore green (#44ff44)
**Mood:** Alien, venomous

---

### `cave_troll.png`

```
dark fantasy RPG enemy portrait, close-up bust, massive cave troll,
grey stone-like cracked rocky skin, heavily hunched low brow, two small
dim orange glowing deep-set eyes, flat wide nose, teeth like broken
rocks, saliva dripping, underground cavern light, black background,
painterly, orange glow accent
```

**Accent color:** Dim orange (#cc5500)
**Mood:** Brutish, unstoppable

---

### `shadow_acolyte.png`

```
dark fantasy RPG enemy portrait, bust shot, dark robed cultist,
pale face partially hidden by deep shadow hood, glowing violet eyes,
black triangular void mark tattoo on forehead, floating shadow smoke
particles drifting from shoulders, sinister calm expression, black
background, painterly, violet dark magic accent
```

**Accent color:** Void violet (#8800ff)
**Mood:** Fanatical calm, dark devotion

---

### `corrupted_paladin.png`

```
dark fantasy RPG enemy portrait, bust shot, fallen corrupted paladin,
cracked golden plate armor, left half of body glowing with holy golden
light, right half consumed by purple void corruption, face split:
left eye glowing gold, right eye glowing purple void, tortured
expression caught between two natures, black background, painterly
```

**Accent color:** Split — holy gold (#ffcc00) / void purple (#8800cc)
**Mood:** Tragic duality, internal war

---

### `outpost_warden.png`

```
dark fantasy RPG enemy portrait, bust shot, heavily armored dungeon
warden, full closed iron visor helmet with single thin horizontal
glowing blue eye slit, massive dark grey plate armor, crossed keys
emblem on chest piece, utterly still and imposing, cold blue accent
light, black background, painterly, menacing authority
```

**Accent color:** Cold blue (#4488cc)
**Mood:** Implacable, absolute authority

---

### `corrupted_captain.png`

```
dark fantasy RPG enemy portrait, bust shot, ghostly spectral sea captain,
translucent blue-white ethereal form barely holding shape, rotted
tricorn hat, hollow skull face with glowing blue eyes, tattered ghost
uniform with faded gold braid, mournful tragic expression, ghost
luminescence, black background, painterly
```

**Accent color:** Ghost blue (#44aaff)
**Mood:** Tragic, trapped, mournful

---

### `hollow_king.png`  *(Boss — most important, spend extra credits here)*

```
dark fantasy RPG boss character portrait, bust shot, the Hollow King
ancient void entity, crown of jagged black shadow spikes floating
above where a head should be, no physical face only swirling void
darkness, two massive eyes glowing white at the pupil bleeding out
to deep purple, crackling void energy tendrils, impossibly vast and
ancient, black background, painterly, epic villain energy, terrifying
and majestic
```

**Accent color:** Void white-to-purple (#ffffff → #8800cc)
**Mood:** Cosmic horror, ancient, inevitable
**Note:** Generate this one multiple times, pick the most striking composition

---

## NPC PORTRAITS

### `npc_voss.png`

```
dark fantasy RPG NPC portrait, bust shot, Commander Voss, grizzled
military commander in his 50s, dark navy military coat with tarnished
gold epaulettes, diagonal old scar across right cheek, short grey-
streaked dark hair, stern weathered face, experienced soldier who has
seen too much, black background, painterly, cool grey-blue tones
```

**Accent color:** Tarnished gold (#aa8833)
**Mood:** Weary authority, trustworthy veteran

---

### `npc_mira.png`

```
dark fantasy RPG NPC portrait, bust shot, Herbalist Mira, young woman
in her 30s, earthy green-brown herbalist robe, braided dark hair with
small wildflowers woven in, kind intelligent brown eyes, herb bundle
visible at shoulder, warm and approachable expression, underground
torchlight, black background, painterly, warm earthy green tones
```

**Accent color:** Herb green (#44aa44)
**Mood:** Warm, knowledgeable, trustworthy

---

### `npc_aldric.png`

```
dark fantasy RPG NPC portrait, bust shot, ghost of Captain Aldric,
translucent spectral form in the blue twilight of the afterlife,
tattered military uniform from another era, tricorn captain's hat,
mournful hollow eyes with subtle blue glow, pale ethereal face,
sad dignified expression, fading at the edges, black background,
painterly, ghost light atmosphere
```

**Accent color:** Spectral blue (#4488cc)
**Mood:** Mournful, dignified, at peace

---

### `npc_archivist.png`

```
dark fantasy RPG NPC portrait, bust shot, the Shadow Archivist,
ancient ageless scholar, layered robes that seem to absorb shadow,
silver-streaked black hair swept back from pale angular face,
knowing half-smile hiding centuries of secrets, one hand holding
a quill pen, sharp calculating eyes, subtle purple ambient light,
black background, painterly, mysterious erudite energy
```

**Accent color:** Shadow purple (#660099)
**Mood:** Unsettling calm, omniscient, ambiguous alignment

---

## Part 3 — Integration Code

After generating files and placing them in the correct folders, apply this patch to `src/engine/ui/CharacterPortrait.js`:

**Replace the `draw()` method:**

```javascript
static draw(canvas, typeKey) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const key = String(typeKey || 'unknown').toLowerCase().replace(/[^a-z_]/g, '_');

  const drawProcedural = () => {
    ctx.clearRect(0, 0, w, h);
    const fn = _P[key] || _P.unknown;
    fn(ctx, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  };

  const img = new Image();
  img.src = `assets/portraits/${key}.png`;
  img.onload = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  };
  img.onerror = drawProcedural;

  // Draw procedural immediately as placeholder while image loads
  drawProcedural();
}
```

Textures load automatically — `TextureGenerator` already checks `assets/textures/dungeon/<name>.png`
per the comment at the top of the file. No code change needed for textures.

---

## Checklist

### Textures (6 files)
- [ ] `ruin_wall.png`
- [ ] `ruin_floor.png`
- [ ] `fungal_wall.png`
- [ ] `fungal_floor.png`
- [ ] `void_wall.png`
- [ ] `void_floor.png`

### Party Portraits (4 files)
- [ ] `warrior.png`
- [ ] `rogue.png`
- [ ] `mage.png`
- [ ] `cleric.png`

### Enemy Portraits (7 files)
- [ ] `fungal_spider.png`
- [ ] `cave_troll.png`
- [ ] `shadow_acolyte.png`
- [ ] `corrupted_paladin.png`
- [ ] `outpost_warden.png`
- [ ] `corrupted_captain.png`
- [ ] `hollow_king.png`

### NPC Portraits (4 files)
- [ ] `npc_voss.png`
- [ ] `npc_mira.png`
- [ ] `npc_aldric.png`
- [ ] `npc_archivist.png`

---

## Quick Sizing Reference

| Asset Type | Canvas size | Crop tip |
|------------|-------------|----------|
| Portraits | 96 × 128 px | Head to mid-chest, centered horizontally |
| Textures | 256 × 256 px | Must tile (no visible seam at edges) |

Free resize tool: **squoosh.app** — drag image, set exact width/height, export PNG.
Free seam fix: **GIMP** → Filters → Map → Make Seamless (for textures that don't tile perfectly).
