// Sauce: https://dev.to/seanwelshbrown/implement-a-simple-lru-cache-in-javascript-4o92
class LRUCache {
  constructor(capacity) {
    this.cache = new Map();
    this.capacity = capacity;
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;

    let val = this.cache.get(key);

    this.cache.delete(key);
    this.cache.set(key, val);

    return val;
  }

  put(key, value) {
    this.cache.delete(key);

    if (this.cache.size === this.capacity) {
      this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, value);
    } else {
      this.cache.set(key, value);
    }
  }
}

module.exports = {
  LRUCache,
}