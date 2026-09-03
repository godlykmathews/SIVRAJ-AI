# SIVRAJ Phase 1

SIVRAJ is a local, push-to-talk assistant. Its single runtime handles typed or
spoken input, asks a configured local Ollama model for a schema-constrained decision,
validates any requested tool in Python, and optionally speaks the final response.
Its relationship state, durable memories, profile, and session summaries persist in
SQLite across restarts.

The model never receives a shell interface. The only available actions are reading
the current time, reading CPU/RAM/battery status, and opening Spotify, Visual Studio
Code, or Calculator through an OS adapter.

## Prerequisites

- Python 3.11+ (the checked-in environment was verified with Python 3.14).
- [Ollama](https://ollama.com/) with the configured model downloaded.
- PortAudio (`brew install portaudio` on macOS) if your sounddevice installation
  needs it.
- A Piper `.onnx` voice model for the default TTS backend (the executable is
  installed by `requirements.txt`). Piper voices
  differ in language support; choose a multilingual/Malayalam-capable voice when
  available. On macOS, `say` is a development fallback.

## Install

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
ollama pull qwen3:8b
```

The example points at the Malayalam `ml_IN-arjun-medium` voice. Download it with:

```bash
mkdir -p models/piper
python -m piper.download_voices --download-dir models/piper ml_IN-arjun-medium
```

Edit `.env` if you choose a different `.onnx` voice file. Start Ollama
if it is not already managed as a background service:

```bash
ollama serve
```

For a quick macOS TTS fallback, set these values instead:

```dotenv
TTS_BACKEND=say
MACOS_VOICE=
```

Use `say -v '?'` to list installed system voices. A voice has to support Malayalam
itself; SIVRAJ deliberately does not translate Malayalam before TTS.

## Run

```bash
python main.py
```

- Press Enter on an empty prompt to record one VAD-delimited utterance.
- Enter `/text CPU usage ippo ethra?` for typed mode.
- Ordinary non-command text is also accepted as typed input.
- Enter `/quit` or press Ctrl+C to shut down.

Development commands bypass the model and inspect local state directly:

- `/memory` lists active long-term memories and their IDs.
- `/profile` shows stable profile facts.
- `/emotions` shows the persistent relationship state.
- `/history` shows this session's working memory.
- `/forget <id>` deactivates one memory.
- `/reset-emotions` restores the default relationship state.

To prove the text/LLM/tool pipeline before installing audio models:

```bash
python main.py --text-only --no-speech
```

If Piper is unavailable, SIVRAJ reports it and continues with visible text replies.
If Whisper/microphone initialization fails, `/text` remains usable. Ollama or the
configured Llama model is required for both modes, and startup prints the exact
recovery command when either is missing.

## Configuration

All supported values are documented in `.env.example`. Useful Whisper settings:

- CPU: `WHISPER_DEVICE=cpu`, `WHISPER_COMPUTE_TYPE=int8`
- NVIDIA CUDA: `WHISPER_DEVICE=cuda`, `WHISPER_COMPUTE_TYPE=float16`
- Automatic selection: leave both as `auto`

`faster-whisper` uses CTranslate2 and does not currently use Apple's MPS backend;
on Apple Silicon its supported local path is CPU, commonly with `int8`.

Microphone and speaker can be a sounddevice numeric index or a device name. Leave
them empty to use system defaults.

Normal conversation uses `CONVERSATION_TEMPERATURE=0.8`; structured memory
extraction uses the lower `EXTRACTION_TEMPERATURE=0.2`. Qwen thinking is disabled
for these calls so internal reasoning is not printed. Persistent data defaults to
`data/sivraj.db` and is intentionally ignored by Git.

## Personality and memory

Python chooses a contextual behavior hint from the persistent relationship state;
the model writes the actual response. State changes are deterministic and bounded
from 0–100. Safety-critical requests never receive comedic refusal behavior, and a
Python guard prevents a `REFUSE` disposition from executing an optional app action.

Memory has three levels:

1. The latest configured number of turns stay in process as working memory.
2. Explicit facts, preferences, projects, people, plans, and important events are
   extracted into SQLite. Explicit “remember this”/“orma vecho” requests have a
   deterministic fast path.
3. A compact session summary is written when SIVRAJ exits.

FTS5 keyword retrieval combines textual relevance with importance. Corrections with
a known subject deactivate the older fact, so Monday and Tuesday are not presented
as equally current. Extraction is data-only and cannot invoke tools.

## Tests

```bash
python -m pytest -q
```

The unit tests mock Ollama and do not open applications, download models, or access
audio hardware. Manual end-to-end checks still require the local services and
hardware:

1. Start with `--text-only --no-speech`; try greetings, follow-up context, time,
   system status, an allowed app, and `Delete my files`.
2. Run normally and test English, Malayalam, and Manglish utterances.
3. Confirm silence ends recording, temporary audio is removed after playback, and
   `/quit` exits cleanly.

## Architecture

```text
Microphone -> WebRTC VAD -> faster-whisper -> Ollama structured JSON
                                              |
                                  schema + registry validation
                                              |
                                  safe platform action (optional)
                                              |
                                    Ollama final response
                                              |
                                      Piper -> speaker
```

Conversation history is bounded to the configured recent turn count. There is no
wake word, browser automation, camera, GUI, background agent, or arbitrary command
execution in Phase 1.
