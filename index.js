const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const Client = require("@replit/database");
const exphbs  = require('express-handlebars');
const { v4: uuidv4 } = require('uuid');
const { LRUCache } = require('./lru')
const { RateLimiterMemory } = require('rate-limiter-flexible');

const MAX_COMMANDS = 500;

const client = new Client();
const cache = new LRUCache(200);
const rateLimiter = new RateLimiterMemory({
  points: 10, // 500 points
  duration: 1, // per second
});
const users = {};

async function getValue(key) {
  const cachedValue = cache.get(key)
  // console.log('cached value: ', cachedValue)
  if (cachedValue) {
    return cachedValue
  }

  const value = await client.get(key)
  if (value != undefined) {
    cache.put(key, value)
  }
  return value;
}

function setValue(key, value) {
  return Promise.all([
    client.set(key, value),
    cache.put(key, value)
  ])
}

function getUserToken(userId) {
  return getValue(`u_${userId}`)
}

function getTokenUser(token) {
  return getValue(`t_${token}`)
}

function getUsername(userId) {
  return getValue(`i_${userId}`)
}

function setUsername(userId, username) {
  return setValue(`i_${userId}`, username)
}

function setUserToken(userId, token) {
  return Promise.all([
    setValue(`u_${userId}`, token),
    setValue(`t_${token}`, userId)
  ])
}

async function isBanned(userId) {
  return !!(await getValue(`b_${userId}`))
}

async function ban(userId) {
  await setValue(`b_${userId}`, true)
}

async function unban(userId) {
  await setValue(`b_${userId}`, false)
}

function getRequestingUser(req) {
  const userId = req.headers['x-replit-user-id']
  if (!userId) {
    return undefined
  }

  const username = req.headers['x-replit-user-name']
  const userRoles = req.headers['x-replit-user-roles']

  return {
    username, userId, userRoles
  }
}

function parseToken(token) {
  return token.split('_')
}

function makeTracker(socketId, username) {
  return {
    pushIdx: 0,
    commands: [],
    socketId,
    username
  }
}

function addUserCommand(userId, command) {
  users[userId].commands[users[userId].pushIdx] = command
  users[userId].pushIdx = ((users[userId].pushIdx + 1) % MAX_COMMANDS)
}

const app = express()
const httpServer = http.Server(app)
const io = new Server(httpServer, {
  cors: {
    origin: 'https://turtle-app.replitted.repl.co',
    methods: ['GET', 'POST'],
  }
})

app.engine('handlebars', exphbs.engine({extname: '.hbs'}));
app.set('view engine', 'handlebars');
app.set('views', './views')
app.use('/img', express.static('img'))
app.use('/script', express.static('script'))

app.all('/', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'https://turtle-app.replitted.repl.co');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

app.all('/token', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'https://turtle-app.replitted.repl.co');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

app.get('/', async function(req, res) {
  // Docs!
  // https://docs.replit.com/hosting/authenticating-users-repl-auth
  const user = getRequestingUser(req)
  let apiKey = null;
  if (user) {
    await setUsername(user.userId, user.username)
    apiKey = await getUserToken(user.userId)
    if (!apiKey) {
      apiKey = `${uuidv4()}_${user.userId}_${user.username}`
      await setUserToken(user.userId, apiKey)
    }
  }
  res.render('index', { user, apiKey, layout: 'default' , template: 'index'})
});

app.get('/token', async function(req, res) {
  console.log('asdfggg')
  console.log(req.headers)
  const user = getRequestingUser(req)
  let apiKey = null;
  if (user) {
    await setUsername(user.userId, user.username)
    apiKey = await getUserToken(user.userId)
    if (!apiKey) {
      apiKey = `${uuidv4()}_${user.userId}_${user.username}`
      await setUserToken(user.userId, apiKey)
    }
  }

  res.send({user, apiKey})
})

app.get('/ban', async function(req, res) {
  const user = getRequestingUser(req)
  if (!user.userRoles.includes('admin')) {
    res.status(403).send('Unauthorized');
    return;
  }

  const userId = req.query.userId
  if (!userId) {
    res.status(400).send('Bad request')
  }
  
  ban(userId)
  delete users[userId]
  io.emit('removeUser', {userId})
  res.status(200).send(`Success`)
})

app.get('/unban', async function(req, res) {
  const user = getRequestingUser(req)
  if (!user.userRoles.includes('admin')) {
    res.status(403).send('Unauthorized');
    return;
  }

  const userId = req.query.userId
  if (!userId) {
    res.status(400).send('Bad request')
  }
  
  unban(userId)
  res.status(200).send(`Success`)
})

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const userId = await getTokenUser(token)
  if (userId) {
    if (await isBanned(userId)) {
      console.log('Blacklisted user attempted to connect')
      next(new Error('No access'))
      return
    }
    if (!(userId in users)) {
      // const username = await getUsername(userId)
      const [_, __, username] = parseToken(token)
      socket.broadcast.emit('newUser', {userId, username})
      users[userId] = makeTracker(socket.id, username)
      next()
    } else {
      next()
    }
  } else {
    // unauthenticated request (browser page)
    // console.log('no token...')
    // next(new Error('You must log in!'))
    console.log('read only')
    socket._readOnly = true
    next()
  }
});

io.on("connection", async (socket) => {
  console.log(`connect ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`disconnect ${socket.id} due to ${reason}`);
  });

  socket.on("allUsers", (callback) => {
    // const allUsers = Object.keys(users).map(userId => {
    //   return {
    //     userId,
    //     username: users[userId].username
    //   }
    // })

    callback(users)
  })

  socket.on("draw", async (command) => {
    if (socket._readOnly) {
      return;
    }

    // at this point we've authenticated the user
    const token = socket.handshake.auth.token;
    const [_, userId, username] = parseToken(token)

    try {
      // await rateLimiter.consume(token);
      // socket.broadcast.emit("draw", socket.id, command)
      socket.broadcast.emit('draw', userId, command)
      addUserCommand(userId, command)
    } catch (rejRes) {
      console.log('failed', rejRes)
      // no available points to consume
      // emit error or warning message
      // console.log('blocked')
      socket.emit('blocked', { 'retry-ms': rejRes.msBeforeNext });
    }
  })
});

httpServer.listen(3000, function() {
   console.log('listening on *:3000');
});