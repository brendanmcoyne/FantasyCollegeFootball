import styled from "styled-components";

export const UnitList = styled.div`
    display: grid;
    gap: 10px;
`;

export const UnitRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;

    @media (max-width: 700px) {
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) auto;
        gap: 10px;
    }
`;

export const UnitInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

export const UnitName = styled.div`
    font-weight: 700;
    color: #111827;
`;

export const UnitDetails = styled.div`
    margin-top: 3px;
    color: #6b7280;
    font-size: 0.9rem;

    @media (max-width: 700px) {
        line-height: 1.4;
    }
`;

export const TeamNameButton = styled.button`
    border: none;
    background: none;
    padding: 0;
    color: #111827;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    text-align: left;

    &:hover {
        text-decoration: underline;
    }
`;

export const OpponentButton = styled.button`
    border: none;
    background: none;
    padding: 0;
    color: #2563eb;
    font: inherit;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }
`;

export const UnitScore = styled.button`
    min-width: 55px;
    border: none;
    background: none;
    padding: 0;
    text-align: right;
    color: #111827;
    font: inherit;
    font-weight: 700;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }

    @media (max-width: 700px) {
        min-width: 42px;
    }
`;

export const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;

    @media (max-width: 700px) {
        padding: 12px;
    }
`;

export const ModalCard = styled.div`
    width: min(600px, 100%);
    max-height: 80vh;
    overflow-y: auto;
    background: #ffffff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);

    @media (max-width: 700px) {
        padding: 16px;
        max-height: 86vh;
        border-radius: 14px;
    }
`;

export const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
`;

export const ModalTitle = styled.div`
    flex: 1;

    h2 {
        margin: 0;
    }

    p {
        margin: 4px 0 0;
        color: #6b7280;
    }
`;

export const CloseButton = styled.button`
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    background: #f3f4f6;
    color: #374151;
    font-weight: 700;
    cursor: pointer;

    &:hover {
        background: #e5e7eb;
    }
`;

export const ByeText = styled.span`
    color: #dc2626;
    font-weight: 700;
`;

export const WeekNavigator = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 12px 0 20px;
`;

export const WeekArrow = styled.button`
    border: 1px solid #d1d5db;
    background: #ffffff;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: #f3f4f6;
    }

    &:disabled {
        opacity: 0.35;
        cursor: default;
    }
`;

export const WeekLabel = styled.strong`
    min-width: 70px;
    text-align: center;
    color: #111827;
`;

export const TeamHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 20px;

    h1 {
        margin: 0;
    }
`;

export const TeamRecord = styled.div`
    font-size: 1.1rem;
    font-weight: 700;
    color: #374151;
    white-space: nowrap;
`;

export const RosterActionButton = styled.button`
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 600;
    cursor: pointer;

    @media (max-width: 700px) {
        grid-column: 2 / 4;
        width: 100%;
        margin-top: 4px;
    }
`;