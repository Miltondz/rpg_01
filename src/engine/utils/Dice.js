export class Dice {
  constructor(throws, faces, modifier = 0) {
    this.throws   = throws;
    this.faces    = faces;
    this.modifier = modifier;
  }

  static parse(expr) {
    const m = String(expr).match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!m) throw new Error(`Invalid dice expression: ${expr}`);
    return new Dice(+m[1], +m[2], m[3] ? +m[3] : 0);
  }

  roll() {
    let v = 0;
    for (let i = 0; i < this.throws; i++) v += Math.floor(Math.random() * this.faces) + 1;
    return v + this.modifier;
  }

  get min() { return this.throws + this.modifier; }
  get max() { return this.throws * this.faces + this.modifier; }

  toString() {
    const mod = this.modifier === 0 ? '' : (this.modifier > 0 ? `+${this.modifier}` : `${this.modifier}`);
    return `${this.throws}d${this.faces}${mod}`;
  }
}

export const DC = {
  VeryEasy:         0,
  Easy:             10,
  Average:          15,
  Tough:            20,
  Hard:             25,
  Challenging:      30,
  NearlyImpossible: 40,
};
