# AI Learning Bot — Task 3

A Telegram bot that helps you learn from any URL using AI-powered summarization and quiz generation.

**Bot:** [@aleksei_teacher_bot](https://t.me/aleksei_teacher_bot)

---

## How to Use

### Step 1 — Start the bot
Open Telegram and search for **@aleksei_teacher_bot** or click the link above.

Send the command:
```
/start
```
The bot will greet you and explain available commands.

---

### Step 2 — Learn from a URL
Send a URL you want to learn from:
```
/learn https://en.wikipedia.org/wiki/Artificial_intelligence
```

The bot will:
- Extract the content from the URL
- Analyze it with the Teacher AI agent
- Send you a structured summary with key points and difficulty level

**Tested URLs that work well:**
- https://en.wikipedia.org/wiki/Artificial_intelligence
- https://habr.com/ru/articles/990330/
- https://habr.com/ru/articles/1036696/
- https://habr.com/ru/news/1031950/
- https://habr.com/ru/articles/1036606/

---

### Step 3 — Take a quiz
After saving one or more materials, send:
```
/quiz
```

The bot will:
- Show you a list of your saved topics as buttons
- Let you choose a topic
- Generate 5 multiple choice questions based on that material
- Send questions one by one with answer buttons (A, B, C, D)
- Show correct/incorrect feedback after each answer
- Display your final score when all 5 questions are answered

---

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and see available commands |
| `/learn [URL]` | Submit a URL to learn from |
| `/quiz` | Take a quiz on your saved materials |

---

## Requirements to Run

- n8n Cloud account (free trial works)
- Telegram Bot Token (from @BotFather)
- OpenAI API key
- Google Sheets connected to n8n

## Setup

1. Import `workflow.json` into n8n
2. Add your Telegram Bot Token credential
3. Add your OpenAI API key credential
4. Connect your Google Sheets account
5. Create a Google Sheet named `Learning Bot Data` with three tabs: `materials`, `quizzes`, `sessions`
6. Set the correct Sheet ID in all Google Sheets nodes
7. Replace `YOUR_BOT_TOKEN` in HTTP Request nodes with your actual token
8. Activate the workflow in n8n
