# Handoff: Rakkhtt — Blood Bank Management Software (Theme Upgrade)

## Overview
Rakkhtt is a blood bank / blood centre management web application — a refreshed, more attractive re-theme of the existing "RAKT" product. It is a desktop-first admin dashboard used by blood-centre staff to monitor stock, manage donation camps, process patient blood-issue requests (reception), and review analytics / regulatory performance indicators.

The design covers four primary, navigable screens behind a shared app shell:
1. **Home** — operational dashboard (KPIs, blood stock, work progress, charts)
2. **Reception** — patient blood-issue request table (billing & serology workflow)
3. **Analytics** — Performance Indicators + Graphs
4. **Camp** — donation-camp calendar + camp overview

## About the Design Files
The file in this bundle (`Rakkhtt.dc.html`) is a **design reference created in HTML** — a working prototype that demonstrates the intended look, layout, copy, and interactive behavior. **It is not production code to copy directly.**

> ⚠️ It is authored in a proprietary "Design Component" (`.dc.html`) format with a custom template runtime (`<x-dc>`, `<sc-for>`, `<sc-if>`, a `Component extends DCLogic` class, `renderVals()`, etc.). **Do not try to run or import this format.** Read it as a spec: the template shows markup/styles, and the logic class shows the data and interactions.

The task is to **recreate this design in the target codebase's existing environment** (React, Vue, Angular, etc.) using its established component library, styling system, and data layer. If no front-end environment exists yet, choose an appropriate modern stack (e.g. React + TypeScript + a utility or component-CSS approach) and implement it there. Wire the currently-hardcoded demo data to real APIs.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, charts, and interactions are all specified below and should be recreated faithfully. Exact hex values, font families/weights, radii, and shadows are given in the Design Tokens section. Recreate pixel-faithfully, but substitute the codebase's own primitives (buttons, inputs, tables, chart library) where they exist rather than re-deriving raw CSS.

---

## Layout System (shared shell)

The app is a single-page experience with a **sticky top bar**, a **sticky primary nav bar** directly beneath it, and a centered content column.

- **Page background:** `#F4EEF0` (warm rosy off-white) with two faint radial tints in the top corners:
  - `radial-gradient(900px 520px at 92% -8%, rgba(220,38,38,0.07), transparent 60%)`
  - `radial-gradient(800px 480px at 4% -6%, rgba(159,18,57,0.06), transparent 55%)`
- **Content column:** `max-width: 1320px; margin: 0 auto; padding: 30px 30px 70px;`
- **Font (UI/body):** `'Plus Jakarta Sans'`, weights 400–800
- **Font (headings, big numbers, logo):** `'Bricolage Grotesque'`, weights 600–800
- **Base text color:** `#231A1F`; muted `#8A7A80`; light-muted `#9A8C92` / `#A79DA4`

### Top Bar
- Sticky, `z-index: 60`. `padding: 14px 34px`. Background `rgba(255,255,255,0.92)` with `backdrop-filter: blur(12px)`, bottom border `1px solid #ECE0E4`.
- **Left — Logo:** a blood-droplet SVG (gradient `#E11D48 → #9F1239`) with a white EKG/pulse polyline inside, next to wordmark **"Rakkhtt"** (Bricolage Grotesque 800, 23px, `letter-spacing:-.5px`, color `#231A1F`). Clicking the logo navigates Home.
- **Search:** pill input, `max-width: 520px`, background `#F4EEF0`, radius `999px`, magnifier icon, placeholder "Search donors, bags, requests…". On focus: white bg + accent border.
- **Right — Centre selector:** a clickable chip (`#F4EEF0` bg, `#EBDFE3` border, radius 13px) showing a building icon + the current blood-centre name + chevron. Opens a 290px dropdown listing 3 centres; selected centre highlighted with accent text + `#FBEEF1` background + filled dot.
- **Right — User menu:** 42px circular avatar (gradient `#E11D48 → #9F1239`, white "V"), name "Vipul Sharma" / role "Administrator", chevron. Opens a 210px dropdown: My Profile, Settings, Sign out.
- A full-screen transparent backdrop (`z-index:40`) closes the centre/user/stock dropdowns on outside click.

### Primary Nav Bar
- Sticky at `top: 71px`, `z-index: 50`. `padding: 0 26px`.
- **Background:** `linear-gradient(95deg,#7C1330 0%,#9F1239 48%,#BE1240 100%)`, shadow `0 6px 20px rgba(124,19,48,.22)`.
- **Items (left→right):** Home, Camp, Blood Bag, Donor, QC, Store, Reception, Analytics.
- Each item: button, `padding: 18px 18px`, Plus Jakarta Sans 700/15px. Inactive `rgba(255,255,255,.74)`; active/hover `#fff`.
- **Active indicator:** a white bar `height:3px; border-radius:3px 3px 0 0` pinned to the bottom of the active item (inset 14px left/right).
- **Dropdowns (open on hover / mouse-enter; close on mouse-leave of the whole nav):**
  - **Home →** Dashboard (→Home), Accounting, Tools ›, Directory ›, Users, Settings
  - **Blood Bag →** grouped menu with headers: "I. Component Preparation" (Bag Entry, Segment Blood Grouping, Blood Processing, Component Volume, Validation), "II. Grouping" (F/R Grouping, Validation), "III. TTI" (HIV/HBsAG & HCV, VDRL & MP, Validation), "IV. Shift To Tested Stock"
  - **Reception →** MIS Reports, Registers, Graphs › (→Analytics/Graphs tab), Performance Indicators (→Analytics/PI tab), Feedbacks, Donor Recall
  - Items without a menu (Camp, Donor, QC, Store, Analytics) just navigate.
- Dropdown panel: white, `border:1px solid #EFE4E8`, `border-radius:0 0 16px 16px`, shadow `0 22px 50px rgba(60,15,30,.20)`, padding 10px, entrance animation `rakRise .14s ease`.
- Dropdown header rows: Bricolage Grotesque 700/13.5px `#231A1F`. Item rows: 600/14.5px `#5A4A50`, hover `background:#FBEEF1; color:#9F1239`, with a 9px radio-style marker (filled accent when that item's target screen is active) and an optional right chevron.

---

## Screens / Views

### 1. Home (Dashboard)
**Purpose:** At-a-glance operational status for the centre.

**Layout (top → bottom):**
1. **Header row** — left: "Good morning, Vipul" (Bricolage 800/30px, `-.6px`) + subtitle "Here's what's happening at your blood centre today." (15px `#8A7A80`). Right: **New Request** button (accent bg, white, radius 13px, plus icon, shadow `0 8px 22px rgba(220,38,38,.28)`) → navigates to Reception.
2. **KPI row** — 4-column grid, gap 18px. Each card: white, `border:1px solid #F0E6EA`, radius 18px, `padding:22px`, card shadow (see tokens). Contents: small label (13px `#8A7A80`) + a 38px rounded icon tile (`background: color-mix(in srgb, accent 12%, transparent)`, accent stroke icon), a big number (Bricolage 800/38px, `-1px`), and a status pill.
   - **Total Units in Stock** — `267` — pill "+12 this week" (green: text `#15803D`, bg `#DCFCE7`)
   - **Expiring in ≤7 days** — `18` — pill "Rotate soon" (amber: `#B45309` / `#FEF3C7`)
   - **Donations Today** — `32` — pill "+8 vs yesterday" (green)
   - **Open Requests** — `6` — pill "2 pending serology" (blue: `#1D4ED8` / `#DBEAFE`)
3. **Two-column row** (`grid-template-columns: 1.7fr 1fr`, gap 18px, align start):
   - **Left — "Blood Stock by Component" card.** Header has the title + a **stock-type selector** dropdown (options: Tested Stock / Untested Stock / Reserved), an **Excel** button (green `#15803D`), and a **PDF** button (accent). Then a table:
     - Columns: COMPONENT, then blood groups **A+ A- B+ B- O+ O- AB+ AB-**, then **TOTAL**.
     - Component cells are colored chips: WB `#9F1239`, PLC `#F59E0B`, PRBC `#DC2626`, FFP `#FB7185` (white text, radius 8px).
     - Cell values right-aligned; zeros shown muted `#C8BCC1`, non-zeros `#3A2C32`. Row TOTAL in accent-deep `#9F1239` bold.
     - Data:
       - WB: 0,0,3,0,0,0,2,0 → **5**
       - PLC: 0,0,0,0,0,0,0,0 → **0**
       - PRBC: 6,2,31,0,44,1,10,2 → **96**
       - FFP: 36,4,64,4,37,4,13,4 → **166**
       - **Total row** (`#FBF5F7` bg, top border 2px `#EBDFE3`): 42,6,98,4,81,5,25,6 → **267**
   - **Right column** (stacked, gap 18px):
     - **"Work Completed Today" card** — a 78px circular progress ring (conic-gradient: accent `0→281deg` i.e. 78%, rest `#F3E5EA`) with "78%" centered; title + "33 of 42 tasks done". Then a list with colored dots + label + count: Bag Entry `14` (`#DC2626`), Component Preparation `8` (`#FB7185`), TTI Validation `5` (`#9F1239`), Issued to Patients `6` (`#F59E0B`).
     - **"Component Split" donut card** — 140px donut (conic-gradient by component, segments with value > 0), center shows `267` + "UNITS". Legend rows: square swatch + label + value for FFP 166, PRBC 96, WB 5, PLC 0.
4. **"Available Units by Blood Group" bar chart card** — full width. 8 vertical bars (one per blood group), height 180px. Bar fill `linear-gradient(180deg,#E11D48,#9F1239)`, `border-radius:8px 8px 4px 4px`, `max-width:40px`. Value label above (Bricolage 800/14px), group label below. Values: A+42, A-6, B+98, B-4, O+81, O-5, AB+25, AB-6.

### 2. Reception
**Purpose:** Manage patient blood-issue requests and their billing / serology completion.

**Layout:**
1. **Crimson banner** (see "Section Banner" pattern). Left: clipboard-check icon + "Reception" (Bricolage 800/27px) + subtitle "Blood issue requests, billing & serology status". Right: **Add** button (white bg, accent-deep text) and **Return To Stock** button (translucent white).
2. **Table card** (white, radius 20px):
   - **Tabs row** (bottom-bordered): Issue (default active), Bulk Request, Fractionation, Inward Stock. Active tab = accent text + 3px accent bottom border.
   - **Toolbar row:** left = search input (placeholder "Search patient or request ID…", filters Patient + Request ID, case-insensitive); right = **"Show Pending Only"** toggle switch (track `#D8CCD1` → accent when on; 19px white knob slides 19px). When on, only rows with Billing OR Serology == "Pending" show.
   - **Table columns:** DATE (sortable ↑/↓, default sort = date desc), REQUEST ID, PATIENT (sortable), COMPONENT, BILLING (centered), SEROLOGY (centered). Header row bg `#FBF5F7`, labels 12.5px 700 `#8A7A80`.
   - **Row cells:** date `#4A3A40`; request ID bold accent; patient bold `#231A1F`; component = colored chip (same component colors as Home); billing/serology = status pill — **Completed** (green `#15803D`/`#DCFCE7`) or **Pending** (amber `#B45309`/`#FEF3C7`), min-width 104px, radius 999px. Row hover bg `#FCF8F9`.
   - **Empty state:** "No requests match your filters." when filtered list is empty.
   - **Footer:** "Showing N of 9 requests" + Previous / `1` (active, accent) / Next pagination.
   - **Data (9 rows):**
     | Date | Request ID | Patient | Component | Billing | Serology |
     |---|---|---|---|---|---|
     | 2026-06-24 | ACBC26-R00618 | Mrs. RUPA | PRBC | Completed | Completed |
     | 2026-06-24 | ACBC26-R00617 | Mrs. MONA | FFP | Completed | Completed |
     | 2026-06-24 | ACBC26-R00616 | Mrs. GUDIYA | PRBC | Pending | Completed |
     | 2026-06-24 | ACBC26-R00615 | Mr. HAR PRAKASH | WB | Completed | Pending |
     | 2026-06-23 | ACBC26-R00614 | Mrs. SAHIBA | PRBC | Completed | Completed |
     | 2026-06-23 | ACBC26-R00613 | Mrs. TARANNUM | FFP | Pending | Pending |
     | 2026-06-23 | ACBC26-R00612 | Mr. RAVI KUMAR | PRBC | Completed | Completed |
     | 2026-06-22 | ACBC26-R00611 | Mrs. ANITA DEVI | PLC | Completed | Pending |
     | 2026-06-22 | ACBC26-R00610 | Mr. SURESH | FFP | Completed | Completed |

### 3. Analytics
**Purpose:** Regulatory performance indicators and visual reports.

**Layout:**
1. **Crimson banner** — line-chart icon + "Analytics" (Bricolage 800/27px). Right: a date-range chip showing `01/06/26 – 25/06/26` (calendar icon, translucent white bg). Below the title: **tab pills** — "Performance Indicators" (default) and "Graphs". Active pill = white bg + accent-deep text; inactive = translucent white.
2. **Performance Indicators tab** — 3-column grid, gap 18px. Each card: white, radius 18px, `padding:22px 22px 16px`. Top row: wrapped metric label (13.5px 600 `#8A7A80`, min-height 38px) + a status pill (right). Then big value (Bricolage 800/40px, `-1.5px`) + unit (16px 700 `#8A7A80`). Then a **sparkline** SVG (viewBox 0 0 120 34, area fill at 0.12 opacity + 2px stroke polyline).
   - Status pill colors by tone: good `#15803D`/`#DCFCE7`, warn (Monitor) `#B45309`/`#FEF3C7`, info (Improving) `#1D4ED8`/`#DBEAFE`, neutral (No data) `#8A7A80`/`#F1E9EC`. Sparkline stroke: warn `#D97706`, info `#2563EB`, neutral `#B8A9AF`, else accent.
   - **9 cards (label — value unit — status — trend series):**
     1. Transfusion Transmitted Infections — `1.49 %` — Monitor — [2.1,1.9,1.7,1.8,1.5,1.49]
     2. Voluntary Blood Donations — `100.0 %` — On target — [88,91,95,97,99,100]
     3. Outdated WB / Concentrated RBC — `0.0 %` — On target — [1.2,0.8,0.4,0.2,0.1,0]
     4. Adverse Transfusion Reactions — `1.15 %` — Monitor — [0.9,1.0,1.3,1.1,1.2,1.15]
     5. Adverse Donor Reactions — `0.0 %` — On target — [0.3,0.2,0.1,0,0,0]
     6. Components Prepared From Whole Blood — `96.52 %` — On target — [90,92,94,95,96,96.5]
     7. TAT of Whole Blood / RBC Issue — `35.1 mins` — Improving — [44,41,39,38,36,35.1]
     8. Donor Deferrals — `0.0 %` — No data — [0,0,0,0,0,0]
     9. Quantity Not Sufficient (QNS) — `0.0 %` — On target — [0.5,0.3,0.2,0.1,0,0]
3. **Graphs tab** — `grid-template-columns: 230px 1fr`:
   - **Left rail** — "REPORT" label + radio-style option list: Accounting, Camp, Blood Bags, Donor, Deferred Donor, Reception, TTI. Selected row: accent text + `#FBEEF1` bg + filled accent marker. (Camp/Donor/Reception switch the dataset; others fall back to Camp.)
   - **Right** — a **bar chart card** (title + subtitle change with selection; bars `linear-gradient(180deg,#FB7185,#DC2626)`, height 230px, max-width 52px), then a 2-up row: a **"Distribution by Group" donut** (130px; O+/O- 44 `#DC2626`, B+/B- 34 `#FB7185`, A+/A- 30 `#9F1239`, AB+/AB- 17 `#F59E0B`) and a **"6-Month Trend" line chart** (SVG 300×150; area fill accent @0.08 + 2.5px accent line + white-filled accent dots; labels Jan–Jun; values [60,95,80,120,88,125]).
   - **Datasets:**
     - Camp → "Collection per Camp": Mahaveer Farm 28, Income Tax Office 22, Village Dahaur 31, Prathmik Vidyalay 14, Village Madkarimpur 18, Civil Lines 12
     - Donor → "Donors by Age Band": 18–24:24, 25–34:38, 35–44:31, 45–54:19, 55–64:9, 65+:4
     - Reception → "Requests per Day": Mon 8, Tue 12, Wed 9, Thu 14, Fri 11, Sat 7

### 4. Camp
**Purpose:** Schedule/view donation camps and review camp performance.

**Layout:**
1. **Header row** — left: a segmented control card (white, radius 14px) with **Calendar** (default) / **Overview** pills (active = accent bg + white text). Right: **Add Camp** button (accent).
2. **Calendar tab** — white card. Header: "June 2026" (Bricolage 800/22px) + prev/next icon buttons + "Today" button (accent text). A 7-column month grid (Mon–Sun), 5 weeks, 2px gaps, outer radius 14px. Weekday header cells `#FBF5F7`. Day cells: `min-height:104px`. Out-of-month cells faded (`#FAF6F8`, opacity .55). **Today = the 25th** → cell bg `#FBEEF1`, day number in an accent-tinted circle. Events render as left-accent-bordered chips (`#FBE9EE` bg) with bold time + truncated name.
   - **Events:** Jun 3 "9a PRATHMIK VIDYALAY"; Jun 7 "11a MAHAVEER FARM BALAJI"; Jun 14 "10a INCOME TAX OFFICE" + "12p VILLAGE DAHAUR KHAT"; Jun 21 "10a VILLAGE MADKARIMPUR"; Jun 23 "9a CIVIL LINES SOUTH". (Note: June 1, 2026 is a Monday.)
3. **Overview tab** — a **crimson banner** with "Camp's Overview" + "Excluding in-house donations · 01 Jun – 25 Jun 2026", and two stat tiles on the right: **6** Total Camps, **125** Total Collection. Below, `1.6fr 1fr` row: **"Collection per Camp" bar chart** (6 bars, fill `linear-gradient(180deg,#FB7185,#9F1239)`, height 220px) and a **"Collection by Group" donut** (140px, center "125 UNITS"; O+/O- 46, B+/B- 35, A+/A- 28, AB+/AB- 16).

---

## Reusable Patterns

### Section Banner (used on Reception, Analytics, Camp Overview)
```
position: relative; overflow: hidden; border-radius: 20px; padding: 26px 30px; color: #fff;
background: linear-gradient(115deg,#7F1D2E 0%,#A4163A 52%,#C81E4A 100%);
box-shadow: 0 14px 36px rgba(150,20,50,.22);
```
With an absolutely-positioned dotted texture overlay:
```
position:absolute; inset:0; opacity:.45;
background-image: radial-gradient(rgba(255,255,255,.12) 1px, transparent 1.6px);
background-size: 18px 18px;
```

### Standard Card
```
background:#fff; border:1px solid #F0E6EA; border-radius:18–20px; padding:22–26px;
box-shadow: 0 1px 2px rgba(31,18,24,.04), 0 12px 30px rgba(136,19,55,.05);
```

### Donut chart
Render as a `conic-gradient` of `color start°→end°` segments on a circular div, with a white inner circle (`inset: ~22–26px`) for the hole + centered total/label. Only include segments with value > 0.

### Bar chart
Flex row, `align-items:flex-end`, fixed height; each bar height = `value / max * 100%` (clamp min ~5% so non-zero bars are visible, ~1.5% for zero). Value label above (Bricolage 800), category label below.

### Sparkline / line chart
SVG with `preserveAspectRatio:none`. Normalize series into the viewBox (invert Y). Provide both a closed `polyline` (area fill, low opacity) and an open `polyline` (stroke). Line chart adds white-filled circle nodes at each point.

---

## Interactions & Behavior
- **Primary navigation:** clicking a nav item (or certain dropdown items) switches the active screen via app state. Dropdown items can also target a specific tab (e.g. Reception → "Performance Indicators" opens Analytics with the PI tab active).
- **Nav dropdowns:** open on mouse-enter of an item, close on mouse-leave of the entire nav bar. (For touch/accessibility in production, also support click-to-open + Esc-to-close + focus management.)
- **Centre / user / stock-type dropdowns:** toggle on click; a transparent full-screen backdrop closes them on outside click. Opening one closes the others.
- **Reception search:** live filter on Patient name + Request ID (case-insensitive substring).
- **Reception "Show Pending Only":** toggles the switch; filters to rows where Billing or Serology is "Pending".
- **Reception column sort:** clicking DATE toggles date desc/asc; clicking PATIENT toggles patient asc/desc; header arrow reflects state (`⇅` inactive, `↑`/`↓` active).
- **Tabs:** Reception (Issue/Bulk/Fractionation/Inward), Analytics (PI/Graphs), Camp (Calendar/Overview) all switch via state.
- **Graphs report list:** selecting Camp/Donor/Reception swaps the chart dataset, title, and subtitle.
- **Entrance animation:** dropdowns use `@keyframes rakRise { from {opacity:0; translateY(8px)} to {opacity:1; translateY(0)} }` over `.14s ease`.
- **Hover states:** nav items lighten to white; buttons `filter: brightness(1.06)`; table rows tint `#FCF8F9`; menu items tint `#FBEEF1`.
- **Responsive:** designed desktop-first (~1320px content). Production should collapse the 3/4-column grids to fewer columns and make the nav a drawer on small screens — not specified in the mock; use the codebase's responsive conventions.

## State Management
Single screen-level state object. Variables observed in the prototype:
- `screen`: `'home' | 'reception' | 'analytics' | 'camp'`
- `openMenu`: which nav dropdown is open (`'home' | 'bloodbag' | 'reception' | null`)
- `centreOpen`, `userOpen`, `stockOpen`: boolean dropdown flags
- `centre`: selected blood-centre name (string)
- `topSearch`: top-bar search text
- `stockType`: `'Tested Stock' | 'Untested Stock' | 'Reserved'`
- `recTab`: `'issue' | 'bulk' | 'fractionation' | 'inward'`
- `recSearch`: reception search text
- `recPendingOnly`: boolean
- `sortCol`: `'date' | 'patient'`, `sortDir`: `'asc' | 'desc'`
- `analyticsTab`: `'pi' | 'graphs'`
- `graphType`: `'camp' | 'donor' | 'reception'`
- `campTab`: `'calendar' | 'overview'`
- `piDate`: date-range label string

**Data fetching (production):** all numbers/rows above are demo data hardcoded in the prototype. Replace with API calls — e.g. `GET /stock?type=tested`, `GET /reception/requests?tab=issue&pending=…&q=…&sort=…`, `GET /analytics/performance-indicators?range=…`, `GET /analytics/graphs?report=camp`, `GET /camps?month=2026-06`. The centre selector should scope all queries to the chosen centre.

## Design Tokens

**Colors**
- Accent (primary): `#DC2626` — *tweakable; alternatives `#E11D48`, `#BE123C`*
- Accent deep: `#9F1239`
- Component / chart palette: `#DC2626` (PRBC), `#FB7185` (FFP / rose), `#9F1239` (WB / deep), `#F59E0B` (PLC / amber)
- Nav gradient: `#7C1330 → #9F1239 → #BE1240`
- Banner gradient: `#7F1D2E → #A4163A → #C81E4A`
- Bar gradients: `#E11D48 → #9F1239` (home groups), `#FB7185 → #DC2626` (graphs), `#FB7185 → #9F1239` (camp)
- Page bg: `#F4EEF0`; card bg `#FFFFFF`; subtle fill `#FBF5F7` / `#F7F1F3` / `#FBF7F8`
- Borders: `#F0E6EA` (card), `#EBDFE3` (chip/input), `#F2E9EC` (table rules), `#ECE0E4` (topbar), `#EFE4E8` (dropdown)
- Hover tint: `#FBEEF1` / `#FCF8F9`; event chip bg `#FBE9EE`
- Text: `#231A1F` (ink), `#3A2C32`, `#4A3A40`, `#5A4A50`, muted `#8A7A80` / `#9A8C92` / `#A79DA4`, disabled `#C8BCC1`
- Semantic: success `#15803D` / `#DCFCE7`; warning `#B45309` (or `#D97706`) / `#FEF3C7`; info `#1D4ED8` (or `#2563EB`) / `#DBEAFE`; neutral `#8A7A80` / `#F1E9EC`
- Excel button green: `#15803D`

**Typography**
- Display/headings/numbers: **Bricolage Grotesque** — 800 (page titles 27–38px, KPI 38px, PI value 40px), 700 (card titles 17–22px)
- Body/UI: **Plus Jakarta Sans** — 700 (nav, buttons, labels), 600 (rows, menu items), 500 (inputs, dates), 400 (paragraphs)
- Notable letter-spacing: headings `-.4px` to `-1.5px`; uppercase table labels `+.4px`

**Radius:** chips/pills 7–11px; buttons 11–13px; inputs 11px (or 999px pill); cards 18–20px; circular elements 50%; pills/toggles 999px.

**Shadows:**
- Card: `0 1px 2px rgba(31,18,24,.04), 0 12px 30px rgba(136,19,55,.05)`
- Banner: `0 14px 36px rgba(150,20,50,.22)`
- Nav: `0 6px 20px rgba(124,19,48,.22)`
- Dropdown: `0 22px 50px rgba(60,15,30,.20)` (nav), `0 18px 48px rgba(80,20,40,.16)` (topbar)
- Primary button: `0 8px 22px rgba(220,38,38,.28)`

**Spacing:** content padding 30px; grid gaps 18px; card padding 22–26px; common element gaps 8–22px.

## Assets
- **No external image/icon assets.** The logo and all icons are **inline SVG** (stroke-based line icons, ~1.8–2.4 stroke width). Recreate with the codebase's icon library (e.g. Lucide / Heroicons — most match: droplet, clock, heart, file, clipboard-check, building, calendar, chevrons, search, plus, line-chart). The Rakkhtt logo droplet+pulse mark should be reproduced as an SVG asset.
- **Fonts** are Google Fonts: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) and [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans). Self-host or load via the codebase's font pipeline.
- **Charts** are hand-built (CSS conic-gradient donuts, flex bars, SVG polylines). In production, prefer the codebase's chart library (Recharts, Chart.js, ECharts, etc.) styled with the palette above.

## Files
- `Rakkhtt.dc.html` — the full design prototype (all four screens + shared shell). Read the `<x-dc>` template for markup/styles and the `Component extends DCLogic` class for data + interaction logic. **Reference only — do not run or import this format.**
