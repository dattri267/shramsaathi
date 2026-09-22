const { createClient } = require('redis');

let redis;
let isRedisAvailable = false;

// In-memory fallback cache when Redis is offline
const memoryCache = new Map();

if (process.env.REDIS_URL) {
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 1) {
          // Stop retrying quickly if Redis server is offline
          return false;
        }
        return 500;
      }
    }
  });

  client.on('error', (err) => {
    isRedisAvailable = false;
    // Suppress noise when connection is refused
    if (err.code !== 'ECONNREFUSED' && err.message && !err.message.includes('ECONNREFUSED')) {
      console.warn('⚠️ Redis background warning:', err.message);
    }
  });

  client.on('end', () => {
    isRedisAvailable = false;
  });

  redis = {
    isOpen: false,
    connect: async () => {
      try {
        await client.connect();
        isRedisAvailable = true;
        redis.isOpen = true;
        console.log('✅ Redis connected successfully');
      } catch (err) {
        isRedisAvailable = false;
        redis.isOpen = false;
        console.warn('⚠️ Redis offline. Falling back to in-memory store.');
      }
    },
    get: async (key) => {
      if (isRedisAvailable && client.isOpen) {
        try {
          return await client.get(key);
        } catch (e) {
          isRedisAvailable = false;
        }
      }
      return memoryCache.get(key) || null;
    },
    set: async (key, value, options) => {
      if (isRedisAvailable && client.isOpen) {
        try {
          return await client.set(key, value, options);
        } catch (e) {
          isRedisAvailable = false;
        }
      }
      memoryCache.set(key, value);
    }
  };
} else {
  redis = {
    isOpen: false,
    connect: async () => {},
    get: async (key) => memoryCache.get(key) || null,
    set: async (key, value) => { memoryCache.set(key, value); },
    on: () => {}
  };
}

async function connectRedis() {
  if (process.env.REDIS_URL) {
    await redis.connect();
  } else {
    console.warn('⚠️ REDIS_URL is not set in .env. Using in-memory store.');
  }
}

module.exports = {
  redis,
  connectRedis
};
