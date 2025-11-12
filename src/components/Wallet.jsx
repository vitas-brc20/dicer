"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const WalletContext = createContext({
    session: null,
    link: null,
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => { throw new Error("Wallet not connected"); }
});

export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [link, setLink] = useState(null);

    // Effect for session restoration
    useEffect(() => {
        const restore = async () => {
            try {
                const { ConnectWallet } = await import('@proton/web-sdk');
                const { link: restoredLink, session: restoredSession } = await ConnectWallet({
                    linkOptions: {
                        endpoints: ['https://proton.greymass.com'],
                        restoreSession: true,
                    },
                    selectorOptions: {
                        appName: '11dice',
                        requestAccount: '11dice',
                    }
                });

                if (restoredSession) {
                    setSession(restoredSession);
                    setLink(restoredLink);
                }
            } catch (e) {
                console.error("Session restore failed", e);
            }
        };
        restore();
    }, []);

    const login = async () => {
        try {
            const { ConnectWallet } = await import('@proton/web-sdk');
            const { link: newLink, session: newSession } = await ConnectWallet({
                linkOptions: {
                    endpoints: ['https://proton.greymass.com'],
                },
                selectorOptions: {
                    appName: '11dice',
                    requestAccount: '11dice',
                }
            });
            setSession(newSession);
            setLink(newLink);
        } catch (e) {
            console.error("Login failed", e);
        }
    };

    const logout = async () => {
        if (link && session) {
            try {
                await link.removeSession('11dice', session.auth);
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
            return await session.transact({ actions });
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