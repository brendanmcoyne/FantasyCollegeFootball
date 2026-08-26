export default function Scoring() {
    return (
        <div>
            <h1>Scoring Guidelines</h1>

            <p>
                Fantasy points are earned by each college team's
                individual unit. Only units in your starting lineup
                count toward your weekly score.
            </p>

            <h2>Passing</h2>

            <table>
                <thead>
                <tr>
                    <th>Statistic</th>
                    <th>Points</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>Passing Yard</td>
                    <td>+0.1</td>
                </tr>
                <tr>
                    <td>Passing Touchdown</td>
                    <td>+5</td>
                </tr>
                <tr>
                    <td>Interception</td>
                    <td>-3</td>
                </tr>
                </tbody>
            </table>

            <h2>Rushing</h2>

            <table>
                <thead>
                <tr>
                    <th>Statistic</th>
                    <th>Points</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>Rushing Yard</td>
                    <td>+0.1</td>
                </tr>
                <tr>
                    <td>Rushing Touchdown</td>
                    <td>+5</td>
                </tr>
                <tr>
                    <td>Fumble Lost</td>
                    <td>-3</td>
                </tr>
                </tbody>
            </table>

            <h2>Receiving</h2>

            <table>
                <thead>
                <tr>
                    <th>Statistic</th>
                    <th>Points</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>Receiving Yard</td>
                    <td>+0.1</td>
                </tr>
                <tr>
                    <td>Receiving Touchdown</td>
                    <td>+5</td>
                </tr>
                <tr>
                    <td>Fumble Lost</td>
                    <td>-3</td>
                </tr>
                </tbody>
            </table>

            <h2>Defense</h2>

            <p>
                Each defense starts the week with 30 points. Points are deducted based on points and total yards allowed.
            </p>

            <table>
                <thead>
                <tr>
                    <th>Statistic</th>
                    <th>Points</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>Starting Score</td>
                    <td>30</td>
                </tr>
                <tr>
                    <td>Interception</td>
                    <td>+3</td>
                </tr>
                <tr>
                    <td>Fumble Recovery</td>
                    <td>+3</td>
                </tr>
                <tr>
                    <td>Defensive Touchdown</td>
                    <td>+5</td>
                </tr>
                <tr>
                    <td>Safety</td>
                    <td>+4</td>
                </tr>
                </tbody>
            </table>

            <h3>Points Allowed</h3>

            <table>
                <thead>
                <tr>
                    <th>Points Allowed</th>
                    <th>Deduction</th>
                </tr>
                </thead>
                <tbody>
                <tr><td>0</td><td>0</td></tr>
                <tr><td>1–6</td><td>-2</td></tr>
                <tr><td>7–13</td><td>-5</td></tr>
                <tr><td>14–20</td><td>-8</td></tr>
                <tr><td>21–27</td><td>-12</td></tr>
                <tr><td>28–34</td><td>-16</td></tr>
                <tr><td>35–41</td><td>-20</td></tr>
                <tr><td>42+</td><td>-25</td></tr>
                </tbody>
            </table>

            <h3>Yards Allowed</h3>

            <table>
                <thead>
                <tr>
                    <th>Total Yards Allowed</th>
                    <th>Deduction</th>
                </tr>
                </thead>
                <tbody>
                <tr><td>0–199</td><td>0</td></tr>
                <tr><td>200–299</td><td>-2</td></tr>
                <tr><td>300–349</td><td>-4</td></tr>
                <tr><td>350–399</td><td>-6</td></tr>
                <tr><td>400–449</td><td>-8</td></tr>
                <tr><td>450–499</td><td>-10</td></tr>
                <tr><td>500–549</td><td>-12</td></tr>
                <tr><td>550+</td><td>-15</td></tr>
                </tbody>
            </table>

            <h2>Special Teams</h2>

            <table>
                <thead>
                <tr>
                    <th>Statistic</th>
                    <th>Points</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>Extra Point Made</td>
                    <td>+2</td>
                </tr>
                <tr>
                    <td>Extra Point Missed</td>
                    <td>-2</td>
                </tr>
                <tr>
                    <td>Field Goal Made</td>
                    <td>Max of 3 or FG distance ÷ 10</td>
                </tr>
                <tr>
                    <td>Field Goal Missed</td>
                    <td>-1</td>
                </tr>
                <tr>
                    <td>Special Teams Touchdown</td>
                    <td>+5</td>
                </tr>
                <tr>
                    <td>Blocked Kick</td>
                    <td>+3</td>
                </tr>
                </tbody>
            </table>

            <p>
                Example: A 25-yard field goal is worth 3 points, a 40-yard field goal is worth 4 points, and a 53-yard field goal is worth 5.3 points.
            </p>
        </div>
    )
}