# Focat

Focat is a desktop task and focus companion built for students with ADHD. It breaks large, vague tasks into small actionable steps, adapts to how the user actually thinks and works, and supports focus sessions without demanding the kind of sustained self-discipline that ADHD makes difficult.

<img width="1280" height="832" alt="focus app cat (3)" src="https://github.com/user-attachments/assets/27fb784a-b0fa-492a-87c5-4b92d6c77e0d" />

Most productivity tools assume the user can plan ahead, stay consistent, and self-motivate. Focat assumes the opposite, and is designed around that reality instead of working against it.

The whole app is built around a pixel cat aesthetic and a yellow color theme — meant to feel positive and a little playful, in deliberate contrast to the sleek, generic look of most AI-era productivity apps.

## Why This Exists

ADHD is not a deficit of attention so much as a deficit of self-regulation. Tasks that have no clear first step tend to never get started, regardless of how important they are. Existing productivity apps are built for users who can already plan, prioritize, and follow through consistently — which is precisely what ADHD makes difficult. Focat is built around external structure instead: it does the planning scaffolding so the user doesn't have to generate it from scratch.

## Platform

Focat is a desktop application built with Electron.

## Onboarding

Setup asks for exactly two things: your name, and your learning style (visual, auditory, reading/writing, kinesthetic, or a mix). No further setup steps. Everything else is configured as you go, inside the app.
<img width="1917" height="1015" alt="image" src="https://github.com/user-attachments/assets/5b4a7e9f-d07f-4500-b6f6-c31d04b4da24" />
<img width="1917" height="975" alt="image" src="https://github.com/user-attachments/assets/2a9deeed-87bf-42ec-96cf-aeb7c54f296f" />

## Core Features

**Task decomposition (Gemini-powered)**
Type a task into the home screen and it's sent to an embedded task-decomposing agent (Gemini API) that breaks it down into a sequence of small, solvable steps. Vague tasks are handled by the agent directly rather than requiring a fully formed input. Tasks with very large scope are deliberately collapsed down to "what to do today" rather than surfacing the full size of the work up front.

<img width="742" height="397" alt="image" src="https://github.com/user-attachments/assets/9846e254-21eb-46e3-94ac-c8a82298da97" />

**Calendar**
Schedule tasks on a built-in calendar and send them straight to the task decomposition agent from the calendar view, so a scheduled task can be broken down the moment it's added.

**Learning-style adaptation**
Each generated step is phrased according to the learning style set at onboarding — visual, auditory, reading/writing, kinesthetic, or a mix of all four. The underlying task structure stays the same; only the way each step is described changes.

**Deadline-aware adjustment**
As a deadline approaches, the step list automatically trims down to the highest-priority actions and shortens time estimates, instead of asking the user to manually re-plan under pressure.

**Pomodoro timer**
A built-in Pomodoro clock for working in focused intervals with built-in breaks.

**Focus sessions** *(in progress)*
A distraction-minimized timer screen with ambient visual and audio cues that simulate the accountability effect of working alongside someone else, without requiring a live video connection.

**Focus music**
Background music playback during focus sessions. These promote the music that ADHD people usually use to stay focused like, brown noise and white noise, space music, lofi rain etc.

<img width="632" height="150" alt="image" src="https://github.com/user-attachments/assets/3126f45c-c2ae-4cbc-aa86-e83a8def1cbb" />


**Gentle re-engagement notifications**
If the app goes unopened for a while, Focat sends a notification nudging the user to start small — usually by suggesting they add just one task to today's list. The goal is to lower the barrier back in, not to guilt the user into opening the app.

**Doomscrolling detection**
Focat monitors browser and application activity on the device to detect doomscrolling patterns. YouTube is handled differently from other distractions: instead of an interruption, the user gets a custom check-in message asking if they're currently studying or using YouTube for something task-related. Once confirmed, Focat backs off and doesn't interrupt that session again.

**Custom sound design**
Notification sounds use cat sound effects, and UI interactions have their own custom click sounds, in keeping with the app's overall aesthetic.

## Design Principles

- Every core action should be completable in one or two taps.
- The app provides structure; the user is never required to generate it themselves.
- No streaks that break, no progress that resets, no punishing language.
- Complexity stays hidden until it's needed.
- The app is honest about its limits. It is a productivity tool, not a clinical service.

## Tech Stack

- **Desktop Framework:** Electron 33
- **Frontend:** React 18 with Vite
- **Language:** JavaScript / JSX
- **Styling:** CSS Modules, global CSS, Google Fonts
- **AI Integration:** Google Gemini API via REST, using `gemini-2.0-flash`
- **State & Logic:** React hooks for timer, tasks, settings, music, and interaction feedback
- **Local Storage:** Electron `userData` JSON files for tasks, settings, username, and app usage
- **Secure Storage:** Electron `safeStorage` for encrypted API key storage
- **Audio:** Web Audio API for generated focus sounds; local WAV assets for notifications
- **Desktop Features:** Electron IPC, system tray, custom frameless window, custom notification window, background focus guard
- **Build Tooling:** Vite, npm, Electron Builder
- **Distribution Targets:** macOS DMG, Windows NSIS installer, Linux AppImage

## Technical Approach

- Built with Electron, giving the app OS-level access needed for activity detection and system notifications that a browser-based app can't provide. React and Vite handle the UI layer on top of Electron's frameless, custom window.
- Task decomposition calls the Gemini API (`gemini-2.0-flash`) over REST and requires an internet connection. This is the one feature explicitly allowed to depend on external services. The Gemini API key is stored encrypted on-device via Electron's `safeStorage`, never in plaintext.
- Activity monitoring for doomscrolling detection runs locally via a background focus guard process, using Electron IPC to communicate with the main UI.
- Tasks, settings, username, and usage data are stored locally as JSON files in Electron's `userData` directory — nothing is synced to a server by default.
- Focus sounds are generated using the Web Audio API; notification sounds use local WAV assets.
- The system tray and a custom notification window handle background nudges (like the re-engagement prompt) without requiring the main window to be open.

## Privacy Note

Focat monitors local app and browser activity in order to detect doomscrolling and trigger the YouTube check-in flow. This monitoring is used only to drive in-app prompts and is not transmitted anywhere except where a task is explicitly sent to the Gemini API for decomposition.

Task content sent to the Gemini API is used only to generate that task's breakdown. Note that data-usage terms for the Gemini *developer API* differ from Google's consumer Gemini app, and those terms can change — see Google's current Gemini API usage policies before relying on this for anything beyond a personal project.

## Status

This is an early-stage personal project. Features described above are in various states of design and implementation — this document reflects the intended product, not necessarily the current build. Items marked *(in progress)* are not yet complete.

## Known Limitations

- Focus Sessions with simulated body doubling are still in progress and not yet complete.
- Task decomposition quality depends on internet availability, since it relies on the Gemini API.
- Doomscrolling detection is best-effort based on local activity monitoring and won't catch every distraction pattern.
- This is not a mental health application and should not be used as one.
