const path = require('path');
const child_process = require("child_process");

let pythonProcess = null;  // Variable to hold the Python process
module.exports.py = {}


// Function to spawn Python process
function spawnPython(processData, scriptPath = path.join(__dirname, "bridge.py"), pythonCmd = "python") {
    const python = child_process.spawn(pythonCmd, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']  // 'pipe' for stdin, stdout, stderr
    });

    python.stdout.on("data", (data) => {
        const trimmedData = data.toString().trim();
        if (trimmedData) {
            try {
                const jsonData = JSON.parse(trimmedData);
                processData(jsonData);  // Process received JSON data
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        }
    });

    python.stderr.on("data", (data) => {
        console.error(`Error from Python process: ${data}`);
    });

    python.on("error", (err) => {
        console.error("Failed to start Python subprocess:", err);
    });

    python.on("exit", (code, signal) => {
        if (code !== 0) {
            console.error(`Python process exited with code ${code} and signal ${signal}`);
        }
        // Automatically restart Python process on exit
        pythonProcess = spawnPython(processData, scriptPath, pythonCmd);
    });

    return python;
}

// Initialize Python process
pythonProcess = spawnPython(processData);

// Function to send messages to Python process
function sendJSON(json) {
    if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.stdin.write(JSON.stringify(json) + '\n');
    } else {
        console.error('Python process is not running.');
    }
}

// Example of handling ready state with callbacks
const readyCallbacks = [];

function fireReady() {
    readyCallbacks.forEach(callback => callback());
}

module.exports.ready = function(callback) {
    readyCallbacks.push(callback);
};


var recentCall = undefined


// Function to process JSON data received from Python process
function processData(jsd) {
    switch (jsd.type) {
        case "info":
            console.log("Received info from Python.");
            const pyFunctions = jsd.functions;
            // Dynamically create functions based on received info
            pyFunctions.forEach(func => {
                module.exports.py[func] = (...args) => {
                    return new Promise((r,rej)=>{
                        sendJSON({ "function": func, "args": [...args] });

                        recentCall = (d)=>{
                            if (d.error == undefined){
                                rej("Error field missing!")
                                return
                            }

                            if (d.error == true){
                                rej("Python error!")
                                return
                            }

                            r(d.result)
                        }
                    })
                    
                };
            });
            
            fireReady(); // Notify callbacks that module is ready
            break;
        case "exit":
            console.error("PYTHON PROCESS EXIT!")

            break;
        case "result":
            if (recentCall){
                recentCall(jsd)
            }

            break;
        
        default:
            console.log("Received unrecognized data from Python:", jsd);
            break;
    }
}
