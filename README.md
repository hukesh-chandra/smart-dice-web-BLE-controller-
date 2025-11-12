# Smart Dice & Mini-Game System with Web BLE Controller

## A PROJECT REPORT

### Submitted by

_________________________

_________________________

_________________________

---

## 1. Project Overview

This project presents a modern, interactive gaming system that merges a physical, electronically-enabled dice with a sophisticated web-based controller. At its core, the system allows a user to control and play games on an ESP32-powered smart dice directly from a web browser, leveraging the power of Bluetooth Low Energy (BLE) for seamless, real-time communication.

The project addresses the gap between the tactile satisfaction of traditional board games and the dynamic, automated nature of video games. By eliminating the need for a native mobile application, it provides a highly accessible and platform-independent user experience.

### Key Features
-   **Physical Smart Dice:** An ESP32-based device with a 7-segment display, button, and buzzer for on-device feedback and interaction.
-   **Web-Based Controller:** A responsive React application that connects to the dice via the Web Bluetooth API, offering a rich user interface for game control.
-   **Real-time Synchronization:** Bi-directional communication ensures that actions and game state are perfectly synchronized between the physical dice and the web app.
-   **Multiple Game Modes:** Includes "Free Roll," a turn-based "A vs B" game, a score-based "Race" game, and a strategic "Countdown" game.
-   **No Installation Required:** The controller runs in any modern web browser that supports Web Bluetooth, removing the friction of app store downloads.

---

## 2. Usage Guide

### ⚠️ Important Prerequisite: Update ESP32 Firmware

This web application communicates using **Bluetooth Low Energy (BLE)**. To use it, you **must** flash your ESP32 with a firmware that implements a BLE server. The required firmware is provided in the `ARDUINO_CODE.md` file.

The web application is configured to look for a device named `ESP32_Dice` advertising these specific BLE UUIDs (Nordic UART Service):
-   **Service UUID:** `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
-   **RX (App -> Device) Characteristic:** `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
-   **TX (Device -> App) Characteristic:** `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

### How to Use the App

1.  **Power On Your Dice**: Ensure your ESP32 dice is powered on and running the correct BLE firmware.
2.  **Connect to the Dice**:
    -   Click the **"Connect"** button in the top-right corner.
    -   Your browser will open a window showing nearby Bluetooth devices.
    -   Select your dice (`ESP32_Dice`) and click "Pair".
    -   The button will turn red and say "Disconnect", indicating a successful connection.
3.  **Choose a Game Mode**:
    -   Use the tabs in the "Controls" panel to select a mode.
    -   For **A vs B**, **Race**, or **Countdown**, set your desired parameters before starting.
4.  **Start Playing**:
    -   In game modes, click **"Start Game"**.
    -   The scoreboard will appear and show the game status.
    -   Use the large **"Roll Dice"** button to play. This button works in Free Roll mode or when it's a player's turn in a game. You can also press the physical button on the dice.
5.  **Reset**:
    -   Click **"Reset"** at any time to stop the current game and clear all scores on both the app and the device.

### Troubleshooting

-   **Cannot Connect**: Make sure Bluetooth is enabled on your device and that you are using a compatible browser (Chrome, Edge, or Opera on desktop/Android).
-   **No Response from Dice**: Check the device's power. Use the Log at the bottom of the page to see if any messages are being received from the ESP32.

---

## 3. System Architecture & Design

The system follows a client-server architecture where the ESP32 dice acts as a BLE peripheral (server) and the web application is the BLE central (client).

### Communication Flow
The interaction is event-driven and bi-directional:
1.  **Client to Server:** The web app sends simple string commands (e.g., `ROLL`, `GAME`, `RESET`) to the ESP32.
2.  **Server to Client:** The ESP32 processes commands, updates its internal state, and sends back status messages (e.g., `Rolled: 5`, `Scores -> A: 5 B: 0`, `Player B turn.`) via BLE notifications. The web app listens for these notifications, parses them, and updates the UI accordingly.

### Technology Stack
-   **Hardware:**
    -   Microcontroller: ESP32-WROOM-32
    -   Display: 7-Segment LED Display
    -   Input/Output: Push-button, Piezo Buzzer
-   **Firmware:**
    -   Language: C++ (Arduino Framework)
    -   Key Library: `ESP32-BLE-Arduino`
-   **Web Application:**
    -   Framework: React (with TypeScript)
    -   Styling: Tailwind CSS
    -   Connectivity: Web Bluetooth API

---

## 4. Hardware Implementation

The physical dice is the heart of the system, built from simple, common electronic components.

### Components List
-   ESP32-WROOM-32 Development Board
-   1-Digit Common Cathode 7-Segment Display
-   Tactile Push-button Switch
-   Passive Piezo Buzzer
-   Breadboard and Jumper Wires
-   Resistors (as needed for LEDs/button)

<br>

---
***Image Placeholder 1***

*(Please insert a close-up image of your hardware circuit here, showing the ESP32, 7-segment display, and wiring on the breadboard.)*

**Figure 4.1:** Circuit assembly on the breadboard.

---
<br>

---
***Image Placeholder 2***

*(Please insert an image of the complete system in action: the physical dice device next to a phone or laptop running the web application.)*

**Figure 4.2:** The complete system in operation.

---
<br>

## 5. Firmware (ESP32) Implementation

The firmware, detailed in `ARDUINO_CODE.md`, is responsible for all on-device logic.

-   **BLE Server:** A BLE server is initialized using the Nordic UART Service (NUS) UUIDs. It handles connection events and sets up a characteristic to receive commands from the web app (`RX`) and another to send notifications back (`TX`).
-   **Game State Machine:** A C++ `enum` and several boolean flags manage the current state (e.g., `currentMode`, `gameModeRunning`). All game logic is contained within the `handleShortButtonPress` function, which is triggered by both a physical press and a `ROLL` command from the web app.
-   **Command Parser:** The `handleCommand` function acts as a simple router, parsing incoming strings and calling the appropriate game logic functions (`startGameMode`, `startRaceMode`, `reset`, etc.).
-   **Display & Sound Drivers:** A set of helper functions (`displayNumber`, `playVictory`, etc.) abstract the control of the 7-segment display and buzzer, keeping the main logic clean.

## 6. Web Application (Controller) Implementation

The controller is a client-side React single-page application.

-   **`useBluetoothDice` Hook:** This custom hook encapsulates the entire Web Bluetooth API logic. It exposes simple methods (`connect`, `disconnect`, `sendCommand`) and state variables (`isConnected`, `error`) to the main App component, abstracting away the complexity of the browser API.
-   **State Management:** The main `App.tsx` component holds the entire `GameState` in a React state object. A callback function, `handleDataReceived`, is passed to the Bluetooth hook. This function acts as the central parser for all incoming messages from the ESP32, updating the `GameState` which triggers re-renders across the UI.
-   **Component Architecture:** The UI is broken down into logical, reusable components:
    -   `DiceDisplay`: Shows the static dice face or a rolling animation.
    -   `GameControls`: Contains the tabs for mode selection and game start/reset buttons.
    -   `Scoreboard`: Displays player scores, turn info, and game status using the `SevenSegmentDisplay` component for a retro look.
    -   `Log`: Shows a raw feed of messages for debugging.

## 7. Testing & Validation

The system was validated through a multi-stage testing process:
1.  **Unit Tests:** Firmware functions and React components were tested in isolation.
2.  **Integration Testing:** The primary method involved connecting the live hardware to the web application and executing all possible user flows for each game mode. The `Log` component was crucial for debugging the message-passing between the two systems.
3.  **User Acceptance Testing:** The system was tested by another person to ensure the UI was intuitive and the gameplay was bug-free and enjoyable.

The system proved to be highly responsive, with negligible latency between a command being sent and the feedback being observed on both the device and the web UI.

## 8. Conclusion & Future Work

This project successfully created a fully integrated Smart Dice & Mini-Game System, demonstrating a powerful and accessible method for building modern IoT applications with web technologies. The final product is a fun, engaging, and polished gaming experience.

### Future Work
-   **3D-Printed Enclosure:** Design and print a custom case to create a portable, polished final product.
-   **Motion-Activated Rolling:** Integrate an accelerometer (e.g., MPU-6050) to trigger rolls by physically shaking the dice.
-   **Battery Power:** Add a LiPo battery and charging circuit to make the device truly wireless.
-   **Persistent High Scores:** Use the browser's `localStorage` to save high scores.
-   **Expanded Game Library:** Design and implement more complex games leveraging the web UI.
