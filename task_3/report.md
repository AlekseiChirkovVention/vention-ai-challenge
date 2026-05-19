# Report — AI Learning Bot (Task 3)

## Tools and Technologies Used

- **n8n Cloud** — workflow automation platform for building the bot logic
- **Telegram Bot API** — user interface via @aleksei_teacher_bot
- **OpenAI GPT-4o-mini** — AI model powering both the Teacher and Examiner agents
- **Google Sheets** — persistent data storage for materials, quiz sessions, and user progress
- **Jina AI Reader** (`r.jina.ai`) — used to extract clean text content from any URL
- **n8n AI Workflow Builder** — used to generate initial node structures from natural language prompts

---

## Architecture

The workflow consists of four main branches triggered by a central Switch (Router) node:

1. **/start** — sends a welcome message with available commands
2. **/learn** — extracts URL content → Teacher AI Agent analyzes it → saves to Google Sheets → sends summary to user
3. **/quiz** — reads saved materials from Google Sheets → shows topic selection as inline keyboard buttons
4. **callback_query** — handles both topic selection (generates quiz via Examiner Agent) and answer buttons (validates answers, tracks progress, sends results)

---

## What Worked Well

- **Jina AI Reader** was extremely reliable for extracting clean text from URLs, including Wikipedia and Habr articles, without any authentication or scraping issues
- **n8n AI Workflow Builder** significantly accelerated development by generating node structures from detailed prompts, reducing manual configuration time
- **Google Sheets** worked well as a simple persistent storage solution — data was easy to inspect and debug visually
- **HTTP Request nodes** for Telegram (instead of native Telegram nodes) gave full control over inline keyboard formatting, which was essential for displaying answer buttons correctly
- **GPT-4o-mini** produced consistent and relevant quiz questions specific to each material

---

## What Did Not Work

- **Native Telegram node** could not reliably render dynamic inline keyboard buttons from an array — had to replace with direct HTTP Request calls to the Telegram Bot API
- **Context window limit** of GPT-4o-mini was exceeded when passing full Wikipedia article content — solved by truncating input to 8000 characters before sending to the AI agent
- **Session management** with Google Sheets had issues with stale rows causing questions from different topics to mix together — solved by deleting old session rows before creating a new quiz session
- **Google Sheets sheet ID caching** in n8n caused "Sheet not found" errors even when the correct sheet was selected — resolved by recreating affected nodes
- **Parse Mode: Markdown** in Telegram nodes caused "Bad request" errors with certain characters in AI-generated text — removed Parse Mode to avoid formatting conflicts

---

## Notable Decisions

- **Truncating content to 8000 characters** before sending to the AI agent — this loses some detail but keeps the workflow fast and within model limits. A better solution would be chunking and summarizing in multiple passes.
- **Using HTTP Request instead of Telegram node for inline keyboards** — the native n8n Telegram node does not support dynamic inline keyboard arrays cleanly, so all interactive messages use direct Telegram Bot API calls.
- **Google Sheets as session store** — simple and transparent for a hackathon project, but not suitable for production due to race conditions and lack of atomic operations. A proper solution would use a database like PostgreSQL or Redis.
- **Filtering sessions by state and updatedAt** — to always use the most recent active session for a user, preventing stale data from interfering with ongoing quizzes.
