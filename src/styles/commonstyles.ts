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

export const BackButton = styled.button`
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    padding: 9px 14px;
    color: #374151;
    font-weight: 600;
    cursor: pointer;
    width: fit-content;

    &:hover {
        background: #f3f4f6;
    }
`
