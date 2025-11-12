// ===== Smart Digital Dice & Mini Game System (ESP32) - V2 ENHANCED BLE =====
//
// This version uses Bluetooth Low Energy (BLE), has multiple game modes,
// button + BLE control, sound effects, and now — blinking winner display after a win.
//

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---------------- Pin mapping (segments a–g)
const int a = 13; const int b = 12; const int c = 14; const int d = 27;
const int e = 26; const int f = 25; const int g = 33;
const int pins[7] = {a,b,c,d,e,f,g};

// Button and Buzzer pins
const int buttonPin = 23;
const int buzzerPin = 32;

// ---------------- Segment patterns
// (a,b,c,d,e,f,g)
const byte numbers[7][7] = {
  {1,1,1,0,1,1,1}, // 0
  {0,0,1,0,0,1,0}, // 1
  {1,0,1,1,1,0,1}, // 2
  {1,0,1,1,0,1,1}, // 3
  {0,1,1,1,0,1,0}, // 4
  {1,1,0,1,0,1,1}, // 5
  {1,1,0,1,1,1,1}  // 6
};
const int snakeOrder[7] = {g, b, a, f, e, d, c};

// Letter patterns
const byte lettersTable[][7] = {
  {0,1,1,1,1,1,0}, // H (0)
  {1,1,0,1,1,0,1}, // E (1)
  {0,1,0,0,1,0,1}, // L (2)
  {0,0,0,1,1,1,1}, // o (3)
  {1,1,0,0,1,0,1}, // C (4)
  {0,0,0,0,1,1,1}, // u (5)
  {1,1,1,1,1,1,0}, // A (6)
  {0,1,0,1,1,1,1}, // b (7)
  {1,1,0,0,1,1,1}, // G (8)
  {0,0,0,1,1,0,0}, // r (9)
  {1,1,1,1,1,0,0}, // P (10)
  {0,0,1,1,1,1,1}, // d (11)
  {1,1,0,1,0,1,1}, // S (12)
  {0,0,0,1,1,1,0}  // n (13)
};

// ---------------- BLE Definitions
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
BLECharacteristic *pTxCharacteristic;
bool deviceConnected = false;

// ---------------- Game State
enum Mode {MODE_FREE, MODE_GAME, MODE_RACE, MODE_COUNTDOWN};
Mode currentMode = MODE_FREE;
int roundsPerGame = 5, currentRound = 0;
int playerTurn = 0;
int scoreA = 0, scoreB = 0;
int raceTarget = 0;
int countdownStartScore = 50;
bool raceModeRunning = false, gameModeRunning = false, countdownModeRunning = false;
bool soundEnabled = true;

// Timing
unsigned long buttonPressTime = 0;
const unsigned long debounceDelay = 50;
const unsigned long longPressDelay = 1000;

// ---------------- Function Prototypes
void clearSegments(); void displayNumber(int num);
void displayLetterIndex(int idx); void snakeAnimationSingle();
int rollDiceSequence(); void playClick(); void playVictory();
void playErrorTone(); void playBonusTone(); void playStartGameSound();
void playTurnChangeSound(); void playBustSound(); void showHelloCU();
void endLightShow(); void startGameMode(int rounds);
void startRaceMode(int target); void startCountdownMode(int startScore);
void handleShortButtonPress(); void handleLongButtonPress();
void handleCommand(String cmd); void sendBLEMessage(const String& message);
void cycleGameMode(); void flashWinner(char winner);

// ---------------- BLE Callbacks
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) { deviceConnected = true; Serial.println("Device connected"); }
  void onDisconnect(BLEServer* pServer) { deviceConnected = false; Serial.println("Device disconnected"); pServer->getAdvertising()->start(); }
};

class MyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String rxValue = pCharacteristic->getValue();
    if (rxValue.length() > 0) {
      String cmd = "";
      for (char i : rxValue) cmd += i;
      cmd.trim(); handleCommand(cmd);
    }
  }
};

// ==================================================================
// SETUP & LOOP
// ==================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("Starting ESP32 Smart Dice (V2 Enhanced BLE)");

  for (int i = 0; i < 7; ++i) { pinMode(pins[i], OUTPUT); digitalWrite(pins[i], LOW); }
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(buzzerPin, OUTPUT);

  BLEDevice::init("ESP32_Dice");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pTxCharacteristic = pService->createCharacteristic(CHARACTERISTIC_UUID_TX, BLECharacteristic::PROPERTY_NOTIFY);
  pTxCharacteristic->addDescriptor(new BLE2902());
  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(CHARACTERISTIC_UUID_RX, BLECharacteristic::PROPERTY_WRITE_NR);
  pRxCharacteristic->setCallbacks(new MyCallbacks());
  pService->start();
  pServer->getAdvertising()->start();
  Serial.println("BLE server started. Waiting for connection...");

  randomSeed(analogRead(0));
  showHelloCU();
}

void loop() {
  static bool buttonWasPressed = false;
  bool buttonIsPressed = (digitalRead(buttonPin) == LOW);

  if (buttonIsPressed && !buttonWasPressed) buttonPressTime = millis();
  else if (!buttonIsPressed && buttonWasPressed) {
    unsigned long pressDuration = millis() - buttonPressTime;
    if (pressDuration > longPressDelay) handleLongButtonPress();
    else if (pressDuration > debounceDelay) handleShortButtonPress();
  }
  buttonWasPressed = buttonIsPressed;
}

// ==================================================================
// BLE + COMMANDS
// ==================================================================
void sendBLEMessage(const String& message) {
  if (deviceConnected) {
    pTxCharacteristic->setValue(message.c_str());
    pTxCharacteristic->notify();
  }
  Serial.print("TX: "); Serial.println(message);
}

void handleCommand(String cmd) {
  cmd.toUpperCase();
  Serial.println("RX cmd: " + cmd);

  if (cmd == "ROLL") handleShortButtonPress();
  else if (cmd == "END") endLightShow();
  else if (cmd == "HELLO") showHelloCU();
  else if (cmd == "GAME") startGameMode(roundsPerGame);
  else if (cmd.startsWith("SETROUNDS ")) {
    int n = cmd.substring(10).toInt();
    if (n > 0) { roundsPerGame = n; sendBLEMessage("Rounds set to " + String(n)); }
    else sendBLEMessage("Invalid rounds value.");
  } else if (cmd.startsWith("RACE ")) {
    int n = cmd.substring(5).toInt();
    if (n > 0) startRaceMode(n); else sendBLEMessage("Invalid race target.");
  } else if (cmd.startsWith("COUNTDOWN ")) {
    int n = cmd.substring(10).toInt();
    if (n > 0) startCountdownMode(n); else sendBLEMessage("Invalid countdown start.");
  } else if (cmd == "RESET") {
    scoreA = scoreB = 0; currentRound = 0;
    gameModeRunning = raceModeRunning = countdownModeRunning = false;
    currentMode = MODE_FREE;
    sendBLEMessage("Reset done."); clearSegments();
  } else if (cmd == "SOUND OFF") { soundEnabled = false; sendBLEMessage("Sound disabled."); }
  else if (cmd == "SOUND ON") { soundEnabled = true; sendBLEMessage("Sound enabled."); }
  else sendBLEMessage("Unknown command.");
}

// ==================================================================
// BUTTON LOGIC
// ==================================================================
void handleShortButtonPress() {
  if (gameModeRunning || raceModeRunning || countdownModeRunning) {
    if (currentMode == MODE_GAME) {
      int result = rollDiceSequence();
      if (playerTurn == 0) scoreA += result; else scoreB += result;
      sendBLEMessage(String("Player ") + (playerTurn == 0 ? "A" : "B") + " rolled " + String(result));
      sendBLEMessage("Scores -> A: " + String(scoreA) + " B: " + String(scoreB));

      if (playerTurn == 0) {
        playerTurn = 1; sendBLEMessage("Player B turn."); playTurnChangeSound();
      } else {
        playerTurn = 0; currentRound++;
        sendBLEMessage("Round " + String(currentRound) + " finished.");
        if (currentRound >= roundsPerGame) {
          gameModeRunning = false; currentMode = MODE_FREE;
          sendBLEMessage("Game Over.");
          if (scoreA > scoreB) { sendBLEMessage("Winner: Player A"); playVictory(); flashWinner('A'); }
          else if (scoreB > scoreA) { sendBLEMessage("Winner: Player B"); playVictory(); flashWinner('b'); }
          else { sendBLEMessage("Draw!"); playVictory(); }
        } else { sendBLEMessage("Next round: Player A turn."); playTurnChangeSound(); }
      }
    } 
    else if (currentMode == MODE_RACE) {
      int result = rollDiceSequence();
      if (playerTurn == 0) scoreA += result; else scoreB += result;
      sendBLEMessage(String("Player ") + (playerTurn == 0 ? "A" : "B") + " rolled " + String(result));
      sendBLEMessage("Scores -> A: " + String(scoreA) + " B: " + String(scoreB));

      if (scoreA >= raceTarget || scoreB >= raceTarget) {
        raceModeRunning = false; currentMode = MODE_FREE;
        sendBLEMessage("Game Over.");
        if (scoreA >= raceTarget && scoreB >= raceTarget) { sendBLEMessage("Draw!"); playVictory(); }
        else if (scoreA >= raceTarget) { sendBLEMessage("Winner: Player A"); playVictory(); flashWinner('A'); }
        else { sendBLEMessage("Winner: Player B"); playVictory(); flashWinner('b'); }
      } else { playerTurn = 1 - playerTurn; sendBLEMessage(String("Next turn: Player ") + (playerTurn == 0 ? "A" : "B")); playTurnChangeSound(); }
    } 
    else if (currentMode == MODE_COUNTDOWN) {
      int result = rollDiceSequence();
      sendBLEMessage(String("Player ") + (playerTurn == 0 ? "A" : "B") + " rolled " + String(result));
      int* currentPlayerScore = (playerTurn == 0) ? &scoreA : &scoreB;
      if (result > *currentPlayerScore) { sendBLEMessage(String("Player ") + (playerTurn == 0 ? "A" : "B") + " busts!"); playBustSound(); }
      else *currentPlayerScore -= result;
      sendBLEMessage("Scores -> A: " + String(scoreA) + " B: " + String(scoreB));

      if (scoreA == 0 || scoreB == 0) {
        countdownModeRunning = false; currentMode = MODE_FREE;
        sendBLEMessage("Game Over.");
        if (scoreA == 0) { sendBLEMessage("Winner: Player A"); playVictory(); flashWinner('A'); }
        else { sendBLEMessage("Winner: Player B"); playVictory(); flashWinner('b'); }
      } else { playerTurn = 1 - playerTurn; sendBLEMessage(String("Next turn: Player ") + (playerTurn == 0 ? "A" : "B")); playTurnChangeSound(); }
    }
  } else rollDiceSequence(); // Free roll
}

void handleLongButtonPress() {
  if (gameModeRunning || raceModeRunning || countdownModeRunning) playErrorTone();
  else cycleGameMode();
}

// ==================================================================
// GAME MODE LOGIC
// ==================================================================
void cycleGameMode() {
  currentMode = (Mode)((currentMode + 1) % 4);
  clearSegments();
  switch(currentMode) {
    case MODE_FREE: sendBLEMessage("Mode: Free Roll"); break;
    case MODE_GAME: sendBLEMessage("Mode: A vs B Game"); displayLetterIndex(8); break;
    case MODE_RACE: sendBLEMessage("Mode: Race"); displayLetterIndex(9); break;
    case MODE_COUNTDOWN: sendBLEMessage("Mode: Countdown"); displayLetterIndex(4); break;
  }
  playClick(); delay(1000); clearSegments();
}

void startGameMode(int rounds) {
  roundsPerGame = rounds; scoreA = scoreB = 0; currentRound = 0; playerTurn = 0;
  gameModeRunning = true; currentMode = MODE_GAME;
  sendBLEMessage("GAME mode started. Rounds: " + String(roundsPerGame));
  playStartGameSound();
  displayLetterIndex(6); delay(400); clearSegments(); delay(200);
  displayLetterIndex(7); delay(400); clearSegments(); delay(200);
  sendBLEMessage("Player A turn.");
}

void startRaceMode(int target) {
  raceTarget = target; scoreA = scoreB = 0; playerTurn = 0;
  raceModeRunning = true; currentMode = MODE_RACE;
  sendBLEMessage("RACE mode started. Target: " + String(raceTarget));
  playStartGameSound();
  displayLetterIndex(6); delay(300); clearSegments(); delay(120);
  displayLetterIndex(7); delay(300); clearSegments();
  sendBLEMessage("Player A turn.");
}

void startCountdownMode(int startScore) {
  countdownStartScore = startScore; scoreA = scoreB = startScore; playerTurn = 0;
  countdownModeRunning = true; currentMode = MODE_COUNTDOWN;
  sendBLEMessage("COUNTDOWN mode started. Start Score: " + String(startScore));
  playStartGameSound();
  displayLetterIndex(6); delay(300); clearSegments(); delay(120);
  displayLetterIndex(7); delay(300); clearSegments();
  sendBLEMessage("Player A turn.");
}

// ==================================================================
// DISPLAY, SOUND, ANIMATION
// ==================================================================
void clearSegments() { for (int i = 0; i < 7; ++i) digitalWrite(pins[i], LOW); }
void displayNumber(int num) { if (num < 1 || num > 6) { clearSegments(); return; } for (int i = 0; i < 7; ++i) digitalWrite(pins[i], numbers[num][i] ? HIGH : LOW); }
void displayLetterIndex(int idx) { for (int i = 0; i < 7; ++i) digitalWrite(pins[i], lettersTable[idx][i] ? HIGH : LOW); }

int rollDiceSequence() {
  snakeAnimationSingle();
  int finalNum = random(1, 7);
  int delayTime = 40;
  for (int i = 0; i < 16; ++i) {
    displayNumber(random(1, 7));
    if (soundEnabled) { tone(buzzerPin, 350 + i * 90); delay(delayTime); noTone(buzzerPin); }
    else delay(delayTime);
    delayTime += 18;
  }
  displayNumber(finalNum);
  sendBLEMessage("Rolled: " + String(finalNum));
  playClick(); delay(250);
  if (finalNum == 6) { playBonusTone(); delay(80); playVictory(); }
  return finalNum;
}

void showHelloCU() {
  int seq[] = {0,1,2,2,3,4,5};
  for (int i : seq) { displayLetterIndex(i); delay(250); clearSegments(); delay(120); }
}

void endLightShow() {
  sendBLEMessage("END show");
  for (int r = 0; r < 6; ++r) {
    for (int i = 0; i < 7; ++i) {
      clearSegments(); digitalWrite(snakeOrder[i], HIGH);
      if (soundEnabled) tone(buzzerPin, 500 + i*100);
      delay(60); noTone(buzzerPin);
    }
  }
  playVictory(); clearSegments();
}

// ==================================================================
// SOUNDS + EFFECTS
// ==================================================================
void playClick() { if (!soundEnabled) return; tone(buzzerPin, 1500, 60); }
void playVictory() { if (!soundEnabled) return; int m[] = {880, 988, 1318, 988, 880}; for (int n : m) { tone(buzzerPin, n); delay(160); } noTone(buzzerPin); }
void playErrorTone() { if (!soundEnabled) return; tone(buzzerPin, 220, 200); delay(280); tone(buzzerPin, 160, 220); }
void playBonusTone() { if (!soundEnabled) return; int m[] = {740, 880, 1046}; for (int n : m) { tone(buzzerPin, n); delay(120); } noTone(buzzerPin); }
void playStartGameSound() { if (!soundEnabled) return; int m[] = {660,880,990,1320}; for (int n : m) { tone(buzzerPin, n); delay(120); } noTone(buzzerPin); }
void playTurnChangeSound() { if (!soundEnabled) return; tone(buzzerPin, 880, 150); delay(180); tone(buzzerPin, 988, 180); }
void playBustSound() { if (!soundEnabled) return; int m[] = {600,400,200}; for (int n : m) { tone(buzzerPin, n); delay(200); } noTone(buzzerPin); }

// ==================================================================
// ANIMATIONS
// ==================================================================
void snakeAnimationSingle() {
  for (int i = 0; i < 7; ++i) { clearSegments(); digitalWrite(snakeOrder[i], HIGH); delay(50); }
  for (int i = 6; i >= 0; --i) { clearSegments(); digitalWrite(snakeOrder[i], HIGH); delay(50); }
  clearSegments();
}

// ==================================================================
// WINNER FLASH EFFECT
// ==================================================================
void flashWinner(char winner) {
  int idx = (winner == 'A') ? 6 : 7; // A=6, b=7
  for (int i = 0; i < 10; ++i) { // flash 10 times
    displayLetterIndex(idx);
    delay(250);
    clearSegments();
    delay(200);
  }
}
