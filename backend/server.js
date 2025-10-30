const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const registerSocketHandlers = require('./services/socketHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// --- Middleware ---

// CORS configuration
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST"]
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());

// --- Socket.io Setup ---

const io = new Server(server, {
  cors: corsOptions
});

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);
  
  // Register all event handlers for this socket
  registerSocketHandlers(io, socket);
});

// --- API Routes ---

app.get('/', (req, res) => {
  res.send('Connect Four Backend is running.');
});

// Leaderboard API
app.use('/api', require('./routes/api'));

// --- Start Server ---

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
