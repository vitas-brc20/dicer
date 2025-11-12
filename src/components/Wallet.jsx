"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import ProtonWebSDK from '@proton/web-sdk'; // Use the default import as a function

const WalletContext = createContext({
    session: null,
    link: null, // Need to store link for logout
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => { throw new Error("Wallet not connected"); }
});

export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [link, setLink] = useState(null); // Store link for logout

    // Effect for session restoration using ProtonWebSDK's internal mechanism
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const { session: restoredSession, link: restoredLink } = await ProtonWebSDK({
                    linkOptions: { endpoints: ['https://proton.greymass.com'] },
                    restoreSession: true, // Rely on SDK to restore session
                });

                if (restoredSession) {
                    setSession(restoredSession);
                    setLink(restoredLink);
                    console.log("ProtonWebSDK restoredSession:", restoredSession); // Debug log
                    console.log("ProtonWebSDK restoredLink:", restoredLink); // Debug log
                } else {
                    console.log("ProtonWebSDK could not restore session.");
                    setSession(null);
                    setLink(null);
                }
            } catch (e) {
                console.error("Session restoration failed:", e);
                setSession(null);
                setLink(null);
            }
        };
        restoreSession();
    }, []); // Run once on mount

    const login = async () => {
        try {
            const { session: newSession, link: newLink } = await ProtonWebSDK({
                linkOptions: { endpoints: ['https://proton.greymass.com'] },
                transportOptions: { requestStatus: false },
                selectorOptions: {
                    appName: '11dice',
                    appLogo: 'https://avatars.githubusercontent.com/u/6749354?s=200&v=4',
                    requestAccount: 'inchgame',
                },
            });
            setSession(newSession);
            setLink(newLink);
            console.log("New session after login:", newSession); // Debug log
        } catch (e) {
            console.error("Login failed", e);
        }
    };

    const logout = async () => {
        if (link && session) {
            try {
                await link.removeSession('11dice', session.auth, session.chainId);
                setSession(null);
                setLink(null);
            } catch (e) {
                console.error("Logout failed", e);
            }
        }
    };

    const transact = async (actions) => {
        if (!session) {
            throw new Error("Cannot transact without a session");
        }
        try {
            const result = await session.transact({ actions });
            return result;
        } catch (e) {
            console.error("Transaction failed", e);
            throw e;
        }
    };

    return (
        <WalletContext.Provider value={{ session, link, login, logout, transact }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
