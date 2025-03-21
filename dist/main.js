"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken")); // Import JWT
const cors_1 = __importDefault(require("cors")); // Import CORS
const dotenv = __importStar(require("dotenv")); // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
const app = (0, express_1.default)();
const PORT = 5038;
const ip = '192.168.178.52';
const SECRET_KEY = process.env.key443 || 'your_secret_key'; // Use environment variable or default
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1]; // "Bearer TOKEN"
        jsonwebtoken_1.default.verify(token, SECRET_KEY, (err, user) => {
            if (err) {
                return res.sendStatus(403); // Forbidden
            }
            req.user = user;
            next();
        });
    }
    else {
        res.sendStatus(401); // Unauthorized
    }
};
// Helper function to ensure a directory exists
function ensureDirectoryExists(dirPath) {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}
// Function to get Roblox game name by ID (no auth needed)
function getRobloxGameName(placeId) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const url = `https://api.roblox.com/marketplace/productinfo?assetId=${placeId}`;
            https_1.default.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(data);
                        if (parsedData && parsedData.Name) {
                            resolve(parsedData.Name);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    catch (error) {
                        console.error('Error parsing JSON:', error);
                        reject(error);
                    }
                });
            }).on('error', (error) => {
                console.error('Error fetching game name:', error);
                reject(error);
            });
        });
    });
}
// Login route - generates a token
app.post('/login', (req, res) => {
    const { username } = req.body;
    if (username) {
        // In a real application, you'd validate the username against a database
        const user = { username: username }; // Simplified user object
        const token = jsonwebtoken_1.default.sign(user, SECRET_KEY); //Removed expireIn to allow for auto relog
        res.json({ token: token, username: username }); // Send token and username
    }
    else {
        res.status(400).send('Missing username');
    }
});
// POST route for /execute - PROTECTED
app.post('/execute', authenticateJWT, (req, res) => {
    const { playerName, placeId, content } = req.body;
    if (!playerName || !placeId || !content) {
        res.status(400).send('Missing required fields: playerName, placeId, or content.');
        return;
    }
    try {
        const scriptFilePath = path_1.default.join(__dirname, 'data', 'games', placeId, playerName, 'cScript.txt');
        ensureDirectoryExists(path_1.default.dirname(scriptFilePath));
        fs_1.default.writeFileSync(scriptFilePath, content);
        res.status(200).send(`Content written successfully to ${scriptFilePath}`);
    }
    catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('An error occurred while processing your request.');
    }
});
// GET route for /get_script - PROTECTED
app.get('/get_script', authenticateJWT, (req, res) => {
    const { playerName, placeId } = req.query;
    if (!playerName || !placeId) {
        res.status(400).send('Missing required query parameters: playerName or placeId.');
        return;
    }
    try {
        const scriptFilePath = path_1.default.join(__dirname, 'data', 'games', placeId.toString(), playerName.toString(), 'cScript.txt');
        ensureDirectoryExists(path_1.default.dirname(scriptFilePath));
        if (!fs_1.default.existsSync(scriptFilePath)) {
            fs_1.default.writeFileSync(scriptFilePath, ''); // Create empty file if it doesn't exist
            console.log(`Created file: ${scriptFilePath}`);
        }
        const scriptContent = fs_1.default.readFileSync(scriptFilePath, 'utf8');
        res.status(200).type('text/plain').send(scriptContent);
    }
    catch (error) {
        console.error('Error retrieving script:', error);
        res.status(500).send('An error occurred while retrieving the script.');
    }
});
// New route for /create_game - PROTECTED
app.post('/create_game', authenticateJWT, (req, res) => {
    const { placeId } = req.body;
    if (!placeId) {
        res.status(400).send('Missing required field: placeId.');
        return;
    }
    try {
        const gameFolderPath = path_1.default.join(__dirname, 'data', 'games', placeId.toString());
        ensureDirectoryExists(gameFolderPath);
        res.status(200).send(`Game folder created successfully: ${gameFolderPath}`);
    }
    catch (error) {
        console.error('Error creating game folder:', error);
        res.status(500).send('An error occurred while creating the game folder.');
    }
});
// New route for /create_user - PROTECTED
app.post('/create_user', authenticateJWT, (req, res) => {
    const { placeId, username } = req.body;
    if (!placeId || !username) {
        res.status(400).send('Missing required fields: placeId or username.');
        return;
    }
    try {
        const userFolderPath = path_1.default.join(__dirname, 'data', 'games', placeId.toString(), username);
        ensureDirectoryExists(userFolderPath);
        res.status(200).send(`User folder created successfully: ${userFolderPath}`);
    }
    catch (error) {
        console.error('Error creating user folder:', error);
        res.status(500).send('An error occurred while creating the user folder.');
    }
});
// GET route for /get_games - PROTECTED
app.get('/get_games', authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const gamesDirectory = path_1.default.join(__dirname, 'data', 'games');
    fs_1.default.readdir(gamesDirectory, (err, files) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            console.error('Error reading games directory:', err);
            res.status(500).send('Error reading games directory');
            return;
        }
        // Filter out non-directory files
        const gameFolders = files.filter(file => {
            const filePath = path_1.default.join(gamesDirectory, file);
            return fs_1.default.statSync(filePath).isDirectory();
        });
        res.status(200).json(gameFolders);
    }));
}));
// GET route for /get_scripts - PROTECTED
app.get('/get_scripts', authenticateJWT, (req, res) => {
    const scriptsFilePath = path_1.default.join(__dirname, 'scripts.json');
    fs_1.default.readFile(scriptsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading scripts.json:', err);
            res.status(500).send('Error reading scripts data');
            return;
        }
        try {
            const scripts = JSON.parse(data);
            res.status(200).json(scripts);
        }
        catch (error) {
            console.error('Error parsing scripts.json:', error);
            res.status(500).send('Error parsing scripts data');
        }
    });
});
// POST route for /clear_cscript - PROTECTED
app.post('/clear_cscript', authenticateJWT, (req, res) => {
    const { playerName, placeId } = req.body;
    if (!playerName || !placeId) {
        res.status(400).send('Missing required fields: playerName, placeId.');
        return;
    }
    try {
        const scriptFilePath = path_1.default.join(__dirname, 'data', 'games', placeId, playerName, 'cScript.txt');
        ensureDirectoryExists(path_1.default.dirname(scriptFilePath)); // Ensure directory exists
        fs_1.default.writeFile(scriptFilePath, '', (err) => {
            if (err) {
                console.error('Error clearing cScript.txt:', err);
                res.status(500).send('Error clearing cScript.txt');
                return;
            }
            console.log(`cScript.txt cleared for ${playerName} in ${placeId}`);
            res.status(200).send('cScript.txt cleared successfully.');
        });
    }
    catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('An error occurred while clearing cScript.txt.');
    }
});
// Route for the web panel - NO AUTH
app.get('/panel', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'panel.html'));
});
// Start the server
app.listen(PORT, ip, () => {
    console.log(`Server listening on port ${PORT}`);
});
