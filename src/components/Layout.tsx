import { Outlet } from "react-router-dom";
import Nav from "./Nav";
import { Page, MainContent } from '../styles/commonstyles'

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