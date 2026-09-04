import {pointsAllowedScore, ScoringUnitType, yardsAllowedScore} from "./scoring";
import type {TeamStats} from "../types/football";
import styled from "styled-components";

const BreakdownRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;
`;

export function getScoreBreakdown(unitType: ScoringUnitType, stats: TeamStats) {
    switch (unitType) {
        case 'PASSING':
            return (
                <>
                    <BreakdownRow>
                        <span>Passing Yards ({stats.passing_yards ?? 0} × 0.1)</span>
                        <strong>{((stats.passing_yards ?? 0) * 0.1).toFixed(1)}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Passing TDs ({stats.passing_touchdowns ?? 0} × 5)</span>
                        <strong>{(stats.passing_touchdowns ?? 0) * 5}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Interceptions ({stats.passing_interceptions ?? 0} × -3)</span>
                        <strong>{(stats.passing_interceptions ?? 0) * -3}</strong>
                    </BreakdownRow>
                </>
            )

        case 'RUSHING':
            return (
                <>
                    <BreakdownRow>
                        <span>Rushing Yards ({stats.rushing_yards ?? 0} × 0.1)</span>
                        <strong>{((stats.rushing_yards ?? 0) * 0.1).toFixed(1)}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Rushing TDs ({stats.rushing_touchdowns ?? 0} × 5)</span>
                        <strong>{(stats.rushing_touchdowns ?? 0) * 5}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Fumbles Lost ({stats.rushing_fumbles_lost ?? 0} × -3)</span>
                        <strong>{(stats.rushing_fumbles_lost ?? 0) * -3}</strong>
                    </BreakdownRow>
                </>
            )

        case 'RECEIVING':
            return (
                <>
                    <BreakdownRow>
                        <span>Receiving Yards ({stats.passing_yards ?? 0} × 0.1)</span>
                        <strong>{((stats.passing_yards ?? 0) * 0.1).toFixed(1)}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Receiving TDs ({stats.passing_touchdowns ?? 0} × 5)</span>
                        <strong>{(stats.passing_touchdowns ?? 0) * 5}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Fumbles Lost ({stats.receiving_fumbles_lost ?? 0} × -3)</span>
                        <strong>{(stats.receiving_fumbles_lost ?? 0) * -3}</strong>
                    </BreakdownRow>
                </>
            )

        case 'DEFENSE':
            return (
                <>
                    <BreakdownRow>
                        <span>Starting Score</span>
                        <strong>25</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Interceptions ({stats.defensive_interceptions ?? 0} × 3)</span>
                        <strong>{(stats.defensive_interceptions ?? 0) * 3}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Fumble Recoveries ({stats.defensive_fumble_recoveries ?? 0} × 3)</span>
                        <strong>{(stats.defensive_fumble_recoveries ?? 0) * 3}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Defensive TDs ({stats.defensive_touchdowns ?? 0} × 5)</span>
                        <strong>{(stats.defensive_touchdowns ?? 0) * 5}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Safeties ({stats.safeties ?? 0} × 4)</span>
                        <strong>{(stats.safeties ?? 0) * 4}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Sacks ({stats.sacks ?? 0} × 2)</span>
                        <strong>{(stats.sacks ?? 0) * 2}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Points Allowed: {stats.points_allowed ?? 0}</span>
                        <strong>{pointsAllowedScore(stats.points_allowed ?? 0)}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Yards Allowed: {stats.total_yards_allowed ?? 0}</span>
                        <strong>{yardsAllowedScore(stats.total_yards_allowed ?? 0)}</strong>
                    </BreakdownRow>
                </>
            )

        case 'SPECIAL_TEAMS': {
            const extraPointsMade = stats.extra_points_made ?? 0
            const extraPointsAttempted = stats.extra_points_attempted ?? 0
            const extraPointsMissed = Math.max(0, extraPointsAttempted - extraPointsMade)
            const fieldGoalsMade = stats.field_goals_made ?? 0
            const fieldGoalsAttempted = stats.field_goals_attempted ?? 0
            const fieldGoalsMissed = Math.max(0, fieldGoalsAttempted - fieldGoalsMade)
            const fieldGoalDistances = stats.field_goal_distances_made ?? []
            const fieldGoalPoints = fieldGoalDistances.reduce((total, distance) => total + Math.max(3, distance / 10), 0)

            return (
                <>
                    <BreakdownRow>
                        <span>Extra Points Made ({extraPointsMade} × 2)</span>
                        <strong>{extraPointsMade * 2}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Extra Points Missed ({extraPointsMissed} × -2)</span>
                        <strong>{extraPointsMissed * -2}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Field Goals Made</span>
                        <strong>{fieldGoalPoints.toFixed(1)}</strong>
                    </BreakdownRow>

                    {fieldGoalDistances.map(
                        (distance, index) => (
                            <BreakdownRow key={`${distance}-${index}`}>
                                <span>{distance}-yard Field Goal</span>
                                <strong>{Math.max(3, distance / 10).toFixed(1)}</strong>
                            </BreakdownRow>
                        )
                    )}

                    <BreakdownRow>
                        <span>Field Goals Missed ({fieldGoalsMissed} × -1)</span>
                        <strong>{fieldGoalsMissed * -1}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Special Teams TDs ({stats.special_teams_touchdowns ?? 0} × 5)</span>
                        <strong>{(stats.special_teams_touchdowns ?? 0) * 5}</strong>
                    </BreakdownRow>

                    <BreakdownRow>
                        <span>Blocked Kicks ({stats.blocked_kicks ?? 0} × 3)</span>
                        <strong>{(stats.blocked_kicks ?? 0) * 3}</strong>
                    </BreakdownRow>
                </>
            )
        }
    }
}