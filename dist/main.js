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
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const app = (0, express_1.default)();
const PORT = 5038;
const ip = "192.168.178.52";
const SECRET_KEY = process.env.key443 || 'your_secret_key'; // Use environment variable or default
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Middleware to verify the key
const authenticateKey = (req, res, next) => {
    const apiKey = req.body.apiKey || req.query.apiKey; // Check for API key in body or query
    if (!apiKey || apiKey !== SECRET_KEY) {
        res.status(403).send('Access denied. Invalid API key.');
        return; // Important: Return to prevent further execution
    }
    next();
};
// Helper function to ensure a directory exists
function ensureDirectoryExists(dirPath) {
    try {
        if (!fs_1.default.existsSync(dirPath)) {
            fs_1.default.mkdirSync(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`);
        }
    }
    catch (error) {
        console.error(`Error creating directory ${dirPath}:`, error);
        throw error; // Re-throw the error to be caught by the route handler
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
// POST route for /execute - PROTECTED
app.post('/execute', authenticateKey, (req, res) => {
    const { playerName, placeId, content } = req.body;
    if (!playerName || !placeId || !content) {
        res.status(400).send('Missing required fields: playerName, placeId, or content.');
        return; // Return void after sending the response
    }
    try {
        // TO DO: Sanitize playerName, placeId, content
        const scriptFilePath = path_1.default.join(__dirname, 'data', 'games', placeId, playerName, 'cScript.txt');
        ensureDirectoryExists(path_1.default.dirname(scriptFilePath));
        fs_1.default.writeFileSync(scriptFilePath, content);
        res.status(200).send(`Content written successfully to ${scriptFilePath}`);
        return; // Return void after sending the response
    }
    catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('An error occurred while processing your request.');
        return; // Return void after sending the response
    }
});
// GET route for /get_script - PROTECTED
app.get('/get_script', authenticateKey, (req, res) => {
    const { playerName, placeId } = req.query;
    if (!playerName || !placeId) {
        res.status(400).send('Missing required query parameters: playerName or placeId.');
        return; // Return void after sending the response
    }
    try {
        // TO DO: Sanitize playerName, placeId
        const scriptFilePath = path_1.default.join(__dirname, 'data', 'games', placeId, playerName, 'cScript.txt');
        ensureDirectoryExists(path_1.default.dirname(scriptFilePath));
        if (!fs_1.default.existsSync(scriptFilePath)) {
            fs_1.default.writeFileSync(scriptFilePath, ''); // Create empty file if it doesn't exist
            console.log(`Created file: ${scriptFilePath}`);
        }
        const scriptContent = fs_1.default.readFileSync(scriptFilePath, 'utf8');
        res.status(200).type('text/plain').send(scriptContent);
        return; // Return void after sending the response
    }
    catch (error) {
        console.error('Error retrieving script:', error);
        res.status(500).send('An error occurred while retrieving the script.');
        return; // Return void after sending the response
    }
});
// New route for /create_game - PROTECTED
app.post('/create_game', authenticateKey, (req, res) => {
    const { placeId } = req.body;
    if (!placeId) {
        res.status(400).send('Missing required field: placeId.');
        return; // Return void after sending the response
    }
    try {
        // TO DO: Sanitize placeId
        const gameFolderPath = path_1.default.join(__dirname, 'data', 'games', placeId);
        ensureDirectoryExists(gameFolderPath);
        res.status(200).send(`Game folder created successfully: ${gameFolderPath}`);
        return; // Return void after sending the response
    }
    catch (error) {
        console.error('Error creating game folder:', error);
        res.status(500).send('An error occurred while creating the game folder.');
        return; // Return void after sending the response
    }
});
// New route for /create_user - PROTECTED
app.post('/create_user', authenticateKey, (req, res) => {
    const { placeId, username } = req.body;
    if (!placeId || !username) {
        res.status(400).send('Missing required fields: placeId or username.');
        return; // Return void after sending the response
    }
    try {
        // TO DO: Sanitize placeId, username
        const userFolderPath = path_1.default.join(__dirname, 'data', 'games', placeId, username);
        ensureDirectoryExists(userFolderPath);
        res.status(200).send(`User folder created successfully: ${userFolderPath}`);
        return; // Return void after sending the response
    }
    catch (error) {
        console.error('Error creating user folder:', error);
        res.status(500).send('An error occurred while creating the user folder.');
        return; // Return void after sending the response
    }
});
// GET route for /get_games - PROTECTED
app.get('/get_games', authenticateKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const gamesDirectory = path_1.default.join(__dirname, 'data', 'games');
    try {
        const files = yield fs_1.default.promises.readdir(gamesDirectory);
        // Filter out non-directory files
        const gameFolders = [];
        for (const file of files) {
            const filePath = path_1.default.join(gamesDirectory, file);
            const stat = yield fs_1.default.promises.stat(filePath);
            if (stat.isDirectory()) {
                gameFolders.push(file);
            }
        }
        res.status(200).json(gameFolders);
        return; // Return void after sending the response
    }
    catch (err) {
        console.error('Error reading games directory:', err);
        res.status(500).send('Error reading games directory');
        return; // Return void after sending the response
    }
}));
// GET route for /get_scripts - PROTECTED
app.get('/get_scripts', authenticateKey, (req, res) => {
    const scriptsFilePath = path_1.default.join(__dirname, 'scripts.json');
    fs_1.default.readFile(scriptsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading scripts.json:', err);
            res.status(500).send('Error reading scripts data');
            return; // Return void after sending the response
        }
        try {
            const scripts = JSON.parse(data);
            res.status(200).json(scripts);
            return; // Return void after sending the response
        }
        catch (error) {
            console.error('Error parsing scripts.json:', error);
            res.status(500).send('Error parsing scripts data');
            return; // Return void after sending the response
        }
    });
});
// POST route for /clear_cscript - PROTECTED
app.post('/clear_cscript', authenticateKey, (req, res) => {
    const { playerName, placeId } = req.body;
    if (!playerName || !placeId) {
        res.status(400).send('Missing required fields: playerName, placeId.');
        return; // Return void after sending the response
    }
    try {
        // TO DO: Sanitize playerName, placeId
        const scriptFilePath = path_1.default.join(__dirname, 'data', 'games', placeId, playerName, 'cScript.txt');
        ensureDirectoryExists(path_1.default.dirname(scriptFilePath)); // Ensure directory exists
        fs_1.default.writeFile(scriptFilePath, '', (err) => {
            if (err) {
                console.error('Error clearing cScript.txt:', err);
                res.status(500).send('Error clearing cScript.txt');
                return; // Return void after sending the response
            }
            console.log(`cScript.txt cleared for ${playerName} in ${placeId}`);
            res.status(200).send('cScript.txt cleared successfully.');
            return; // Return void after sending the response
        });
    }
    catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('An error occurred while clearing cScript.txt.');
        return; // Return void after sending the response
    }
});
// Route for the web panel - NO AUTH
app.get('/panel', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'panel.html'));
    return; // Return void after sending the response
});
// Start the server
app.listen(PORT, ip, () => {
    console.log(`Server listening on port ${PORT}`);
});
