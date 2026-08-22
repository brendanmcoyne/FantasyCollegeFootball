import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Layout from './components/Layout';
import Nav from './components/Nav';
import Home from './components/teampages/Home';
import MyTeam from './components/teampages/MyTeam';
import Draft from './components/teampages/Draft';
import Players from './components/teampages/Players';
import Standings from './components/teampages/Standings';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/team" element={<MyTeam />} />
                    <Route path="/draft" element={<Draft />} />
                    <Route path="/players" element={<Players />} />
                    <Route path="/standings" element={<Standings />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App