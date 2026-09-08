import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/api/impact/simulate', (req, res) => {
    const pythonCmd = process.env.PYTHON_PATH || process.env.PYTHON_BIN || 'python';
    // Path to the python CLI engine
    const pythonScript = path.join(__dirname, 'run_simulation_cli.py');
    
    const pythonProcess = spawn(pythonCmd, [pythonScript], { shell: true });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Python script exited with code ${code}: ${errorOutput}`);
            return res.status(500).json({ error: errorOutput || 'Simulation failed' });
        }
        try {
            // Python CLI outputs only valid JSON to stdout when successful.
            const result = JSON.parse(output);
            res.json(result);
        } catch (e) {
            console.error('Failed to parse output. Raw output:', output);
            console.error('Error:', errorOutput);
            res.status(500).json({ error: 'Invalid JSON from simulation' });
        }
    });

    pythonProcess.stdin.write(JSON.stringify(req.body));
    pythonProcess.stdin.end();
});

const PORT = Number(process.env.PORT) || 8002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Impact Engine Express wrapper listening on port ${PORT}`);
});
