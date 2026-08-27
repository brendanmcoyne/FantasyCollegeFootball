import { Outlet } from "react-router-dom";
import Nav from "./Nav";
import { Page, Content } from '../styles/commonstyles'

export default function Layout() {
    return (
        <>
            <Nav />

            <main>
                <Page>
                    <Content>
                        <Outlet />
                    </Content>
                </Page>
            </main>
        </>
    );
}