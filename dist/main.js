"use strict";
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
const app = (0, express_1.default)();
const PORT = 5038;
const ip = '192.168.178.52'; // Your IP address
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Helper function to ensure a directory exists
function ensureDirectoryExists(dirPath) {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}
// POST route for /execute
app.post('/execute', (req, res) => {
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
// GET route for /get_script
app.get('/get_script', (req, res) => {
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
// New route for /create_game
// New route for /create_game that accepts gameName and gamePlayers
app.post('/create_game', (req, res) => {
    const { placeId, gameName, gamePlayers } = req.body;
    if (!placeId) {
        res.status(400).send('Missing required field: placeId.');
        return;
    }
    try {
        const gameFolderPath = path_1.default.join(__dirname, 'data', 'games', placeId.toString());
        ensureDirectoryExists(gameFolderPath);
        // Save game info to a JSON file
        const gameInfoPath = path_1.default.join(gameFolderPath, 'gameInfo.json');
        const gameInfo = {
            id: placeId,
            name: gameName || 'Unknown Game',
            players: gamePlayers || 0,
            lastUpdated: new Date().toISOString()
        };
        fs_1.default.writeFileSync(gameInfoPath, JSON.stringify(gameInfo, null, 2));
        res.status(200).send(`Game folder created successfully: ${gameFolderPath}`);
    }
    catch (error) {
        console.error('Error creating game folder:', error);
        res.status(500).send('An error occurred while creating the game folder.');
    }
});
// Update GET route for /get_games to include game info
app.get('/get_games', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const gamesDirectory = path_1.default.join(__dirname, 'data', 'games');
    // Ensure the directory exists
    ensureDirectoryExists(gamesDirectory);
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
        // Get game info for each folder
        const gameInfoList = gameFolders.map(gameId => {
            const gameInfoPath = path_1.default.join(gamesDirectory, gameId, 'gameInfo.json');
            if (fs_1.default.existsSync(gameInfoPath)) {
                try {
                    const gameInfoData = fs_1.default.readFileSync(gameInfoPath, 'utf8');
                    return JSON.parse(gameInfoData);
                }
                catch (error) {
                    console.error(`Error reading game info for ${gameId}:`, error);
                    return {
                        id: gameId,
                        name: 'Unknown Game',
                        players: 0
                    };
                }
            }
            else {
                return {
                    id: gameId,
                    name: 'Unknown Game',
                    players: 0
                };
            }
        });
        res.status(200).json(gameInfoList);
    }));
}));
// New route for /create_user
app.post('/create_user', (req, res) => {
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
// GET route for /get_games
app.get('/get_games', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
// GET route for /get_scripts
app.get('/get_scripts', (req, res) => {
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
// POST route for /clear_cscript
app.post('/clear_cscript', (req, res) => {
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
// Route for the web panel
app.get('/panel', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'panel.html'));
});
// Start the server
app.listen(PORT, ip, () => {
    console.log(`Server listening on port ${PORT}`);
});
