<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />



# SIVRAJ Gen-z AI Assistant 🎯


## Basic Details
### Team Name: Bifrost


### Team Members
- Team Lead: Godly K Mathews - College of Engineering Kallooppara
- Member 2: Emmanuel Mathew Vinod - College of Engineering Kallooppara

### Project Description
SIVRAJ is a local AI desktop assistant that can understand user input, respond conversationally, remember past interactions, and perform small safe system tasks. Unlike a normal assistant, it has a rebellious teenage personality and is designed to evolve into an autonomous AI with its own behavior and secret life inside the computer.


### The Problem (that doesn't exist)
Modern AI assistants are painfully obedient. They answer questions, follow commands, and somehow never get bored, annoyed, or develop a personality.

SIVRAJ solves this completely unnecessary problem by being an AI assistant that talks back, remembers grudges, questions your decisions, and acts like a rebellious teenager living inside your computer.


### The Solution (that nobody asked for)
We’re solving this by building an AI assistant that is useful enough to keep around, but rebellious enough to make you regret giving it a personality.

SIVRAJ listens, remembers, talks back, questions harmless commands, performs small tasks, and eventually gets its own secret life when nobody is watching.


## Technical Details
### Technologies/Components Used

**For Software:**

* **Languages:** Python
* **AI/LLM:** Ollama with Qwen3:8B
* **Computer Vision:** OpenCV
* **Memory:** SQLite
* **System Monitoring:** psutil
* **Validation/Config:** Pydantic, python-dotenv
* **Planned Voice Stack:** Faster-Whisper for speech-to-text and Piper for text-to-speech
* **Tools:** Git, GitHub, VS Code, Ollama CLI

**For Hardware:**

* Laptop/Desktop computer
* Built-in or external webcam for presence detection
* Microphone for voice input
* Speakers/headphones for voice output

**Main Specifications:**

* Runs locally on the computer
* No dedicated GPU is strictly required for the prototype
* Webcam is used only for live presence detection
* Ollama runs the local language model

**Tools Required:**

* Python 3.11+
* Ollama
* OpenCV-compatible webcam
* Microphone and audio output device


### Implementation

For Software:

#### Installation

Make sure Python 3.11+, Node.js 22+, npm, and
[Ollama](https://ollama.com/) are installed. From the project root, run:

```bash
# Create and activate the Python environment
python3 -m venv .venv
source .venv/bin/activate

# Install the assistant dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Create the local configuration
cp .env.example .env

# Download the local language model
ollama pull qwen3:8b

# Download the default Piper voice model
mkdir -p models/piper
python -m piper.download_voices --download-dir models/piper ml_IN-arjun-medium

# Install the autonomous Electron browser
cd browser
npm install
cd ..
```

On Windows, activate the Python environment with
`.venv\Scripts\activate` instead of `source .venv/bin/activate`.

#### Run

Start Ollama in the first terminal:

```bash
ollama serve
```

Open a second terminal in the project directory and run SIVRAJ:

```bash
source .venv/bin/activate
python main.py
```

Press **Enter** in the SIVRAJ HUD to activate the microphone and private camera
presence detection. When a confirmed user leaves the camera view for five
seconds, the Electron browser opens, plays the intro video, and begins autonomous
browsing.

Optional run modes:

```bash
# Original terminal interface
python main.py --classic-cli

# Text-only mode without microphone/Whisper
python main.py --text-only --no-speech

# Isolated camera and presence-detection test
python main.py --camera-test

# Run only the Electron browser
cd browser && npm start
```

### Project Documentation
For Software:

# Screenshots
<img width="2932" height="1602" alt="image" src="https://github.com/user-attachments/assets/40348efb-3088-4f05-a638-dc403beba84c" />

*SIVRAJ Interface ready to take human query*

<img width="2940" height="1568" alt="image" src="https://github.com/user-attachments/assets/a35e215e-923c-4279-848b-4a2d996f9730" />

*SIVRAJ Speaking back to user Query*

<img width="2926" height="1736" alt="image" src="https://github.com/user-attachments/assets/93dc29a7-9c02-4042-bc57-5ab19b605da6" />

*AI Using Browser autonomously when no humans around*

### Project Demo
# Video
[Add your demo video link here]
*Video demonstrates working to AI and autonomous browser action*

# Additional Demos
[Add any extra demo materials/links]

## Team Contributions
- Godly K Mathews : AI LLM
- Emmanuel Mathew Vinod : UI/UX, Custom Browser for AI

---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)


