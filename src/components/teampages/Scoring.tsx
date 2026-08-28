import styled from 'styled-components'

const ScoringPage = styled.div`;
    display: grid;
    gap: 24px;
`;

const IntroCard = styled.div`;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const SectionCard = styled.section`;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SectionTitle = styled.h2`;
    margin-top: 0;
    margin-bottom: 14px;
    color: #111827;
`;

const Subheading = styled.h3`;
    margin-top: 20px;
    margin-bottom: 10px;
    color: #374151;
`;

const StyledTable = styled.table`;
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;

    th,
    td {
        padding: 12px 14px;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
    }

    th {
        background: #f3f4f6;
        color: #374151;
        font-weight: 700;
    }

    tr:last-child td {
        border-bottom: none;
    }

    tbody tr:hover {
        background: #f9fafb;
    }
`;

const Note = styled.p`;
    color: #6b7280;
    line-height: 1.6;
`;

export default function Scoring() {
    return (
        <ScoringPage>
            <IntroCard>
                <h1>Scoring Guidelines</h1>

                <p>
                    Fantasy points are earned by each college team's
                    individual unit. Only units in your starting lineup
                    count toward your weekly score.
                </p>
            </IntroCard>

            <SectionCard>
                <SectionTitle>Passing</SectionTitle>

                <StyledTable>
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
                </StyledTable>
            </SectionCard>

            <SectionCard>
            <SectionTitle>Rushing</SectionTitle>

            <StyledTable>
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
            </StyledTable>

            </SectionCard>

            <SectionCard>
            <SectionTitle>Receiving</SectionTitle>

            <StyledTable>
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
            </StyledTable>
            </SectionCard>

            <SectionCard>
            <SectionTitle>Defense</SectionTitle>

            <p>
                Each defense starts the week with 25 points. Points are deducted based on points and total yards allowed.
            </p>

            <StyledTable>
                <thead>
                <tr>
                    <th>Statistic</th>
                    <th>Points</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>Starting Score</td>
                    <td>25</td>
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
                <tr>
                    <td>Sack</td>
                    <td>+2</td>
                </tr>
                </tbody>
            </StyledTable>
            </SectionCard>

            <SectionCard>
            <SectionTitle>Points Allowed</SectionTitle>

            <StyledTable>
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
            </StyledTable>
            </SectionCard>

            <SectionCard>
            <SectionTitle>Yards Allowed</SectionTitle>

            <StyledTable>
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
            </StyledTable>
            </SectionCard>

            <SectionCard>
            <SectionTitle>Special Teams</SectionTitle>

            <StyledTable>
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
            </StyledTable>
            </SectionCard>

            <SectionCard>
                Example: A 25-yard field goal is worth 3 points, a 40-yard field goal is worth 4 points, and a 53-yard field goal is worth 5.3 points.
            </SectionCard>
        </ScoringPage>
    )
}