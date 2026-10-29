import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { getTeams } from '../../api/cfbApi'
import { getWeeklyStats, getLiveTeamStats } from '../../api/weeklyStats'
import { calculateUnitScore } from '../../utils/scoring'
import { CURRENT_WEEK } from '../../bigseasonfile'
import styled, { keyframes } from 'styled-components'

import type { CollegeTeam, TeamStats } from '../../types/football'
import type { ScoringUnitType } from '../../utils/scoring'
import type { WeeklyTeamData } from '../../api/weeklyStats'
import { BackButton } from "../../styles/commonstyles";
import { getScoreBreakdown } from "../../utils/ScoringBreakdown"
import { getLeagueStandings, type Standing } from '../../utils/standings'
import { getPlayoffSeeds, PlayoffRound1, type PlayoffTeam } from '../../utils/playoffs'

interface RosterRow {
    id: string
    league_member_id: string
    college_team_id: number
    unit_type: ScoringUnitType
    roster_slot: 'STARTER' | 'BENCH'
}

interface ScoredUnit {
    rosterId: string
    teamName: string
    unitType: ScoringUnitType
    score: number
    stats: TeamStats | null
    locked: boolean
    scoreChange?: 'up' | 'down'
}

interface FantasyTeamScore {
    memberId: string
    teamName: string
    starterTotal: number
    benchTotal: number
    starters: ScoredUnit[]
    bench: ScoredUnit[]
}

interface LeagueMatchup {
    id: string
    team1_id: string
    team2_id: string
}

const UNIT_ORDER: ScoringUnitType[] = [
    'PASSING',
    'RUSHING',
    'RECEIVING',
    'DEFENSE',
    'SPECIAL_TEAMS',
]

const ScoresPage = styled.div`
    display: grid;
    gap: 24px;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
`;

const HeaderCard = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    h1 {
        overflow-wrap: anywhere;
    }
    
    @media (max-width: 700px) {
        padding: 16px;

        h1 {
            font-size: 1.8rem;
        }
    }
`;

const WeekLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    @media (max-width: 700px) {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
`;

const WeekLink = styled(Link)<{ $active?: boolean }>`
    padding: 8px 12px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    background: ${({ $active }) =>
    $active ? '#1f2937' : '#ffffff'};
    color: ${({ $active }) =>
    $active ? '#ffffff' : '#374151'};
    border: 1px solid #d1d5db;

    &:hover {
        background: ${({ $active }) =>
    $active ? '#111827' : '#f3f4f6'};
    }

    @media (max-width: 700px) {
        padding: 8px 6px;
        font-size: 0.9rem;
    }
`;

const Status = styled.span`
    display: inline-block;
    padding: 5px 10px;
    border-radius: 999px;
    background: #e5e7eb;
    font-weight: 700;
    color: #374151;
`;

const SectionCard = styled.section`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    margin: 0;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const MatchupCard = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    margin-top: 14px;

    @media (max-width: 700px) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 4px;
    }
`;

const GroupedMatchup = styled.div`
    grid-column: 1 / -1;
    padding: 18px;

    @media (max-width: 700px) {
        padding: 12px;
    }
`;

const MobileHeader = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e5e7eb;

    @media (max-width: 700px) {
        gap: 12px;
    }
`;

const MobileUnitRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
    padding: 7px 0;

    @media (max-width: 700px) {
        gap: 12px;
    }
`;

const MobileHeaderTeam = styled.div<{ $side: 'left' | 'right' }>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    text-align: ${({ $side }) =>
            $side === 'left' ? 'left' : 'right'};

    @media (min-width: 701px) {
        flex-direction: ${({ $side }) =>
                $side === 'left' ? 'row' : 'row-reverse'};

        align-items: center;
        justify-content: space-between;
        gap: 16px;
    }
    
    @media (max-width: 700px) {
        ${({ $side }) => $side === 'right' && `
        align-items: flex-end;

        ${TeamNameWithRecord} {
            align-items: flex-end;
        }
    `}
    }
`;

const MobileHeaderScore = styled.div`
    font-size: 1.3rem;
    font-weight: 700;
`;

const MobileSectionTitle = styled.h4`
    margin: 16px 0 8px;
    padding: 6px;
    background: #f3f4f6;
    border-radius: 6px;
    text-align: center;
    font-size: 0.85rem;
    color: #374151;
`;


const MobileUnitCell = styled.div<{ $side: 'left' | 'right' }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;

    ${({ $side }) => $side === 'right' && `
        flex-direction: row-reverse;
    `}

    &:hover {
        background: #f3f4f6;
    }

    span {
        min-width: 0;
        overflow-wrap: anywhere;
        font-size: 0.85rem;
    }
`;

const TeamRecord = styled.span`
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    white-space: nowrap;
`;

const scoreFlash = keyframes`
    0% {
        transform: scale(1);
    }

    25% {
        transform: scale(1.15);
    }

    100% {
        transform: scale(1);
    }
`;

const UnitScore = styled.strong<{ $change?: 'up' | 'down' }>`
    display: inline-block;

    color: ${({ $change }) =>
            $change === 'up' ? '#16a34a' : $change === 'down' ? '#dc2626' : 'inherit'
    };

    animation: ${({ $change }) =>
            $change ? scoreFlash : 'none'} 1s ease;
`;

const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
`;

const ModalCard = styled.div`
    width: min(520px, 100%);
    max-height: 80vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
`;

const CloseButton = styled.button`
    margin-top: 18px;
    border: none;
    border-radius: 8px;
    padding: 9px 14px;
    background: #1f2937;
    color: white;
    font-weight: 700;
    cursor: pointer;
`;

const FutureMatchupCard = styled.div`
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 16px;

    padding: 18px 20px;
    margin-top: 12px;

    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;

    @media (max-width: 700px) {
        grid-template-columns: 1fr auto 1fr;
        gap: 8px;
        padding: 14px 12px;
    }
`;

const FutureTeam = styled.div`
    font-weight: 700;
    color: #111827;
    min-width: 0;
    overflow-wrap: anywhere;
`;

const FutureTeamLeft = styled(FutureTeam)`
    text-align: right;
`;

const FutureTeamRight = styled(FutureTeam)`
    text-align: left;
`;

const VsText = styled.div`
    font-weight: 700;
    color: #6b7280;
    text-align: center;
`;

const TeamNameWithRecord = styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;

    @media (max-width: 700px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
    }
`;

const ByeSection = styled.div`
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
`;

const ByeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 600px) {
        grid-template-columns: 1fr;
    }
`;

const ByeTeam = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
`;

const ByeLabel = styled.span`
    color: #6b7280;
    font-size: 12px;
    font-weight: 700;
`;

const BenchUnitRow = styled(MobileUnitRow)`
    padding: 10px 8px;
    border-bottom: 1px solid #f3f4f6;

    &:last-child {
        border-bottom: none;
    }
`;

const MatchupBar = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    width: 100%;

    @media (max-width: 700px) {
        gap: 6px;
    }
`;

const MatchupTab = styled.button<{ $active: boolean }>`
    width: 100%;
    min-width: 0;
    padding: 14px 16px;
    border-radius: 10px;
    border: 2px solid ${({ $active }) =>
            $active ? '#2563eb' : '#e5e7eb'};
    background: ${({ $active }) =>
            $active ? '#eff6ff' : '#ffffff'};
    color: #111827;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;

    &:hover {
        background: ${({ $active }) =>
                $active ? '#eff6ff' : '#f9fafb'};
    }

    @media (max-width: 700px) {
        padding: 10px 6px;
    }
`;

const MatchupTabTeam = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    padding: 4px 0;

    span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    strong {
        flex-shrink: 0;
    }
`;

function formatUnitType(unitType: ScoringUnitType): string {
    return unitType === 'SPECIAL_TEAMS' ? 'Special Teams' : unitType.charAt(0) + unitType.slice(1).toLowerCase()
}

export default function WeekScores() {
    const { leagueId, week: weekParam } = useParams()
    const week = Number(weekParam)

    const [scores, setScores] = useState<FantasyTeamScore[]>([])
    const [matchups, setMatchups] = useState<LeagueMatchup[]>([])
    const scoresRef = useRef<FantasyTeamScore[]>([])
    const [standings, setStandings] = useState<Standing[]>([])
    const [playoffSeeds, setPlayoffSeeds] = useState<PlayoffTeam[]>([])
    const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null)

    const [selectedUnit, setSelectedUnit] = useState<ScoredUnit | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const weekStarted = week <= CURRENT_WEEK
    const weekComplete = week < CURRENT_WEEK

    useEffect(() => {
        scoresRef.current = scores
    }, [scores])

    useEffect(() => {
        if (matchups.length === 0) {
            setSelectedMatchupId(null)
            return
        }

        setSelectedMatchupId((current) =>
            matchups.some((matchup) => matchup.id === current)
                ? current
                : matchups[0].id
        )
    }, [matchups])

    useEffect(() => {
        async function loadScores() {

            const maxWeek = Math.min(CURRENT_WEEK, 13)

            if (!leagueId || !Number.isInteger(week) || week < 1 || week > 13 || (week >= 11 && week > maxWeek)) {
                setError('This playoff round is not available yet.')
                setLoading(false)
                return
            }

            setLoading(true)
            setError('')

            try {
                const loadedStandings = await getLeagueStandings(leagueId)
                setStandings(loadedStandings)

                if (week >= 11) {
                    const seeds = await getPlayoffSeeds(leagueId)
                    setPlayoffSeeds(seeds)
                }

                const [weeklyStats, collegeTeams] = await Promise.all([getWeeklyStats(week), getTeams()])

                const { data: members, error: membersError } = await supabase
                    .from('league_members')
                    .select('id, team_name')
                    .eq('league_id', leagueId)

                if (membersError) {
                    throw membersError
                }

                if (week === CURRENT_WEEK) {
                    const { error: initializeError } = await supabase.rpc(
                        'initialize_weekly_rosters',
                        {
                            target_league_id: leagueId,
                            target_week: week,
                        }
                    )

                    if (initializeError) {
                        throw initializeError
                    }
                }

                const { data: weeklyRosterRows, error: weeklyRosterError } =
                    await supabase
                        .from('weekly_rosters')
                        .select('id, league_member_id, college_team_id, unit_type, roster_slot')
                        .eq('league_id', leagueId)
                        .eq('week', week)

                if (weeklyRosterError) {
                    throw weeklyRosterError
                }

                const effectiveRosterRows: RosterRow[] =
                    (weeklyRosterRows ?? []).map((row) => ({
                        id: row.id,
                        league_member_id: row.league_member_id,
                        college_team_id: row.college_team_id,
                        unit_type: row.unit_type as ScoringUnitType,
                        roster_slot: row.roster_slot as 'STARTER' | 'BENCH',
                    }))

                const teamMap = new Map<number, CollegeTeam>(collegeTeams.map((team) => [team.id, team]))

                const weeklyMap = new Map<string, WeeklyTeamData>(
                    weeklyStats.map((team) => [team.team.trim().toLowerCase(), team])
                )

                const now = new Date()

                const liveStatsEntries = await Promise.all(
                    effectiveRosterRows.map(async (row) => {
                        const collegeTeam = teamMap.get(row.college_team_id)

                        if (!collegeTeam) {
                            return [row.college_team_id, null] as const
                        }

                        const weeklyTeam = weeklyMap.get(collegeTeam.name.trim().toLowerCase())
                        const gameStart = weeklyTeam?.gameStart ?? null

                        if (gameStart === null || now.getTime() < gameStart.getTime()) {
                            return [row.college_team_id, null] as const
                        }

                        try {
                            const liveStats = await getLiveTeamStats(collegeTeam.name, week)

                            return [row.college_team_id, liveStats] as const
                        } catch (error) {
                            console.error(`Failed to load ESPN stats for ${collegeTeam.name}:`, error)

                            return [row.college_team_id, null] as const
                        }
                    })
                )

                const liveStatsMap = new Map(liveStatsEntries)

                function scoreUnit(row: RosterRow): ScoredUnit {
                    const collegeTeam = teamMap.get(row.college_team_id)

                    if (!collegeTeam) {
                        return {
                            rosterId: row.id,
                            teamName: 'Unknown Team',
                            unitType: row.unit_type,
                            score: 0,
                            stats: null,
                            locked: false,
                        }
                    }

                    const weeklyTeam = weeklyMap.get(
                        collegeTeam.name.trim().toLowerCase()
                    )

                    const liveTeam = liveStatsMap.get(row.college_team_id)

                    const gameStarted =
                        weeklyTeam?.gameStart !== null &&
                        weeklyTeam?.gameStart !== undefined &&
                        now.getTime() >= weeklyTeam.gameStart.getTime()

                    const stats = liveTeam?.stats ?? null

                    return {
                        rosterId: row.id,
                        teamName: collegeTeam.name,
                        unitType: row.unit_type,
                        score: stats && gameStarted && weekStarted ? calculateUnitScore(row.unit_type, stats) : 0,
                        stats,
                        locked: gameStarted,
                    }
                }

                const fantasyScores: FantasyTeamScore[] =
                    (members ?? []).map((member) => {
                        const roster = effectiveRosterRows.filter(
                            (row: RosterRow) => row.league_member_id === member.id)

                        const starters = roster.filter((row: RosterRow) => row.roster_slot === 'STARTER').map(scoreUnit)
                        const bench = roster.filter((row: RosterRow) => row.roster_slot === 'BENCH').map(scoreUnit)

                        return {
                            memberId: member.id,
                            teamName: member.team_name,
                            starters, bench,
                            starterTotal: starters.reduce((total, unit) => total + unit.score, 0),
                            benchTotal: bench.reduce((total, unit) => total + unit.score, 0),
                        }
                    })

                if (week === 11 && CURRENT_WEEK >= 11) {
                    await PlayoffRound1(leagueId)
                }

                const { data: weekMatchups, error: matchupError } =
                    await supabase
                        .from('league_matchups')
                        .select('id, team1_id, team2_id')
                        .eq('league_id', leagueId)
                        .eq('week', week)

                if (matchupError) {
                    throw matchupError
                }

                const currentMatchups = (weekMatchups ?? []) as LeagueMatchup[]

                setMatchups(currentMatchups)

                for (const matchup of currentMatchups) {
                    const team1 = fantasyScores.find((team) => team.memberId === matchup.team1_id)
                    const team2 = fantasyScores.find((team) => team.memberId === matchup.team2_id)

                    if (!team1 || !team2) {
                        continue
                    }

                    const { error: updateError } = await supabase
                        .from('league_matchups')
                        .update(weekStarted
                            ? {
                                team1_score: team1.starterTotal, team2_score: team2.starterTotal,
                                winner_id: weekComplete ? team1.starterTotal >= team2.starterTotal
                                    ? matchup.team1_id : matchup.team2_id : null,
                            } : {
                                team1_score: null, team2_score: null, winner_id: null,
                            }
                        )
                        .eq('id', matchup.id)

                    if (updateError) {
                        throw updateError
                    }
                }

                setScores(fantasyScores)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load weekly scores.')
            } finally {
                setLoading(false)
            }
        }

        void loadScores()
    }, [leagueId, week, weekStarted, weekComplete])

    useEffect(() => {
        if (week !== CURRENT_WEEK) {
            return
        }

        const interval = window.setInterval(() => {
            void Promise.all(
                scoresRef.current.map(async (team) => {
                    async function refreshUnit(unit: ScoredUnit): Promise<ScoredUnit> {
                        if (!unit.locked) {
                            return unit
                        }

                        try {
                            const liveStats = await getLiveTeamStats(unit.teamName, week)

                            const stats = liveStats?.stats ?? unit.stats
                            const newScore = stats ? calculateUnitScore(unit.unitType, stats) : unit.score

                            return {
                                ...unit, stats, score: newScore,
                                scoreChange: newScore > unit.score ? 'up' : newScore < unit.score ? 'down' : undefined
                            }
                        } catch (error) {
                            console.error(`Failed to refresh ESPN stats for ${unit.teamName}:`, error)

                            return unit
                        }
                    }

                    const starters = await Promise.all(team.starters.map(refreshUnit))
                    const bench = await Promise.all(team.bench.map(refreshUnit))

                    return {
                        ...team, starters, bench,
                        starterTotal: starters.reduce((total, unit) => total + unit.score, 0),
                        benchTotal: bench.reduce((total, unit) => total + unit.score, 0)
                    }
                })
            ).then((updatedScores) => {
                setScores(updatedScores)

                window.setTimeout(() => {
                    setScores((currentScores) =>
                        currentScores.map((team) => ({
                            ...team,
                            starters: team.starters.map((unit) => ({
                                ...unit, scoreChange: undefined})),
                            bench: team.bench.map((unit) => ({
                                ...unit, scoreChange: undefined})),
                        }))
                    )
                }, 1500)
            })
        }, 15000)

        return () => {
            window.clearInterval(interval)
        }
    }, [week])

    function GroupedMatchupDisplay({team1, team2,}: { team1: FantasyTeamScore, team2: FantasyTeamScore }) {
        const getRecord = (team: FantasyTeamScore) => {
            const standing = standings.find(
                (item) => item.memberId === team.memberId
            )

            return standing ? `${standing.wins}-${standing.losses}` : '0-0'
        }

        function renderMobileUnit(unit: ScoredUnit | undefined, side: 'left' | 'right', bench = false) {
            if (!unit) {
                return <div />
            }

            return (
                <MobileUnitCell
                    key={unit.rosterId}
                    $side={side}
                    onClick={() => {
                        if (unit.stats) {
                            setSelectedUnit(unit)
                        }
                    }}
                >
                    <span style={{fontSize: bench ? '0.85rem' : '1rem', fontWeight: bench ? 400 : 700,}}>
                        {unit.teamName}
                        {bench && ` ${formatUnitType(unit.unitType)}`}
                    </span>

                    <UnitScore $change={unit.scoreChange}>
                        {unit.score.toFixed(1)}
                    </UnitScore>
                </MobileUnitCell>
            )
        }

        function renderSection(title: string, leftUnits: ScoredUnit[], rightUnits: ScoredUnit[]) {
            const count = Math.max(leftUnits.length, rightUnits.length)

            if (count === 0) {
                return null
            }

            return (
                <div key={title}>
                    <MobileSectionTitle>{title}</MobileSectionTitle>

                    {Array.from({ length: count }, (_, index) => (
                        <MobileUnitRow key={index}>
                            {renderMobileUnit(leftUnits[index], 'left')}
                            {renderMobileUnit(rightUnits[index], 'right')}
                        </MobileUnitRow>
                    ))}
                </div>
            )
        }

        const bench1 = [...team1.bench].sort(
            (a, b) => UNIT_ORDER.indexOf(a.unitType) - UNIT_ORDER.indexOf(b.unitType))

        const bench2 = [...team2.bench].sort(
            (a, b) => UNIT_ORDER.indexOf(a.unitType) - UNIT_ORDER.indexOf(b.unitType))

        return (
            <>
                <MobileHeader>
                    <MobileHeaderTeam $side="left">
                        <TeamNameWithRecord>
                            <strong>{team1.teamName}</strong>
                            <TeamRecord>({getRecord(team1)})</TeamRecord>
                        </TeamNameWithRecord>

                        <MobileHeaderScore>{team1.starterTotal.toFixed(1)}</MobileHeaderScore>
                    </MobileHeaderTeam>

                    <MobileHeaderTeam $side="right">
                        <TeamNameWithRecord>
                            <strong>{team2.teamName}</strong>
                            <TeamRecord>({getRecord(team2)})</TeamRecord>
                        </TeamNameWithRecord>

                        <MobileHeaderScore>{team2.starterTotal.toFixed(1)}</MobileHeaderScore>
                    </MobileHeaderTeam>
                </MobileHeader>

                {UNIT_ORDER.map((unitType) =>
                    renderSection(
                        formatUnitType(unitType),
                        team1.starters.filter((unit) => unit.unitType === unitType),
                        team2.starters.filter((unit) => unit.unitType === unitType)
                    )
                )}

                <MobileSectionTitle>Bench</MobileSectionTitle>

                {Array.from(
                    { length: Math.max(bench1.length, bench2.length) },
                    (_, index) => (
                        <BenchUnitRow key={`bench-${index}`}>
                            {renderMobileUnit(bench1[index], 'left', true)}
                            {renderMobileUnit(bench2[index], 'right', true)}
                        </BenchUnitRow>
                    )
                )}

            </>
        )
    }

    if (loading) {
        return <p>Loading Week {week} scores...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <ScoresPage>
            <HeaderCard>
            <BackButton onClick={() => navigate(`/league/${leagueId}`)}>
                ← Back
            </BackButton>

                <h1>
                    {week === 11 ? 'Week 11 — Quarterfinals' :
                    week === 12 ? 'Week 12 — Semifinals' :
                    week === 13 ? 'Week 13 — Championship' :
                    `Week ${week} League Scores`}
                </h1>

                <WeekLinks>
                    {Array.from({length: Math.max(10, Math.min(CURRENT_WEEK, 13))}, (_, index) => {
                        const weekNumber = index + 1

                        return (
                            <WeekLink key={weekNumber}
                                to={`/league/${leagueId}/week-scores/${weekNumber}`}
                                $active={weekNumber === week}
                            >
                                {weekNumber === 11
                                    ? 'Round 1' : weekNumber === 12
                                    ? 'Round 2' : weekNumber === 13
                                    ? 'Round 3' : `Week ${weekNumber}`}
                            </WeekLink>
                        )
                    })}
                </WeekLinks>

            <p>
                <Status>{weekComplete ? 'Final' : weekStarted ? 'In Progress' : 'Not Started'}</Status>
            </p>
            </HeaderCard>

            <SectionCard>
                <MatchupBar>
                    {matchups.map((matchup) => {
                        const team1 = scores.find(
                            (team) => team.memberId === matchup.team1_id
                        )
                        const team2 = scores.find(
                            (team) => team.memberId === matchup.team2_id
                        )

                        if (!team1 || !team2) return null

                        return (
                            <MatchupTab
                                key={matchup.id}
                                type="button"
                                $active={selectedMatchupId === matchup.id}
                                onClick={() => setSelectedMatchupId(matchup.id)}
                            >
                                <MatchupTabTeam>
                                    <span>{team1.teamName}</span>
                                    <strong>
                                        {weekStarted
                                            ? team1.starterTotal.toFixed(1)
                                            : '-'}
                                    </strong>
                                </MatchupTabTeam>

                                <MatchupTabTeam>
                                    <span>{team2.teamName}</span>
                                    <strong>
                                        {weekStarted
                                            ? team2.starterTotal.toFixed(1)
                                            : '-'}
                                    </strong>
                                </MatchupTabTeam>
                            </MatchupTab>
                        )
                    })}

                </MatchupBar>
            </SectionCard>

            <SectionCard>
                <h2>Matchups</h2>

                {matchups
                    .filter((matchup) => matchup.id === selectedMatchupId)
                    .map((matchup) => {
                        const team1 = scores.find(
                            (team) => team.memberId === matchup.team1_id
                        )

                        const team2 = scores.find(
                            (team) => team.memberId === matchup.team2_id
                        )

                        if (!team1 || !team2) {
                            return null
                        }

                        if (!weekStarted) {
                            return (
                                <FutureMatchupCard key={matchup.id}>
                                    <FutureTeamLeft>
                                        {team1.teamName}
                                    </FutureTeamLeft>

                                    <VsText>vs</VsText>

                                    <FutureTeamRight>
                                        {team2.teamName}
                                    </FutureTeamRight>
                                </FutureMatchupCard>
                            )
                        }

                        return (
                            <MatchupCard key={matchup.id}>
                                <GroupedMatchup>
                                    <GroupedMatchupDisplay
                                        team1={team1}
                                        team2={team2}
                                    />
                                </GroupedMatchup>
                            </MatchupCard>
                        )
                    })}

                {week === 11 && playoffSeeds.length >= 2 && (
                    <ByeSection>
                        <h3>First-Round Byes</h3>

                        <ByeGrid>
                            {playoffSeeds.slice(0, 2).map((team) => (
                                <ByeTeam key={team.memberId}>
                                <span>
                                    <strong>
                                        #{team.seed} {team.teamName}
                                    </strong>

                                    <TeamRecord>
                                        {' '}({team.wins}-{team.losses})
                                    </TeamRecord>
                                </span>

                                    <ByeLabel>BYE</ByeLabel>
                                </ByeTeam>
                            ))}
                        </ByeGrid>
                    </ByeSection>
                )}
            </SectionCard>

            <hr />

            {selectedUnit && selectedUnit.stats && (

                <ModalBackdrop onClick={() => setSelectedUnit(null)}>
                    <ModalCard onClick={(event) => event.stopPropagation()}>
                        <h2>
                            {selectedUnit.teamName}{' '}
                            {formatUnitType(selectedUnit.unitType)}
                        </h2>

                        <h3>Fantasy Score: {selectedUnit.score.toFixed(1)}</h3>

                        {getScoreBreakdown(selectedUnit.unitType, selectedUnit.stats)}

                        <CloseButton onClick={() => setSelectedUnit(null)}>
                            Close
                        </CloseButton>
                    </ModalCard>
                </ModalBackdrop>
            )}

        </ScoresPage>
    )
}