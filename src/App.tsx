import {BrowserRouter, Route, Routes} from 'react-router-dom'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './components/teampages/Home'
import MyTeam from './components/teampages/MyTeam'
import Login from './components/teampages/Login'
import Draft from './components/teampages/Draft'
import Units from './components/teampages/Units'
import CreateLeague from './components/teampages/CreateLeague'
import JoinLeague from './components/teampages/JoinLeague'
import League from './components/teampages/League'
import FreeAgents from './components/teampages/FreeAgents'
import Rosters from './components/teampages/Rosters'
import Scoring from './components/teampages/Scoring'
import TeamScores from './components/teampages/TeamScores'
import WeekScores from './components/teampages/WeekScores'
import Schedule from './components/teampages/Schedule'
import Standings from './components/teampages/Standings'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />}/>

                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/" element={<Home />} />
                    <Route path="/units" element={<Units />} />
                    <Route path="/league/:leagueId/team" element={<MyTeam />} />
                    <Route path="/create-league" element={<CreateLeague />} />
                    <Route path="/join-league" element={<JoinLeague />} />
                    <Route path="/league/:leagueId/draft" element={<Draft />} />
                    <Route path="/league/:leagueId/free-agents" element={<FreeAgents />}/>
                    <Route path="/league/:leagueId/team/:memberId" element={<Rosters />}/>
                    <Route path="/scoring" element={<Scoring />}/>
                    <Route path="/league/:leagueId" element={<League />} />
                    <Route path="/team-scores" element={<TeamScores />}/>
                    <Route path="/league/:leagueId/week-scores/:week" element={<WeekScores />}/>
                    <Route path="/league/:leagueId/schedule" element={<Schedule />}/>
                    <Route path="/league/:leagueId/standings" element={<Standings />}/>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App