import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 5038;
const ip = '192.168.178.52'; // Your IP address

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to ensure a directory exists
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// POST route for /execute
app.post('/execute', (req: Request, res: Response): void => {
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

// GET route for /get_script
app.get('/get_script', (req: Request, res: Response): void => {
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

// New route for /create_game
app.post('/create_game', (req: Request, res: Response): void => {
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

// New route for /create_user
app.post('/create_user', (req: Request, res: Response): void => {
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

// Route for the web panel
app.get('/panel', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// Start the server
app.listen(port, ip, () => {
  console.log(`Server running at http://${ip}:${port}`);
});
