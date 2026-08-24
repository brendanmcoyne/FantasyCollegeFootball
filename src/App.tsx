import {
    BrowserRouter,
    Route,
    Routes,
} from 'react-router-dom'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './components/teampages/Home'
import MyTeam from './components/teampages/MyTeam'
import Login from './components/teampages/Login'
import CreateLeague from './components/teampages/CreateLeague'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="/"
                        element={<Home />}
                    />

                    <Route
                        path="/team"
                        element={<MyTeam />}
                    />
                    <Route
                        path="/create-league"
                        element={<CreateLeague />}
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App