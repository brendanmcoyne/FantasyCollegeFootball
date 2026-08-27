import type { CollegeTeam } from '../types/football'
import type { UnitType } from '../types/fantasy'

export function getUnitStats(
    unitType: UnitType,
    team?: CollegeTeam
) {
    if (!team) {
        return null
    }

    const stats = team.stats

    switch (unitType) {
        case 'PASSING':
            return (
                <>
                    <span>Passing Yards: {stats.passing_yards ?? 0}</span>
                    <span>Passing TDs: {stats.passing_touchdowns ?? 0}</span>
                </>
            )

        case 'RUSHING':
            return (
                <>
                    <span>Rushing Yards: {stats.rushing_yards ?? 0}</span>
                    <span>Rushing TDs: {stats.rushing_touchdowns ?? 0}</span>
                </>
            )

        case 'RECEIVING':
            return (
                <>
                    <span>Receiving Yards: {stats.passing_yards ?? 0}</span>
                    <span>Receiving TDs: {stats.passing_touchdowns ?? 0}</span>
                </>
            )

        case 'DEFENSE':
            return (
                <>
                    <span>Points Allowed: {stats.points_allowed ?? 0}</span>
                    <span>Yards Allowed: {stats.total_yards_allowed ?? 0}</span>
                    <span>Takeaways: {stats.takeaways ?? 0}</span>
                </>
            )

        case 'SPECIAL_TEAMS':
            return (
                <>
                    <span>
                        FGs: {stats.field_goals_made ?? 0}/
                        {stats.field_goals_attempted ?? 0}
                    </span>

                    <span>
                        XPs: {stats.extra_points_made ?? 0}/
                        {stats.extra_points_attempted ?? 0}
                    </span>

                    <span>
                        ST TDs: {stats.special_teams_touchdowns ?? 0}
                    </span>
                </>
            )
    }
}