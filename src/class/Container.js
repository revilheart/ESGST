class Container {
  constructor() {
    /**
     * @type {import('../modules/Common').common}
     */
    this.common = null;
    /**
     * @type {import('./Esgst')}
     */
    this.esgst = null;
  }

  add(objs) {
    for (let name in objs) {
      if (!objs.hasOwnProperty(name)) {
        continue;
      }

      this[name] = objs[name];
    }
  }
}

const container = new Container;
export {container};
