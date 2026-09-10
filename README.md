# Fantasy College Football

A full-stack fantasy sports web application that brings the fantasy football experience to college football. Instead of drafting individual players, users draft positional units from college football programs and compete based on their real-world performance.

## About the Project

Fantasy College Football was created to provide a fantasy football experience designed specifically around the structure of college football.

Users can create or join leagues, participate in a live draft, manage their roster, add free agents, view weekly scores, track league standings, and compare college football units throughout the season.

Unlike traditional fantasy football, teams draft entire positional units from college programs. For example, a fantasy roster may contain **USC Passing**, **Michigan Rushing**, or **Georgia Defense** rather than individual players.

## Features

- Create private fantasy leagues and join existing leagues using unique league codes
- Authenticate users and maintain league-specific teams and rosters
- Draft college football units through a live, turn-based draft system
- Draft five different unit types: Passing, Rushing, Receiving, Defense, and Special Teams
- Prevent duplicate units from being selected within the same league
- Manage starters and bench units while enforcing roster requirements
- Add and drop units through a league-specific free agency pool
- Calculate fantasy scores using real college football statistics
- View weekly fantasy matchups and scores
- Track league schedules and standings
- Browse college football teams and compare unit rankings

## How It Works

Rather than selecting individual college football players, each fantasy manager drafts units belonging to an entire school.

The available unit types are:

| Unit | Example |
| --- | --- |
| Passing | USC Passing |
| Rushing | Michigan Rushing |
| Receiving | Ohio State Receiving |
| Defense | Georgia Defense |
| Special Teams | Alabama Special Teams |

This approach simplifies the challenges created by the large number of players, transfers, injuries, and depth-chart changes in college football while still allowing users to build and manage their own fantasy teams.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- styled-components

### Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

### Data

College football statistics are processed into fantasy-relevant team units and weekly scoring data used throughout the application.

### Deployment

- Vercel

## Fantasy Rosters

Each fantasy roster is constructed from five types of college football units:

- 3 Passing
- 3 Rushing
- 3 Receiving
- 2 Defense
- 2 Special Teams
- 3 Bench

Roster validation is enforced during drafting and roster transactions to ensure teams maintain valid positional requirements.

## Draft System

Each league includes a turn-based draft system that tracks draft order and available units.

When a unit is selected:

1. The selection is stored as a league draft pick.
2. The unit becomes unavailable to other managers in that league.
3. The fantasy manager's roster is updated.
4. The draft advances to the next eligible manager.
5. Once all rosters are filled, the draft is marked complete.

The system also handles teams that have already filled their required roster by automatically advancing to the next eligible manager.

## Free Agency

After the draft, undrafted units remain available through the league's free agency pool.

Managers can add and drop units while the application validates the resulting roster to prevent transactions that would violate positional requirements.

## Scoring

College football statistics are converted into fantasy points based on the application's scoring system.

Weekly scores are used to determine matchup results and update league standings throughout the season.

## Authentication & Security

Authentication and application data are managed through Supabase.

Protected routes prevent unauthenticated users from accessing league functionality, while PostgreSQL Row Level Security policies restrict access to league and roster data.

## Running Locally

Clone the repository:

```bash
git clone https://github.com/brendanmcoyne/FantasyCollegeFootball.git
```

Navigate into the project:

```bash
cd FantasyCollegeFootball
```

Install dependencies:

```bash
npm install
```

Create the required environment variables for your Supabase project:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the development server:

```bash
npm run dev
```

The application will then be available through the local Vite development server.

## Project Structure

```text
FantasyCollegeFootball/
├── database/             # Database setup and SQL
├── public/
│   └── teams/            # College team assets
├── src/
│   ├── api/              # College football data and statistics
│   ├── components/
│   │   ├── lib/          # Shared application components
│   │   └── teampages/    # Main application pages
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Application utilities
│   ├── App.tsx           # Application routing
│   └── main.tsx          # Application entry point
├── package.json
└── README.md
```

## Future Improvements

- Expand scoring and statistics support for future college football seasons
- Improve draft-room synchronization and user experience
- Add additional commissioner controls and league settings
- Expand historical statistics and unit rankings
- Add additional league customization options
- Improve mobile responsiveness and accessibility

## Author

**Brendan Coyne**

GitHub: https://github.com/brendanmcoyne