import { Outlet } from "react-router-dom";
import Nav from "./Nav";
import { Page, Content } from '../styles/commonstyles'
import { styled } from 'styled-components'

const MainContent = styled.main`
    width: min(1200px, 100%);
    margin: 0 auto;
    padding: 24px;
    box-sizing: border-box;

    @media (max-width: 700px) {
        padding: 8px 4px;
    }
`;

export default function Layout() {
    return (
        <>
            <Nav />

            <main>
                <Page>
                    <MainContent>
                        <Outlet />
                    </MainContent>
                </Page>
            </main>
        </>
    );
}