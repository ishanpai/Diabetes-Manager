# Diabetes Workflow Companion – Product Requirements Description

## 1 Purpose

Deliver a web application that lets a caregiver record meals, blood sugar readings and insulin doses for several patients, then request a model generated insulin recommendation with a single tap. The tool must remove copy–paste friction, feel fast on every device and present data in a clean visual format.

---

## 2 Primary Persona

| Persona       | Goal                                                               | Pain points solved                                                  |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Caregiver** | Track patient data quickly, get safe insulin advice, edit mistakes | Manual logging is slow, prompts are clunky, dose maths is stressful |

---

## 3 Major User Stories

- **US-01** Caregiver can sign up, log in and switch between patient profiles.
- **US-02** Caregiver can record blood sugar value with units, date and time.
- **US-03** Caregiver can record a meal by choosing a favourite, copying yesterday, or entering free text.
- **US-04** Caregiver can record insulin by selecting one of the patient’s usual medications (Actrapid or Ryzodeg to start) and entering units.
- **US-05** Caregiver can edit or delete any previous entry.
- **US-06** Caregiver can press **Recommend Insulin Dose**; the app shows a progress banner:
  1. Gathering history
  2. Building prompt
  3. Waiting for model
  4. Parsing answer
- **US-07** Result displays dose, reasoning, a two line legal disclaimer and a warning if the dose differs by more than twenty per cent from the most recent comparable dose.
- **US-08** Caregiver can view a timeline and a line chart of glucose values with colour bands.

---

## 4 Functional Requirements

1. **Authentication**
   - Email and password, JSON Web Token session.

2. **Patient Management**
   - Create, read, update, delete patient profile with:
     - Full name, birthday, diabetes type.
     - Typical lifestyle description and usual physical activity.
     - List of usual medications with standard units; these populate insulin dropdowns.

3. **Data Capture**
   - Date-time picker defaults to now.
   - Validations: glucose 40 to 600 mg/dL, insulin units 0 to 50.
   - Quick add buttons: yesterday’s breakfast, favourite meal.

4. **Recommendation Flow**
   - Past seventy two hour events are fetched from SQLite, ordered, placed into a prompt template.
   - Call a reasoning model (OpenAI 4o-mini or Anthropic Haiku) through a single wrapper that reads API key and model name from environment.
   - Response is stored and returned to the front end.

5. **Safety Layer**
   - Check percentage change against last dose; if above threshold ask for confirmation.

6. **History and Visuals**
   - Scrollable table of recent entries.
   - Recharts line graph with tooltips that show linked meals and doses.

---

## 5 Nonfunctional Requirements

| Area                 | Requirement                                                          |
| -------------------- | -------------------------------------------------------------------- |
| Performance          | Recommendation round-trip under eight seconds on average mobile data |
| Availability         | Ninety nine per cent uptime for single container deployment          |
| Security             | HTTPS, bcrypt hashed passwords, parameterised SQL                    |
| Compliance           | All data stays inside container volume                               |
| Accessibility        | WCAG AA colour contrast, full keyboard support                       |
| Internationalisation | Units toggle mg/dL or mmol/L                                         |

---

## 6 Technical Architecture

| Layer         | Choice                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Front end     | **Next.js** (pages router), Material UI for components, React Hook Form for inputs, Zustand for state |
| Back end      | Next.js API routes, Express style handlers, with SQLite                                               |
| Charts        | Recharts                                                                                              |
| Model adapter | Node service with exponential back-off and cost logging                                               |
| Container     | Single Dockerfile exposing port 3000, named volume for SQLite                                         |

---

## 7 Data Model (SQLite)

```text
patients
  id PK
  name
  dob
  diabetes_type
  lifestyle TEXT
  activity_level TEXT
  usual_medications JSON   -- [{brand:"Actrapid",unit:"IU"}]
  created_at

entries
  id PK
  patient_id FK
  entry_type ENUM('glucose','meal','insulin')
  value TEXT
  units TEXT
  medication_brand TEXT NULL
  occurred_at DATETIME
  created_at

recommendations
  id PK
  patient_id FK
  prompt TEXT
  response TEXT
  dose_units INTEGER
  reasoning TEXT
  created_at
```

## 8 API Endpoints

| Method | Path             | Action                       |
| ------ | ---------------- | ---------------------------- |
| POST   | /api/auth/signup | Create user                  |
| POST   | /api/auth/login  | Issue token                  |
| GET    | /api/patients    | List patients                |
| POST   | /api/patients    | Add patient                  |
| POST   | /api/entries     | Add reading, meal or insulin |
| PUT    | /api/entries/:id | Edit entry                   |
| DELETE | /api/entries/:id | Remove entry                 |
| POST   | /api/recommend   | Run recommendation           |

---

## 9 UX Notes

- Home page shows four primary action buttons arranged responsively.
- A progress banner appears as soon as a recommendation starts and updates through each stage.
- Charts accept pinch zoom on touch screens and hover tooltips on desktop.
- Numeric fields call the mobile number pad.
- Toast messages confirm saves and highlight errors.

---

## 10 Safety and Quality Checklist

- Unit tests cover outlier logic and prompt builder.
- Integration tests mock the model call.
- Environment variables: `MODEL_API_KEY`, `MODEL_NAME`, `JWT_SECRET`.
- A daily SQLite dump runs inside the container volume.

---

## 11 Deployment Guide

1. **Build the image**
   ```bash
   docker build -t diabetes-companion .
   ```
2. **Run the container**
   ```bash
   docker run -d \
       -p 80:3000 \
       -e MODEL_API_KEY=your_key \
       -e MODEL_NAME=openai-4o-mini \
       -e JWT_SECRET=supersecret \
       -v /opt/diabetes_data:/app/data \
       diabetes-companion
   ```
3. **Add TLS** with Caddy or an Nginx reverse proxy.
