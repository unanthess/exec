import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import jwt, { JwtPayload } from 'jsonwebtoken'; // Import JWT
import cors from 'cors'; // Import CORS
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

const app = express();
const PORT = 5038;
const ip = '0.0.0.0';

const SECRET_KEY = process.env.key443 || 'your_secret_key'; // Use environment variable or default
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

interface CustomRequest extends Request {
    user?: string | JwtPayload;
}

// Middleware to verify JWT token
const authenticateJWT = (req: CustomRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // "Bearer TOKEN"

        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) {
                return res.sendStatus(403); // Forbidden
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401); // Unauthorized
    }
};

// Helper function to ensure a directory exists
function ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}

// Function to get Roblox game name by ID (no auth needed)
async function getRobloxGameName(placeId: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const url = `https://api.roblox.com/marketplace/productinfo?assetId=${placeId}`;
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData && parsedData.Name) {
                        resolve(parsedData.Name);
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('Error fetching game name:', error);
            reject(error);
        });
    });
}

// Login route - generates a token
app.post('/login', (req: Request, res: Response) => {
    const { username } = req.body;

    if (username) {
        // In a real application, you'd validate the username against a database
        const user = { username: username };  // Simplified user object

        const token = jwt.sign(user, SECRET_KEY);  //Removed expireIn to allow for auto relog

        res.json({ token: token, username: username });  // Send token and username
    } else {
        res.status(400).send('Missing username');
    }
});

// POST route for /execute - PROTECTED
app.post('/execute', authenticateJWT, (req: Request, res: Response): void => {
    const { playerName, placeId, content } = req.body;

    if (!playerName || !placeId || !content) {
        res.status(400).send('Missing required fields: playerName, placeId, or content.');
        return;
    }

    try {
        const scriptFilePath = path.join(__dirname, 'data', 'games', placeId, playerName, 'cScript.txt');
        ensureDirectoryExists(path.dirname(scriptFilePath));

        fs.writeFileSync(scriptFilePath, content);
        res.status(200).send(`Content written successfully to ${scriptFilePath}`);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('An error occurred while processing your request.');
    }
});

// GET route for /get_script - PROTECTED
app.get('/get_script', authenticateJWT, (req: Request, res: Response): void => {
    const { playerName, placeId } = req.query;

    if (!playerName || !placeId) {
        res.status(400).send('Missing required query parameters: playerName or placeId.');
        return;
    }

    try {
        const scriptFilePath = path.join(__dirname, 'data', 'games', placeId.toString(), playerName.toString(), 'cScript.txt');
        ensureDirectoryExists(path.dirname(scriptFilePath));

        if (!fs.existsSync(scriptFilePath)) {
            fs.writeFileSync(scriptFilePath, ''); // Create empty file if it doesn't exist
            console.log(`Created file: ${scriptFilePath}`);
        }

        const scriptContent = fs.readFileSync(scriptFilePath, 'utf8');
        res.status(200).type('text/plain').send(scriptContent);
    } catch (error) {
        console.error('Error retrieving script:', error);
        res.status(500).send('An error occurred while retrieving the script.');
    }
});

// New route for /create_game - PROTECTED
app.post('/create_game', authenticateJWT, (req: Request, res: Response): void => {
    const { placeId } = req.body;

    if (!placeId) {
        res.status(400).send('Missing required field: placeId.');
        return;
    }

    try {
        const gameFolderPath = path.join(__dirname, 'data', 'games', placeId.toString());
        ensureDirectoryExists(gameFolderPath);
        res.status(200).send(`Game folder created successfully: ${gameFolderPath}`);
    } catch (error) {
        console.error('Error creating game folder:', error);
        res.status(500).send('An error occurred while creating the game folder.');
    }
});

// New route for /create_user - PROTECTED
app.post('/create_user', authenticateJWT, (req: Request, res: Response): void => {
    const { placeId, username } = req.body;

    if (!placeId || !username) {
        res.status(400).send('Missing required fields: placeId or username.');
        return;
    }

    try {
        const userFolderPath = path.join(__dirname, 'data', 'games', placeId.toString(), username);
        ensureDirectoryExists(userFolderPath);
        res.status(200).send(`User folder created successfully: ${userFolderPath}`);
    } catch (error) {
        console.error('Error creating user folder:', error);
        res.status(500).send('An error occurred while creating the user folder.');
    }
});

// GET route for /get_games - PROTECTED
app.get('/get_games', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
    const gamesDirectory = path.join(__dirname, 'data', 'games');

    fs.readdir(gamesDirectory, async (err, files) => {
        if (err) {
            console.error('Error reading games directory:', err);
            res.status(500).send('Error reading games directory');
            return;
        }

        // Filter out non-directory files
        const gameFolders = files.filter(file => {
            const filePath = path.join(gamesDirectory, file);
            return fs.statSync(filePath).isDirectory();
        });

        res.status(200).json(gameFolders);
    });
});

// GET route for /get_scripts - PROTECTED
app.get('/get_scripts', authenticateJWT, (req: Request, res: Response): void => {
    const scriptsFilePath = path.join(__dirname, 'scripts.json');

    fs.readFile(scriptsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading scripts.json:', err);
            res.status(500).send('Error reading scripts data');
            return;
        }

        try {
            const scripts = JSON.parse(data);
            res.status(200).json(scripts);
        } catch (error) {
            console.error('Error parsing scripts.json:', error);
            res.status(500).send('Error parsing scripts data');
        }
    });
});

// POST route for /clear_cscript - PROTECTED
app.post('/clear_cscript', authenticateJWT, (req: Request, res: Response): void => {
    const { playerName, placeId } = req.body;

    if (!playerName || !placeId) {
        res.status(400).send('Missing required fields: playerName, placeId.');
        return;
    }

    try {
        const scriptFilePath = path.join(__dirname, 'data', 'games', placeId, playerName, 'cScript.txt');
        ensureDirectoryExists(path.dirname(scriptFilePath)); // Ensure directory exists

        fs.writeFile(scriptFilePath, '', (err) => {  // Overwrite with an empty string
            if (err) {
                console.error('Error clearing cScript.txt:', err);
                res.status(500).send('Error clearing cScript.txt');
                return;
            }
            console.log(`cScript.txt cleared for ${playerName} in ${placeId}`);
            res.status(200).send('cScript.txt cleared successfully.');
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('An error occurred while clearing cScript.txt.');
    }
});

// Route for the web panel - NO AUTH
app.get('/panel', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// Start the server
app.listen(PORT, ip, () => {
    console.log(`Server listening on port ${PORT}`);
});
