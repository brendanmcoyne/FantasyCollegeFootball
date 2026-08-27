import styled from 'styled-components'

export const TeamLogo = styled.img`
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: 8px;
    background: #ffffff;
`;

export function getTeamLogo(teamName: string) {
    return `/teams/${teamName.split(' ').join('-')}.jpg`
}
