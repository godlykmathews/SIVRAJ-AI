<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />

# Phase 2A: isolated camera presence test

Presence detection is an independent development mode. It does not start with the
normal assistant and does not affect SIVRAJ's personality, memory, tools, or actions.

```bash
source .venv/bin/activate
python main.py --camera-test
# Equivalent:
python -m sivraj.presence.test_camera
```

The preview is mirrored, marks detected faces, and displays the debounced state,
face count, FPS, detection latency, and absence countdown. Press `Q` or `Esc` to
quit; Ctrl+C also performs a clean camera release.

Frames are processed only in memory. SIVRAJ does not save images, screenshots, or
video. On macOS, grant the terminal or Python application access under **System
Settings → Privacy & Security → Camera**. A permission denial or invalid camera
index produces a readable `[PRESENCE ERROR]` instead of affecting normal startup.

Configuration defaults:

```dotenv
CAMERA_INDEX=0
CAMERA_PREVIEW=true
CAMERA_FRAME_WIDTH=640
PRESENCE_CONFIRM_FRAMES=2
PRESENCE_ABSENCE_THRESHOLD=5.0
PRESENCE_TARGET_FPS=12
FACE_SCALE_FACTOR=1.1
FACE_MIN_NEIGHBORS=5
FACE_MIN_SIZE=60
```

This phase uses OpenCV's lightweight frontal-face Haar cascade. It answers “is at
least one visible face in front of the computer?”, not identity or full human-body
presence. A turned-away or fully obscured person may not be detected. No face
recognition, recording, cloud vision, or heavier person model is included.



# SIVRAJ - InvertAI Assistant 🎯


## Basic Details
### Team Name: Bifrost


### Team Members
- Team Lead: Godly K Mathews - College of Engineering Kallooppara
- Member 2: Emmanuel Mathew Vinod - College of Engineering Kallooppara

### Project Description
[2-3 lines about what your project does]

### The Problem (that doesn't exist)
[What ridiculous problem are you solving?]

### The Solution (that nobody asked for)
[How are you solving it? Keep it fun!]

## Technical Details
### Technologies/Components Used
For Software:
- [Languages used]
- [Frameworks used]
- [Libraries used]
- [Tools used]

For Hardware:
- [List main components]
- [List specifications]
- [List tools required]

### Implementation
For Software:
# Installation
[commands]

# Run
[commands]

### Project Documentation
For Software:

# Screenshots (Add at least 3)
![Screenshot1](Add screenshot 1 here with proper name)
*Add caption explaining what this shows*

![Screenshot2](Add screenshot 2 here with proper name)
*Add caption explaining what this shows*

![Screenshot3](Add screenshot 3 here with proper name)
*Add caption explaining what this shows*

# Diagrams
![Workflow](Add your workflow/architecture diagram here)
*Add caption explaining your workflow*

For Hardware:

# Schematic & Circuit
![Circuit](Add your circuit diagram here)
*Add caption explaining connections*

![Schematic](Add your schematic diagram here)
*Add caption explaining the schematic*

# Build Photos
![Components](Add photo of your components here)
*List out all components shown*

![Build](Add photos of build process here)
*Explain the build steps*

![Final](Add photo of final product here)
*Explain the final build*

### Project Demo
# Video
[Add your demo video link here]
*Explain what the video demonstrates*

# Additional Demos
[Add any extra demo materials/links]

## Team Contributions
- [Name 1]: [Specific contributions]
- [Name 2]: [Specific contributions]
- [Name 3]: [Specific contributions]

---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)


