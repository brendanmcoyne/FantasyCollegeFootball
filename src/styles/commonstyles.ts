import styled from 'styled-components'

export const Page = styled.main`
    min-height: 100vh;
    background: #f3f4f6;
    padding: 32px;
`

export const Content = styled.div`
    width: min(1200px, 100%);
    margin: 0 auto;
`

export const Card = styled.div`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 18px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`

export const TeamLogo = styled.img`
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: 8px;
    background: #ffffff;
`
